import db from "../models/index.js";
import logger from "../utils/logger.js";
import SolicitudRepository from "../repositories/solicitudRepository.js";

import { EstadoSolicitudHandler } from "../domain/estado/estadoHandler.js";

/**
 * Revisión automática (HU-04) usando SolicitudRepository + State + Facade.
 * - Cambia estado: PENDIENTE → APROBADA/RECHAZADA según fraude policial.
 * - Persiste resultados en resultados_bd_externas (JSONB) con Sequelize (sin queries crudas).
 * - Registra una fila en resultado_validacion.
 *
 * @param {string} solicitudId
 * @param {{ fachada: { consultarBases(pacienteId:string): Promise<any> }, userId?: string }} ctx
 */
export const revisarSolicitudAutomaticamente = async (solicitudId, { fachada, userId } = {}) => {
    if (!fachada || typeof fachada.consultarBases !== "function") {
        const e = new Error("Fachada inválida: se requiere consultarBases(pacienteId).");
        e.status = 500;
        throw e;
    }

    const { SolicitudRegistro, ResultadoValidacion, sequelize } = db;
    const repository = new SolicitudRepository();

    // 1) Leer solicitud vía repository (tu convención)
    const solicitudInst = await repository.obtenerSolicitudPorId(solicitudId);
    if (!solicitudInst) {
        const e = new Error("Solicitud no encontrada.");
        e.status = 404;
        throw e;
    }
    if (solicitudInst.estado !== "PENDIENTE") {
        const e = new Error(`La solicitud ya fue ${solicitudInst.estado.toLowerCase()}.`);
        e.status = 400;
        throw e;
    }

    // 2) Repo mínimo para StateHandler (solo ORM Sequelize)
    const repoForHandler = {
        actualizarEstado: async (id, nuevoEstado, meta = {}) => {
            return sequelize.transaction(async (t) => {
                const inst = await SolicitudRegistro.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
                if (!inst) throw new Error("Solicitud no encontrada para actualización");

                const actual = inst.get("resultados_bd_externas") || {};
                const merged = { ...actual, ...meta };

                const patch = {
                    estado: nuevoEstado,
                    resultados_bd_externas: merged,
                    fecha_actualizacion: new Date()
                };

                if (["APROBADA", "RECHAZADA"].includes(nuevoEstado)) {
                    patch.fecha_validacion = new Date();
                    if (userId) patch.revisado_por = userId;
                }
                if (nuevoEstado === "RECHAZADA" && meta?.motivo) {
                    patch.motivo_decision = meta.motivo;
                }

                inst.set(patch);
                await inst.save({ transaction: t });
                return inst.toJSON();
            });
        },

        guardarResultadoConsultas: async (id, resultado) => {
            return sequelize.transaction(async (t) => {
                const inst = await SolicitudRegistro.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
                if (!inst) throw new Error("Solicitud no encontrada para guardar resultado");

                const actual = inst.get("resultados_bd_externas") || {};
                const merged = { ...actual, consultas: resultado };

                inst.set({ resultados_bd_externas: merged, fecha_actualizacion: new Date() });
                await inst.save({ transaction: t });
                return inst.toJSON();
            });
        }
    };

    // 3) Ejecutar lógica de estados con Facade (decide APROBADA/RECHAZADA)
    const handler = new EstadoSolicitudHandler({
        solicitud: solicitudInst.toJSON(), // POJO
        repo: repoForHandler,
        fachada
    });

    try {
        const salida = await handler.revisar();

        // 4) Registrar resultado en resultado_validacion (consolidado)
        const hayFraude = !!salida?.resultado?.policia?.tieneFraude;
        await ResultadoValidacion.create({
            solicitud_id: solicitudInst.id,
            tipo_validacion: "BASES_EXTERNAS",
            resultado: !hayFraude, // true: sin fraude; false: con fraude
            detalles: salida.resultado || {},
            motivo_rechazo: hayFraude ? "Fraude médico detectado" : null,
            validado_por: userId ?? null,
            fecha_validacion: new Date()
        }).catch((err) => {
            logger?.warn?.(`No se pudo registrar resultado_validacion: ${err.message}`);
        });

        // 5) Guardar consolidado para el Director Médico
        await repoForHandler.guardarResultadoConsultas(solicitudInst.id, salida);

        logger?.info?.(`Solicitud ${solicitudInst.id} revisada automáticamente -> ${salida.estado}`);
        return salida;

    } catch (err) {
        // HU-04: si falla, mantener PENDIENTE y permitir manual
        await repoForHandler.guardarResultadoConsultas(solicitudInst.id, { error: err.message });
        logger?.error?.(`Fallo revisión automática de solicitud ${solicitudInst.id}: ${err.message}`);

        return {
            estado: solicitudInst.estado, // PENDIENTE
            error: "Fallo la consulta automática. Puede intentar manualmente.",
            detalle: err.message
        };
    }
};
import db from "../models/index.js";
import logger from "../utils/logger.js";
import SolicitudRepository from "../repositories/solicitudRepository.js";
import { EstadoSolicitudHandler } from "../domain/estado/estadoHandler.js";

/**
 * HU-04: revisión automática
 * - Si alguna consulta externa falla => permanece PENDIENTE y se guardan SOLO errores
 * - Si éxito => APROBADA o RECHAZADA y se guarda SOLO resultado (sin duplicar)
 */
export const revisarSolicitudAutomaticamente = async (solicitudId, { fachada, userId } = {}) => {
    if (!fachada || typeof fachada.consultarBases !== "function") {
        const e = new Error("Fachada inválida: se requiere consultarBases(pacienteId).");
        e.status = 500;
        throw e;
    }

    const { SolicitudRegistro, ResultadoValidacion, sequelize } = db;
    const repository = new SolicitudRepository();

    // 1) Obtener solicitud (tu repo)
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

    const identidad = {
        numeroIdentificacion: solicitudInst.paciente?.numero_identificacion
    };
    if (!identidad.numeroIdentificacion) {
        const e = new Error("El paciente no tiene numero_identificacion; no se puede consultar bases externas.");
        e.status = 400;
        throw e;
    }

    // 2) Repo para el handler (TODO ORM, sin queries crudas)
    const repoForHandler = {
        
        actualizarEstado: async (id, nuevoEstado, meta = {}) => {
            return sequelize.transaction(async (t) => {
                const inst = await SolicitudRegistro.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
                if (!inst) throw new Error("Solicitud no encontrada para actualización");

                const patch = {
                    estado: nuevoEstado,
                    fecha_actualizacion: new Date()
                };

                // Estados terminales → fechas/revisor
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

        guardarResultadoExitoso: async (id, resultado) => {
            return sequelize.transaction(async (t) => {
                const inst = await SolicitudRegistro.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
                if (!inst) throw new Error("Solicitud no encontrada para guardar resultado");
                inst.set({
                    resultados_bd_externas: { resultado },
                    fecha_actualizacion: new Date()
                });
                await inst.save({ transaction: t });
                return inst.toJSON();
            });
        },

        
        guardarErroresExternos: async (id, errores) => {
            return sequelize.transaction(async (t) => {
                const inst = await SolicitudRegistro.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
                if (!inst) throw new Error("Solicitud no encontrada para guardar errores");
                inst.set({
                    resultados_bd_externas: { errores },
                    fecha_actualizacion: new Date()
                });
                await inst.save({ transaction: t });
                return inst.toJSON();
            });
        }
    };

    // 3) Ejecutar máquina de estados con Facade
    const handler = new EstadoSolicitudHandler({
        solicitud: solicitudInst.toJSON(),
        identidad,
        repo: repoForHandler,
        fachada
    });

    try {
        const salida = await handler.revisar();

        // Caso A) Alguna base falló → estado PENDIENTE con errores
        if (salida.estado === "PENDIENTE" && salida.errores) {
            await repoForHandler.guardarErroresExternos(solicitudInst.id, salida.errores);

            logger?.info?.(`Solicitud ${solicitudInst.id}: consultas externas fallidas (permite revisión manual).`);
            return {
                estado: "PENDIENTE",
                errores: salida.errores
            };
        }

        // Caso B) Éxito → APROBADA/RECHAZADA
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

        await repoForHandler.guardarResultadoExitoso(solicitudInst.id, salida.resultado);

        logger?.info?.(`Solicitud ${solicitudInst.id} revisada -> ${salida.estado}`);
        return salida;

    } catch (err) {
        // Falla no controlada → mantener PENDIENTE y guardar error
        await repoForHandler.guardarErroresExternos(solicitudInst.id, { general: err.message });
        logger?.error?.(`Fallo revisión automática de solicitud ${solicitudInst.id}: ${err.message}`);

        return {
            estado: "PENDIENTE",
            error: "Fallo la consulta automática. Puede intentar manualmente.",
            detalle: err.message
        };
    }
};
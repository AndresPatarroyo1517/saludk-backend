import {
    revisarSolicitudAutomaticamente, listarSolicitudesAprobadasDirector,
    listarSolicitudesPendientesConErroresDirector, aprobarPorDirector,
    rechazarPorDirector, devolverPorDirector
} from "../services/validacionService.js";
import { FacadeBasesExternas } from "../infra/fachada/fachadaBasesExternas.js";
import { AdaptadorBDNN } from "../infra/adapters/adaptadorBDNN.js";
import { AdaptadorPolicia } from "../infra/adapters/adaptadorPolicia.js";
import { AdaptadorBDNNMock, AdaptadorPoliciaMock } from "../infra/adapters/adaptadores.mock.js";
/**
 * Facade + Adapters (mismo contrato en ambos: consultarPaciente => { antecedentes: [] }).
 * La Facade deriva policia.tieneFraude a partir de antecedentes.
 */

const USE_MOCKS = String(process.env.USE_MOCKS || 'false').toLowerCase() === 'true';

// Selección de adapters según env (cero cambios en el resto del flujo)
const adaptadorClinico = USE_MOCKS
    ? new AdaptadorBDNNMock()
    : new AdaptadorBDNN({ baseUrl: process.env.EXTERNAL_API_BD_NACIONAL });

const adaptadorPolicia = USE_MOCKS
    ? new AdaptadorPoliciaMock()
    : new AdaptadorPolicia({ baseUrl: process.env.EXTERNAL_API_ANTECEDENTES });


const fachada = new FacadeBasesExternas({
    adaptadorClinico,
    adaptadorPolicia,
    // Opcional: palabras clave para considerar "fraude" al derivar desde antecedentes
    fraudeKeywords: ['fraude', 'estafa', 'falsificación']
});

export const revisar = async (req, res, next) => {
    try {
        const { id } = req.params;   // id de solicitud_registro
        const userId = req.user?.id; // si tienes auth
        const salida = await revisarSolicitudAutomaticamente(id, { fachada, userId });
        res.status(200).json(salida);
    } catch (err) {
        next(err);
    }
};


export const listarAprobadas = async (_req, res, next) => {
    try {
        const data = await listarSolicitudesAprobadasDirector();
        res.status(200).json(data);
    } catch (err) { next(err); }
};

export const listarPendientesConErrores = async (_req, res, next) => {
    try {
        const data = await listarSolicitudesPendientesConErroresDirector();
        res.status(200).json(data);
    } catch (err) { next(err); }
};

export const aprobarDirector = async (req, res, next) => {
    try {
        const { id } = req.params;
        const motivo_decision = req.body?.motivo_decision;      // 3) libre y opcional
        const revisadoPor = req.user?.id ?? null;
        const result = await aprobarPorDirector({ solicitudId: id, revisadoPor, motivo_decision });
        res.status(200).json(result);
    } catch (err) { next(err); }
};

export const rechazarDirector = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { motivo_decision } = req.body || {};
        if (!motivo_decision) {
            const e = new Error('El motivo es obligatorio para RECHAZAR');
            e.status = 400; throw e;
        }
        const revisadoPor = req.user?.id ?? null;
        const result = await rechazarPorDirector({ solicitudId: id, revisadoPor, motivo_decision });
        res.status(200).json(result);
    } catch (err) { next(err); }
};

export const devolverDirector = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { motivo_decision } = req.body || {};
        if (!motivo_decision) {
            const e = new Error('El motivo es obligatorio para DEVOLVER');
            e.status = 400; throw e;
        }
        const revisadoPor = req.user?.id ?? null;
        const result = await devolverPorDirector({ solicitudId: id, revisadoPor, motivo_decision });
        res.status(200).json(result);
    } catch (err) { next(err); }
};

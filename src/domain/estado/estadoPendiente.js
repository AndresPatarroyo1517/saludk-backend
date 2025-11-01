import { EstadoSolicitud } from './estadoSolicitud.js';

export class EstadoPendiente extends EstadoSolicitud {
    constructor() { super('PENDIENTE'); }

    async revisar(contexto) {
        const { identidad, fachada, handler } = contexto;

        // 1) Consultar ambas fuentes
        const resultado = await fachada.consultarBases(identidad);

        const clinicoError = !!resultado?.clinico?.error;
        const policiaError = !!resultado?.policia?.error;

        // 2) Si hay cualquier error, NO transicionamos y devolvemos errores
        if (clinicoError || policiaError) {
            const errores = {
                ...(clinicoError ? { clinico: resultado.clinico } : {}),
                ...(policiaError ? { policia: resultado.policia } : {})
            };
            return { estado: 'PENDIENTE', errores };
        }

        // 3) Sin errores: regla de fraude
        if (resultado?.policia?.tieneFraude === true) {
            await handler.cambiarEstado('RECHAZADA', {
                motivo: 'Fraude médico detectado'
            });
            return { estado: 'RECHAZADA', resultado };
        }

        // 4) Sin fraude => APROBADA
        await handler.cambiarEstado('APROBADA');
        return { estado: 'APROBADA', resultado };
    }
}
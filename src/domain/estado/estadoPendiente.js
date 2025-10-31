import { EstadoSolicitud } from './estadoSolicitud.js';

export class EstadoPendiente extends EstadoSolicitud {
    constructor() { super('PENDIENTE'); }

    async revisar(contexto) {
        const { solicitud, fachada, handler } = contexto;

        // 1) Consulta unificada a fuentes externas
        const resultado = await fachada.consultarBases(solicitud.paciente_id);

        // 2) Regla principal: fraude en Policía => RECHAZADA
        if (resultado?.policia?.tieneFraude === true) {
            await handler.cambiarEstado('RECHAZADA', {
                motivo: 'Fraude médico detectado',
                detalles: resultado.policia.registros || []
            });
            return { estado: 'RECHAZADA', resultado };
        }

        // 3) Caso contrario => APROBADA
        await handler.cambiarEstado('APROBADA', { resultado });
        return { estado: 'APROBADA', resultado };
    }
}
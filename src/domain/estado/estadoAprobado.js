import { EstadoSolicitud } from './estadoSolicitud.js';

export class EstadoAprobada extends EstadoSolicitud {
    constructor() { super('APROBADA'); }
    puedeRevisar() { return false; }
    async revisar() {
        throw new Error('La solicitud ya está APROBADA. No se puede volver a revisar.');
    }
}
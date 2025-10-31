import { EstadoSolicitud } from './estadoSolicitud.js';

export class EstadoRechazada extends EstadoSolicitud {
    constructor() { super('RECHAZADA'); }
    puedeRevisar() { return false; }
    async revisar() {
        throw new Error('La solicitud está RECHAZADA. No se puede volver a revisar.');
    }
}
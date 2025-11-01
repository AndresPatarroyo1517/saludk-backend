import { EstadoPendiente } from './estadoPendiente.js';
import { EstadoAprobada } from './estadoAprobado.js';
import { EstadoRechazada } from './estadoRechazado.js';

const mapEstados = {
    PENDIENTE: () => new EstadoPendiente(),
    APROBADA: () => new EstadoAprobada(),
    RECHAZADA: () => new EstadoRechazada()
};

/**
 * Orquesta el estado actual y las transiciones,
 * delegando a las clases de estado concreto.
 */
export class EstadoSolicitudHandler {

    constructor({ solicitud, identidad, repo, fachada }) {
        this.solicitud = solicitud;
        this.identidad = identidad;
        this.repo = repo;
        this.fachada = fachada;
        this.estado = this.#instanciar(solicitud.estado);
    }

    #instanciar(nombre) {
        const factory = mapEstados[nombre];
        if (!factory) throw new Error(`Estado desconocido: ${nombre}`);
        return factory();
    }

    async cambiarEstado(nuevoEstado, meta = {}) {
        await this.repo.actualizarEstado(this.solicitud.id, nuevoEstado, meta);
        this.solicitud.estado = nuevoEstado;
        this.estado = this.#instanciar(nuevoEstado);
    }

    async revisar() {
        if (!this.estado.puedeRevisar()) {
            throw new Error(`No se puede revisar en estado ${this.solicitud.estado}`);
        }
        return this.estado.revisar({
            solicitud: this.solicitud,
            identidad: this.identidad,
            fachada: this.fachada,
            handler: this
        });
    }
}
``
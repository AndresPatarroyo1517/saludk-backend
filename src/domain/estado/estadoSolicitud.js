// Estado base (abstracto)
export class EstadoSolicitud {
    constructor(nombre) {
        if (new.target === EstadoSolicitud) {
            throw new TypeError('EstadoSolicitud es abstracta: no puede instanciarse directamente.');
        }
        this.nombre = nombre;
    }

    // Determina si en este estado se permite "revisar"
    puedeRevisar() { return true; }

    /**
     * Ejecuta la revisión (consulta a fuentes externas y decide transición).
     * Debe ser implementado por estados concretos.
     * @param {{ solicitud: any, fachada: any, handler: any }} _contexto
     */
    async revisar(_contexto) {
        throw new Error('Método abstracto revisar(contexto) no implementado.');
    }
}
/**
 * Interfaz (protocolo) para adaptadores de bases clínicas externas.
 * Implementaciones deben devolver un objeto normalizado:
 * { antecedentes: Array<any> }
 */
export class AdaptadorBDExterna {
    constructor() {
        if (new.target === AdaptadorBDExterna) {
            throw new TypeError('AdaptadorBDExterna es abstracta: no puede instanciarse directamente.');
        }
    }

    /**
     * Debe retornar { antecedentes: [...] }
     * @param {string} pacienteId
     * @returns {Promise<{antecedentes: any[]}>}
     */
    async consultarPaciente(_pacienteId) {
        throw new Error('consultarPaciente no implementado');
    }
}
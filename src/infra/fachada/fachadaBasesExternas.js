/**
 * Facade que unifica:
 * - Base clínica (AdaptadorBDExterna)
 * - Policía (usa también AdaptadorBDExterna)
 *
 * Normaliza la respuesta policial a { tieneFraude, registros } a partir de "antecedentes".
 */
export class FacadeBasesExternas {
    /**
     * @param {{
     *  adaptadorClinico: { consultarPaciente(pacienteId:string): Promise<{antecedentes:any[]}> },
     *  adaptadorPolicia: { consultarPaciente(pacienteId:string): Promise<{antecedentes:any[]}> },
     *  fraudeKeywords?: string[]
     * }} deps
     */
    constructor({ adaptadorClinico, adaptadorPolicia, fraudeKeywords } = {}) {
        this.adaptadorClinico = adaptadorClinico;
        this.adaptadorPolicia = adaptadorPolicia;
        this.fraudeKeywords = Array.isArray(fraudeKeywords) && fraudeKeywords.length
            ? fraudeKeywords.map(k => String(k).toLowerCase())
            : ['fraude', 'estafa', 'falsificación', 'corrupción'];
    }

    #fraudeDesdeAntecedentes(antecedentes) {
        const registros = Array.isArray(antecedentes) ? antecedentes : [];
        const tieneFraude = registros.some((r) => {
            const texto = [
                r?.tipo,
                r?.descripcion,
                r?.categoria,
                r?.detalle,
                r?.delito
            ].filter(Boolean).join(' ').toLowerCase();
            return this.fraudeKeywords.some(kw => texto.includes(kw));
        });
        return { tieneFraude, registros };
    }

    async consultarBases(identidad) {
        const [clinicoRes, policiaRes] = await Promise.allSettled([
            this.adaptadorClinico.consultarPaciente(identidad),
            this.adaptadorPolicia.consultarPaciente(identidad)
        ]);

        const clinico = clinicoRes.status === 'fulfilled'
            ? clinicoRes.value
            : { error: clinicoRes.reason?.message || 'Fallo consulta clínica' };

        const policia = policiaRes.status === 'fulfilled'
            ? this.#fraudeDesdeAntecedentes(policiaRes.value?.antecedentes)
            : { error: policiaRes.reason?.message || 'Fallo consulta policía' };

        return { clinico, policia };
    }
}
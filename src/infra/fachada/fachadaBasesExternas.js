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

    #derivarFraudeDesdeAntecedentes(antecedentes) {
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

    async consultarBases(pacienteId) {
        const [clinicoRes, policiaRes] = await Promise.allSettled([
            this.adaptadorClinico.consultarPaciente(pacienteId),
            this.adaptadorPolicia.consultarPaciente(pacienteId)
        ]);

        const clinico = clinicoRes.status === 'fulfilled'
            ? clinicoRes.value
            : { error: clinicoRes.reason?.message || 'Fallo consulta clínica' };

        let policia;
        if (policiaRes.status === 'fulfilled') {
            // policiaRes.value = { antecedentes: [...] }
            policia = this.#derivarFraudeDesdeAntecedentes(policiaRes.value?.antecedentes);
        } else {
            policia = { error: policiaRes.reason?.message || 'Fallo consulta policía' };
        }

        return { clinico, policia };
    }
}
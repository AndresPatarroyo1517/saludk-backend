import { AdaptadorBDExterna } from './adaptadorBDExterna.js';

/**
 * Adaptador para BD Nacional (clínica).
 * Normaliza a { antecedentes: [...] }
 */
export class AdaptadorBDNN extends AdaptadorBDExterna {
    /**
     * @param {{ baseUrl: string, token?: string }} opts
     */
    constructor({ baseUrl, token }) {
        super();
        if (!baseUrl) throw new Error('baseUrl es requerido para AdaptadorBDNN');
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.token = token;
    }


    async consultarPaciente(identidad) {
        const doc = identidad?.numeroIdentificacion;
        if (!doc) throw new Error('Falta numeroIdentificacion para BDNN');

        const url = `${this.baseUrl}/pacientes/${encodeURIComponent(doc)}/antecedentes`;

        const res = await fetch(url, {
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined
        });
        if (!res.ok) throw new Error(`BDNN ${res.status}: ${await res.text().catch(() => '')}`);

        const data = await res.json().catch(() => ({}));
        const items = Array.isArray(data.items) ? data.items : [];
        return { antecedentes: items };
    }

}
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

    async consultarPaciente(pacienteId) {
        if (!pacienteId) throw new Error('pacienteId es requerido');

        const url = `${this.baseUrl}/pacientes/${encodeURIComponent(pacienteId)}/antecedentes`;
        const res = await fetch(url, {
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`BDNN ${res.status}: ${text || res.statusText}`);
        }

        const data = await res.json().catch(() => ({}));
        const items = Array.isArray(data.items) ? data.items : [];

        return { antecedentes: items };
    }
}
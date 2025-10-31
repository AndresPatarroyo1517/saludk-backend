import { AdaptadorBDExterna } from './adaptadorBDExterna.js';

/**
 * AdaptadorPolicia – Implementación concreta
 * (usa la MISMA interfaz AdaptadorBDExterna y retorna { antecedentes: [...] }).
 */
export class AdaptadorPolicia extends AdaptadorBDExterna {
    /**
     * @param {{ baseUrl: string, token?: string }} cfg
     */
    constructor({ baseUrl, token } = {}) {
        super();
        if (!baseUrl) throw new Error('baseUrl es requerido para AdaptadorPolicia');
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.token = token;
    }

    /**
     * Espera que la API de antecedentes retorne algo como:
     * { registros: [...] } o { items: [...] }
     * Se normaliza a { antecedentes: [...] } para cumplir el protocolo.
     */
    async consultarPaciente(pacienteId) {
        if (!pacienteId) throw new Error('pacienteId es requerido');

        const url = `${this.baseUrl}/antecedentes/${encodeURIComponent(pacienteId)}`;
        const res = await fetch(url, {
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Policía ${res.status}: ${text || res.statusText}`);
        }

        const data = await res.json().catch(() => ({}));
        const antecedentes =
            Array.isArray(data.registros) ? data.registros :
                Array.isArray(data.items) ? data.items :
                    [];

        return { antecedentes };
    }
}
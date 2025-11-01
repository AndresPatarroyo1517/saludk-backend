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
    async consultarPaciente(identidad) {
        const doc = identidad?.numeroIdentificacion;
        if (!doc) throw new Error('Falta numeroIdentificacion para consulta policial');

        const url = `${this.baseUrl}/antecedentes/${encodeURIComponent(doc)}`;

        const res = await fetch(url, {
            headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined
        });
        if (!res.ok) throw new Error(`Policía ${res.status}: ${await res.text().catch(() => '')}`);

        const data = await res.json().catch(() => ({}));
        const antecedentes =
            Array.isArray(data.registros) ? data.registros :
                Array.isArray(data.items) ? data.items : [];
        return { antecedentes };
    }

}
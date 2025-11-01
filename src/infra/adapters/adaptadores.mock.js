// src/infra/adapters/adaptadores.mock.js
import logger from '../../utils/logger.js';

/**
 * Escenarios soportados via env MOCK_SCENARIO:
 * - 'ok'        => clínico OK, policía sin fraude
 * - 'fraude'    => clínico OK, policía detecta fraude
 * - 'fail_one'  => clínico falla, policía OK
 * - 'fail_all'  => clínico falla, policía falla
 *
 * Si necesitas por documento, puedes condicionar por identidad.numeroIdentificacion.
 */

function getScenario() {
    return (process.env.MOCK_SCENARIO || 'ok').toLowerCase();
}

export class AdaptadorBDNNMock {
    async consultarPaciente(identidad, { correlationId } = {}) {
        const scenario = getScenario();

        // Simular fallo clínico en ciertos escenarios
        if (scenario === 'fail_one' || scenario === 'fail_all') {
            const error = new Error('fetch failed (clinico)');
            logger.warn({ msg: 'Mock BDNN: FAIL', scope: 'Mock.BDNN', doc: identidad?.numeroIdentificacion, correlationId, error: error.message });
            throw error; // La Facade lo convertirá a { error: '...' }
        }

        // Resultado OK clínico (sin relevancia para fraude)
        const antecedentes = [
            { tipo: 'consulta', descripcion: 'historial clínico normal', doc: identidad?.numeroIdentificacion }
        ];

        logger.debug({ msg: 'Mock BDNN: OK', scope: 'Mock.BDNN', count: antecedentes.length, doc: identidad?.numeroIdentificacion, correlationId });
        return { antecedentes };
    }
}

export class AdaptadorPoliciaMock {
    async consultarPaciente(identidad, { correlationId } = {}) {
        const scenario = getScenario();

        if (scenario === 'fail_all') {
            const error = new Error('fetch failed (policia)');
            logger.warn({ msg: 'Mock Policía: FAIL', scope: 'Mock.Policia', doc: identidad?.numeroIdentificacion, correlationId, error: error.message });
            throw error;
        }

        // Simular fraude o no fraude
        const antecedentes =
            scenario === 'fraude'
                ? [{ tipo: 'fraude', descripcion: 'Fraude a aseguradora', doc: identidad?.numeroIdentificacion }]
                : [{ tipo: 'consulta', descripcion: 'sin registros graves', doc: identidad?.numeroIdentificacion }];

        logger.debug({ msg: 'Mock Policía: OK', scope: 'Mock.Policia', count: antecedentes.length, fraude: scenario === 'fraude', doc: identidad?.numeroIdentificacion, correlationId });
        return { antecedentes };
    }
}


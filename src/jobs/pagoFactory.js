import { ProcesadorPasarela } from './factoryPagos/procesadorPasarela.js';
import { ProcesadorTarjeta } from './factoryPagos/procesadorTarjeta.js';
import { ProcesadorConsignacion } from './factoryPagos/procesadorConsignacion.js';

/**
 * Factory para crear procesadores de pago según el método seleccionado
 * Patrón Factory - Separa la creación de objetos de su implementación
 * 
 * @param {string} tipo - Tipo de procesador: TARJETA, PASARELA, CONSIGNACION
 * @returns {ProcesadorPago} Instancia del procesador correspondiente
 */
export const crearProcesadorPago = (tipo) => {
  switch (tipo?.toUpperCase()) {
    case 'TARJETA':
    case 'TARJETA_CREDITO':
    case 'TARJETA_DEBITO':
      return new ProcesadorTarjeta();
    
    case 'PASARELA':
    case 'PSE':
      return new ProcesadorPasarela();
    
    case 'CONSIGNACION':
    case 'TRANSFERENCIA':
      return new ProcesadorConsignacion();
    
    default:
      throw new Error(`Método de pago no soportado: ${tipo}`);
  }
};

export default { crearProcesadorPago };
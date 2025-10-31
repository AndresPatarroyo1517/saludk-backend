import { ProcesadorPasarela } from './factoryPagos/ProcesadorPasarela.js';
import { ProcesadorTarjeta } from './factoryPagos/ProcesadorTarjeta.js';
import { ProcesadorConsignacion } from './factoryPagos/ProcesadorConsignacion.js';

export const crearProcesadorPago = (tipo) => {
  switch (tipo?.toUpperCase()) {
    case 'TARJETA':
      return new ProcesadorTarjeta();
    case 'CONSIGNACION':
      return new ProcesadorConsignacion();
    default:
      return new ProcesadorPasarela(); // Por defecto, PASARELA (PSE)
  }
};

export default { crearProcesadorPago };

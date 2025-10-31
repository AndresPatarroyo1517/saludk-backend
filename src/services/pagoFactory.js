import { ProcesadorPasarela } from './procesadores/procesadorPasarela.js';
import { ProcesadorTarjeta } from './procesadores/procesadorTarjeta.js';
import { ProcesadorConsignacion } from './procesadores/procesadorConsignacion.js';

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

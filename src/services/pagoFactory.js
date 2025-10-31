const { ProcesadorPasarela } = require('./procesadores/procesadorPasarela');
const { ProcesadorTarjeta } = require('./procesadores/procesadorTarjeta');
const { ProcesadorConsignacion } = require('./procesadores/procesadorConsignacion');

exports.crearProcesadorPago = (tipo) => {
  switch (tipo?.toUpperCase()) {
    case 'TARJETA':
      return new ProcesadorTarjeta();
    case 'CONSIGNACION':
      return new ProcesadorConsignacion();
    default:
      return new ProcesadorPasarela(); // Por defecto, PASARELA (PSE)
  }
};

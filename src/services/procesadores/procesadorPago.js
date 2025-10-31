class ProcesadorPago {
  async procesarTransaccion() {
    throw new Error('Método procesarTransaccion() debe implementarse en la subclase.');
  }
}

module.exports = { ProcesadorPago };

export class ProcesadorPago {
  async procesarTransaccion(datos) {
    throw new Error('Método procesarTransaccion() debe implementarse en la subclase.');
  }

  async confirmarPago(ordenId, datosConfirmacion) {
    throw new Error('Método confirmarPago() debe implementarse en la subclase.');
  }

  async cancelarPago(ordenId) {
    throw new Error('Método cancelarPago() debe implementarse en la subclase.');
  }
}
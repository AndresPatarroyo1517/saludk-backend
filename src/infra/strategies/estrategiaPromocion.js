class EstrategiaPromocion {
  async ejecutar(context) {
    throw new Error('Método ejecutar debe ser implementado por la estrategia');
  }
}

export default EstrategiaPromocion;

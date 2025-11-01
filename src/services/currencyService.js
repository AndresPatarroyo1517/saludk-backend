import logger from '../utils/logger.js';

/**
 * Servicio simple de conversión COP → USD
 * Para proyecto académico con Stripe USA
 */
class CurrencyService {
  constructor() {
    // Tasa promedio 2025: 1 USD ≈ 4,200 COP
    // Puedes ajustar según necesites
    this.USD_TO_COP = 4200;
  }

  /**
   * Convierte COP a USD
   * @param {number} montoCOP - Monto en pesos colombianos
   * @returns {number} Monto en dólares
   */
  convertirCOPaUSD(montoCOP) {
    if (!montoCOP || montoCOP <= 0) {
      throw new Error('El monto en COP debe ser mayor a 0');
    }

    // Conversión simple
    const montoUSD = montoCOP / this.USD_TO_COP;
    
    // Redondear a 2 decimales
    const montoRedondeado = Math.round(montoUSD * 100) / 100;

    logger.info(`💱 ${montoCOP} COP → $${montoRedondeado} USD`);

    // Validar mínimo de Stripe ($0.50 USD)
    if (montoRedondeado < 0.50) {
      const minimoCOP = Math.ceil(0.50 * this.USD_TO_COP);
      throw new Error(
        `Monto demasiado bajo. Mínimo: ${minimoCOP} COP ($0.50 USD)`
      );
    }

    return montoRedondeado;
  }

  /**
   * Convierte USD a COP (para referencia)
   */
  convertirUSDaCOP(montoUSD) {
    return Math.round(montoUSD * this.USD_TO_COP);
  }
}

export default new CurrencyService();
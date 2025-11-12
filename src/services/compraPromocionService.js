import db from '../models/index.js';
import promocionRepository from '../repositories/promocionRepository.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

class CompraPromocionService {
  /**
   * Aplica un código de promoción a una compra
   * @param {string} codigoPromocion - código de promoción
   * @param {string} pacienteId - ID del paciente
   * @param {number} montoOriginal - monto sin descuento
   * @returns {Object} { valida, descuentoAplicado, montoFinal, promocion, error }
   */
  async aplicarCodigoPromocion(codigoPromocion, pacienteId, montoOriginal) {
    try {
      const resultado = await promocionRepository.validarYAplicarDescuento(
        codigoPromocion,
        pacienteId,
        montoOriginal
      );

      if (!resultado.valida) {
        return { valida: false, error: resultado.error };
      }

      // Incrementar uso
      await promocionRepository.incrementarUso(resultado.promocion.id, pacienteId);

      // Enviar notificación de aplicación exitosa
      try {
        const paciente = await db.Paciente.findByPk(pacienteId, {
          include: [{ model: db.Usuario, as: 'usuario' }]
        });

        if (paciente && paciente.usuario && paciente.usuario.email) {
          const asunto = 'Código de promoción aplicado exitosamente';
          const html = `
            <h2>¡Código de promoción aplicado!</h2>
            <p>Tu código <strong>${codigoPromocion}</strong> ha sido aplicado exitosamente.</p>
            <ul>
              <li><strong>Promoción:</strong> ${resultado.promocion.nombre}</li>
              <li><strong>Descuento:</strong> ${resultado.promocion.valor_descuento}%</li>
              <li><strong>Monto original:</strong> $${montoOriginal.toFixed(2)}</li>
              <li><strong>Descuento aplicado:</strong> -$${resultado.descuentoAplicado.toFixed(2)}</li>
              <li><strong>Monto final:</strong> $${resultado.montoFinal.toFixed(2)}</li>
            </ul>
          `;

          await notificationService.enviarEmailHTML({
            destinatarios: [paciente.usuario.email],
            asunto: asunto,
            html: html
          });

          logger.info(`Notificación de promoción aplicada enviada a ${paciente.usuario.email}`);
        }
      } catch (err) {
        logger.warn(`Error enviando notificación de promoción: ${err.message}`);
      }

      return {
        valida: true,
        descuentoAplicado: resultado.descuentoAplicado,
        montoFinal: resultado.montoFinal,
        promocion: resultado.promocion
      };
    } catch (err) {
      logger.error('Error aplicando código de promoción:', err.message);
      return { valida: false, error: 'Error validando código de promoción' };
    }
  }
}

export default new CompraPromocionService();

import db from '../models/index.js';
import promocionRecurrenteStrategy from '../infra/strategies/promocionRecurrenteStrategy.js';
import promocionInactivoStrategy from '../infra/strategies/promocionInactivoStrategy.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

class PromocionesService {
  async generarPromocionesParaPaciente(pacienteId) {
    try {
      const paciente = await db.Paciente.findByPk(pacienteId, {
        include: [
          { model: db.Usuario, as: 'usuario' },
        ],
      });

      if (!paciente) {
        throw new Error('Paciente no encontrado');
      }

      const compras = await db.Compra.findAll({
        where: { paciente_id: pacienteId },
        include: [{ model: db.CompraProducto, as: 'productos' }],
        order: [['fecha_creacion', 'DESC']],
      });

      const historial = await db.HistorialMedico.findOne({
        where: { paciente_id: pacienteId },
        include: [{ model: db.ResultadoConsulta, as: 'resultados_consultas' }],
      });

      const context = { paciente, compras, historial };

      // Ejecutar strategies (pueden ser asincrónicas)
      const [b, c] = await Promise.all([
        promocionRecurrenteStrategy(context),
        promocionInactivoStrategy(context),
      ]);

      const promociones = [...(b || []), ...(c || [])];

      // Si hay promociones, intentar notificar por correo (si el usuario tiene email)
      if (promociones.length > 0 && paciente.usuario && paciente.usuario.email) {
        try {
          const destinatarios = [paciente.usuario.email];
          const asunto = 'Nuevas promociones para ti';
          const mensaje = `Hemos generado ${promociones.length} promoción(es) personalizada(s) para ti.`;
          await notificationService.enviarEmail({ destinatarios, asunto, mensaje });
        } catch (err) {
          logger.warn('No se pudo enviar correo de promociones: ' + err.message);
        }
      }

      return promociones;
    } catch (err) {
      logger.error('Error generando promociones: ' + err.message);
      throw err;
    }
  }
}

export default new PromocionesService();

import SuscripcionService from '../services/suscripcionService.js';
import logger from '../utils/logger.js';

class SuscripcionController {
  /**
   * ✅ PASO 1: Crea una suscripción y genera la orden de pago pendiente
   * POST /api/suscripcion
   * 
   * Body:
   * {
   *   planId: "uuid"
   * }
   * 
   * Response:
   * {
   *   success: true,
   *   message: "Suscripción creada correctamente.",
   *   data: {
   *     suscripcion: { ... },
   *     ordenPago: { id, estado, monto }
   *   }
   * }
   */
  async crearSuscripcion(req, res) {
    try {
      const pacienteId = req.body.pacienteId; // Inyectado por middleware
      const { planId } = req.body;
      const metodoPago = req.body.metodoPago;

      if (!pacienteId || !planId) {
        return res.status(400).json({
          success: false,
          error: 'El planId es requerido.',
        });
      }

      logger.info(`📋 Creando suscripción para paciente ${pacienteId} con plan ${planId}`);

      const resultado = await SuscripcionService.crearSuscripcion(pacienteId, planId, metodoPago);

      return res.status(201).json({
        success: true,
        message: 'Suscripción creada correctamente. Elige un método de pago para continuar.',
        data: resultado
      });

    } catch (error) {
      logger.error(`❌ Error en crearSuscripcion: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

  /**
   * ✅ PASO 2: Procesa el pago de una suscripción existente
   * POST /api/suscripcion/pago
   * 
   * Body:
   * {
   *   suscripcionId: "uuid",
   *   metodoPago: "TARJETA" | "PASARELA" | "CONSIGNACION"
   * }
   * 
   * Response para TARJETA:
   * {
   *   success: true,
   *   data: {
   *     ordenPago: { ... },
   *     stripe: {
   *       clientSecret: "pi_xxx_secret_xxx",
   *       paymentIntentId: "pi_xxx",
   *       status: "requires_payment_method",
   *       amount_usd: 25.50,
   *       amount_cop: 100000
   *     }
   *   }
   * }
   * 
   * Response para PASARELA (PSE):
   * {
   *   success: true,
   *   data: {
   *     ordenPago: { ... },
   *     pse: {
   *       referencia: "PSE-xxx-123456",
   *       mensaje: "Procede con el pago..."
   *     }
   *   }
   * }
   * 
   * Response para CONSIGNACION:
   * {
   *   success: true,
   *   data: {
   *     ordenPago: { ... },
   *     consignacion: {
   *       referencia: "CONS-xxx",
   *       banco: "Banco XYZ",
   *       numero_cuenta: "1234567890",
   *       titular: "Tu Empresa SAS",
   *       monto: 100000,
   *       instrucciones: "..."
   *     }
   *   }
   * }
   */
  async procesarPago(req, res) {
    try {
      const pacienteId = req.body.pacienteId; // Inyectado por middleware
      const { suscripcionId, metodoPago = 'TARJETA' } = req.body;

      if (!pacienteId || !suscripcionId) {
        return res.status(400).json({
          success: false,
          error: 'El suscripcionId es requerido.',
        });
      }

      // Validar método de pago
      const metodosValidos = ['TARJETA_CREDITO', 'TARJETA_DEBITO', 'PASARELA', 'CONSIGNACION'];
      if (!metodosValidos.includes(metodoPago)) {
        return res.status(400).json({
          success: false,
          error: `Método de pago inválido. Usa: ${metodosValidos.join(', ')}`,
        });
      }

      logger.info(`💳 Procesando pago de suscripción ${suscripcionId} con método ${metodoPago}`);

      const resultado = await SuscripcionService.procesarPago(
        pacienteId, 
        suscripcionId, 
        metodoPago
      );

      // Mensajes personalizados según método de pago
      let message = 'Pago procesado correctamente.';
      
      if (metodoPago === 'TARJETA_CREDITO' || metodoPago === 'TARJETA_DEBITO') {
        message = 'Orden lista. Completa el pago con tu tarjeta usando el clientSecret.';
      } else if (metodoPago === 'PASARELA') {
        message = 'Referencia PSE generada. Procede con el pago en tu banco.';
      } else if (metodoPago === 'CONSIGNACION') {
        message = 'Instrucciones de consignación generadas. Realiza la transferencia.';
      }

      return res.status(200).json({
        success: true,
        message,
        data: resultado
      });

    } catch (error) {
      logger.error(`❌ Error en procesarPago: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

  /**
   * Obtiene todas las suscripciones del paciente autenticado
   * GET /api/suscripcion/mis-suscripciones
   */
  async obtenerMisSuscripciones(req, res) {
    try {
      const pacienteId = req.params.pacienteId;

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'Paciente no autenticado.',
        });
      }

      const suscripciones = await SuscripcionService.obtenerSuscripcionesPorPaciente(pacienteId);

      return res.status(200).json({
        success: true,
        data: {
          pacienteId,
          total: suscripciones.length,
          suscripciones
        }
      });

    } catch (error) {
      logger.error(`❌ Error en obtenerMisSuscripciones: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }

async cambiarPlan(req, res) {
  try {
    const pacienteId = req.user.paciente.id;
    const { nuevoPlanId, metodoPago } = req.body;

    // Validación básica
    if (!nuevoPlanId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del nuevo plan es requerido'
      });
    }

    // ✅ Usar el service para cambiar el plan
    const resultado = await SuscripcionService.cambiarPlan(
      pacienteId, 
      nuevoPlanId, 
      metodoPago
    );

    return res.json({
      success: true,
      message: 'Plan cambiado exitosamente',
      data: resultado
    });

  } catch (error) {
    logger.error('❌ Error al cambiar plan:', error);
    
    const statusCode = error.status || 500;
    const message = error.message || 'Error al cambiar el plan';

    return res.status(statusCode).json({
      success: false,
      message: message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


  /**
   * Obtiene el estado de una suscripción específica
   * GET /api/suscripcion/:suscripcionId
   */
  async obtenerSuscripcion(req, res) {
    try {
      const { suscripcionId } = req.params;
      const pacienteId = req.body.pacienteId; // Inyectado por middleware

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'Paciente no autenticado.',
        });
      }

      const resultado = await SuscripcionService.obtenerEstadoSuscripcion(pacienteId, suscripcionId);

      return res.status(200).json({
        success: true,
        data: resultado
      });

    } catch (error) {
      logger.error(`❌ Error en obtenerSuscripcion: ${error.message}`);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Error interno del servidor.',
      });
    }
  }
}

export default new SuscripcionController();
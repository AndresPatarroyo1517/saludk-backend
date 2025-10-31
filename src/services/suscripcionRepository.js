const db = require('../models/index');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const Suscripcion = db.Suscripcion;
const Plan = db.Plan;

exports.create = async (pacienteId, planId) => {
  try {
    const plan = await Plan.findByPk(planId);
    if (!plan || !plan.activo) {
      const e = new Error('El plan no existe o no está activo.');
      e.status = 400;
      throw e;
    }

    const suscripcion = await Suscripcion.create({
      id: uuidv4(),
      paciente_id: pacienteId,
      plan_id: planId,
      fecha_inicio: new Date(),
      fecha_vencimiento: null,
      estado: 'PENDIENTE_PAGO',
      auto_renovable: false,
      consultas_virtuales_usadas: 0,
      consultas_presenciales_usadas: 0,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    });

    // Agregamos un valor temporal para el monto
    suscripcion.monto = plan.precio_mensual;

    logger.info(`Suscripción ${suscripcion.id} creada en la base de datos.`);
    return suscripcion;

  } catch (error) {
    logger.error(`Error en SuscripcionRepository.create: ${error.message}`);
    throw error;
  }
};

exports.findById = async (id) => {
  try {
    return await Suscripcion.findByPk(id);
  } catch (error) {
    logger.error(`Error al buscar suscripción ${id}: ${error.message}`);
    throw error;
  }
};

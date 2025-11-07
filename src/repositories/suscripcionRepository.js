import db from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

const Suscripcion = db.Suscripcion;
const Plan = db.Plan;

/**
 * Crea una nueva suscripción
 */
const create = async (pacienteId, planId) => {
  try {
    const plan = await Plan.findByPk(planId);
    
    if (!plan || !plan.activo) {
      const e = new Error('El plan no existe o no está activo.');
      e.status = 400;
      throw e;
    }

    // Validar que el plan tenga precio válido
    if (!plan.precio_mensual || plan.precio_mensual <= 0) {
      const e = new Error(`El plan ${plan.nombre} no tiene un precio válido.`);
      e.status = 400;
      throw e;
    }

    // Calcular fechas: fecha_inicio hoy y fecha_vencimiento según la duración del plan
    const fechaInicio = new Date();
    const duracionMeses = Number(plan.duracion_meses) || 1;
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + duracionMeses);

    const suscripcion = await Suscripcion.create({
      id: uuidv4(),
      paciente_id: pacienteId,
      plan_id: planId,
      fecha_inicio: fechaInicio,
      fecha_vencimiento: fechaVencimiento,
      estado: 'PENDIENTE_PAGO',
      auto_renovable: false,
      consultas_virtuales_usadas: 0,
      consultas_presenciales_usadas: 0,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    });

    logger.info(`✅ Suscripción ${suscripcion.id} creada | Plan: ${plan.nombre} | Precio: ${plan.precio_mensual}`);
    
    return suscripcion;

  } catch (error) {
    logger.error(`❌ Error en SuscripcionRepository.create: ${error.message}`);
    throw error;
  }
};

/**
 * Busca una suscripción por ID (sin incluir plan)
 */
const findById = async (id) => {
  try {
    return await Suscripcion.findByPk(id);
  } catch (error) {
    logger.error(`❌ Error al buscar suscripción ${id}: ${error.message}`);
    throw error;
  }
};

/**
 * Busca una suscripción por ID e incluye el plan
 * Útil para obtener el precio del plan junto con la suscripción
 */
const findByIdWithPlan = async (id) => {
  try {
    return await Suscripcion.findByPk(id, {
      include: [{
        model: Plan,
        as: 'plan', // Ajusta el 'as' según tu asociación en models/index.js
        attributes: ['id', 'nombre', 'codigo', 'precio_mensual', 'duracion_meses', 'beneficios']
      }]
    });
  } catch (error) {
    logger.error(`❌ Error al buscar suscripción con plan ${id}: ${error.message}`);
    throw error;
  }
};

/**
 * Busca todas las suscripciones de un paciente con sus planes
 */
const findByPacienteId = async (pacienteId) => {
  try {
    return await Suscripcion.findAll({
      where: { paciente_id: pacienteId },
      include: [{
        model: Plan,
        as: 'plan',
        attributes: ['id', 'nombre', 'codigo', 'precio_mensual', 'duracion_meses']
      }],
      order: [['fecha_creacion', 'DESC']]
    });
  } catch (error) {
    logger.error(`❌ Error al buscar suscripciones del paciente ${pacienteId}: ${error.message}`);
    throw error;
  }
};

/**
 * Actualiza el estado de una suscripción
 */
const updateEstado = async (id, nuevoEstado) => {
  try {
    const suscripcion = await Suscripcion.findByPk(id);
    
    if (!suscripcion) {
      const e = new Error('Suscripción no encontrada');
      e.status = 404;
      throw e;
    }

    await suscripcion.update({
      estado: nuevoEstado,
      fecha_actualizacion: new Date()
    });

    logger.info(`✅ Suscripción ${id} actualizada a estado: ${nuevoEstado}`);
    return suscripcion;

  } catch (error) {
    logger.error(`❌ Error al actualizar estado de suscripción ${id}: ${error.message}`);
    throw error;
  }
};


const toDateOnly = (d) => new Date(new Date(d).toISOString().slice(0, 10));

/**
 * 1) TOTAL de PACIENTES con suscripción ACTIVA (snapshot en asOf).
 *    Cuenta pacientes únicos (distinct por paciente_id).
 */
export const countPacientesActivosSnapshot = async (
  asOf,
  opts = { activeStates: ['ACTIVA', 'PAGADA'] }
) => {
  try {
    const asOfDate = toDateOnly(asOf ?? new Date());
    const activeStates = opts?.activeStates ?? ['ACTIVA', 'PAGADA'];

    const total = await Suscripcion.count({
      distinct: true,
      col: 'paciente_id',
      where: {
        estado: { [Op.in]: activeStates },
        fecha_inicio: { [Op.lte]: asOfDate },
        fecha_vencimiento: { [Op.gte]: asOfDate }
      }
    });

    return total;
  } catch (error) {
    logger.error(`❌ Error en countPacientesActivosSnapshot: ${error.message}`);
    throw error;
  }
};

/**
 * 2) DESGLOSE por categoría usando LISTAS de plan_id (más rápido y claro).
 *    Devuelve { sub_premium, sub_estandar, totalActivos }
 */
export const countActivosByPlanIdsSnapshot = async (
  asOf,
  opts = {
    activeStates: ['ACTIVA', 'PAGADA'],
    premiumPlanIds: [],
    estandarPlanIds: []
  }
) => {
  try {
    const asOfDate = toDateOnly(asOf ?? new Date());
    const activeStates = opts?.activeStates ?? ['ACTIVA', 'PAGADA'];
    const { premiumPlanIds = [], estandarPlanIds = [] } = opts;

    // Conteos por categoría (distinct pacientes)
    const [premium, estandar, totalActivos] = await Promise.all([
      premiumPlanIds.length
        ? Suscripcion.count({
          distinct: true,
          col: 'paciente_id',
          where: {
            estado: { [Op.in]: activeStates },
            plan_id: { [Op.in]: premiumPlanIds },
            fecha_inicio: { [Op.lte]: asOfDate },
            fecha_vencimiento: { [Op.gte]: asOfDate }
          }
        })
        : 0,
      estandarPlanIds.length
        ? Suscripcion.count({
          distinct: true,
          col: 'paciente_id',
          where: {
            estado: { [Op.in]: activeStates },
            plan_id: { [Op.in]: estandarPlanIds },
            fecha_inicio: { [Op.lte]: asOfDate },
            fecha_vencimiento: { [Op.gte]: asOfDate }
          }
        })
        : 0,
      // Total (por si quieres comparativo)
      Suscripcion.count({
        distinct: true,
        col: 'paciente_id',
        where: {
          estado: { [Op.in]: activeStates },
          fecha_inicio: { [Op.lte]: asOfDate },
          fecha_vencimiento: { [Op.gte]: asOfDate }
        }
      })
    ]);

    return {
      sub_premium: premium,
      sub_estandar: estandar,
      totalActivos
    };
  } catch (error) {
    logger.error(`❌ Error en countActivosByPlanIdsSnapshot: ${error.message}`);
    throw error;
  }
};

/**
 * 3) DESGLOSE por categoría usando PATRONES en Plan (JOIN).
 *    Útil si no tienes mapeo de IDs y quieres basarte en nombre/código.
 *    opts.premium: { codes?: string[], prefixes?: string[], namePatterns?: string[] }
 *    opts.estandar: { codes?: string[], prefixes?: string[], namePatterns?: string[] }
 */
export const countActivosByPlanPatternsSnapshot = async (
  asOf,
  opts = {
    activeStates: ['ACTIVA', 'PAGADA'],
    premium: { codes: [], prefixes: [], namePatterns: [] },
    estandar: { codes: [], prefixes: [], namePatterns: [] }
  }
) => {
  try {
    const asOfDate = toDateOnly(asOf ?? new Date());
    const activeStates = opts?.activeStates ?? ['ACTIVA', 'PAGADA'];

    const buildPlanWhere = (rules = {}) => {
      const or = [];
      const { codes = [], prefixes = [], namePatterns = [] } = rules;
      if (codes.length) or.push({ codigo: { [Op.in]: codes } });
      if (prefixes.length) prefixes.forEach(p => or.push({ codigo: { [Op.iLike]: `${p}%` } }));
      if (namePatterns.length) namePatterns.forEach(p => or.push({ nombre: { [Op.iLike]: p } }));
      return or.length ? { [Op.or]: or } : undefined;
    };

    const commonWhere = {
      estado: { [Op.in]: activeStates },
      fecha_inicio: { [Op.lte]: asOfDate },
      fecha_vencimiento: { [Op.gte]: asOfDate }
    };

    const [premium, estandar, totalActivos] = await Promise.all([
      // Premium
      Suscripcion.count({
        distinct: true,
        col: 'paciente_id',
        where: commonWhere,
        include: [{
          model: Plan,
          as: 'plan',
          attributes: [],
          where: buildPlanWhere(opts?.premium)
        }]
      }),
      // Estándar
      Suscripcion.count({
        distinct: true,
        col: 'paciente_id',
        where: commonWhere,
        include: [{
          model: Plan,
          as: 'plan',
          attributes: [],
          where: buildPlanWhere(opts?.estandar)
        }]
      }),
      // Total
      Suscripcion.count({
        distinct: true,
        col: 'paciente_id',
        where: commonWhere
      })
    ]);

    return {
      sub_premium: premium,
      sub_estandar: estandar,
      totalActivos
    };
  } catch (error) {
    logger.error(`❌ Error en countActivosByPlanPatternsSnapshot: ${error.message}`);
    throw error;
  }
};


export default { 
  create, 
  findById, 
  findByIdWithPlan,
  findByPacienteId,
  updateEstado
};
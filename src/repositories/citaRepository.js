import db from "../models/index.js";
import { Op, fn, col } from 'sequelize';

const { Medico, Cita } = db;

const create = async (data, options = {}) => {
  try {
    const cita = await cita.create(data, options);
    return cita;
  } catch (err) {
    logger.error(`citaRepository.create: ${err.message}`);
    throw err;
  }
};

const findById = async (id) => {
  try {
    return await cita.findByPk(id);
  } catch (err) {
    logger.error(`CitaRepository.findById: ${err.message}`);
    throw err;
  }
};

const update = async (id, attrs) => {
  try {
    const cita = await cita.findByPk(id);
    if (!cita) return null;
    return await cita.update(attrs);
  } catch (err) {
    logger.error(`CitaRepository.update: ${err.message}`);
    throw err;
  }
};

const verificarDisponibilidad = async (medicoId, fecha, hora) => {
  try {
    const existente = await cita.findOne({
      where: { medicoId, fecha, hora, estado: 'PENDIENTE' }
    });
    return !existente;
  } catch (err) {
    logger.error(`citaRepository.verificarDisponibilidad: ${err.message}`);
    throw err;
  }
};


export const countByRange = async (
  { from, to },
  opts = { dateField: 'fecha_hora', estados: undefined }
) => {
  const dateField = opts?.dateField ?? 'fecha_hora';

  const total = await Cita.count({
    where: {
      [dateField]: { [Op.between]: [from, to] },
      ...(opts?.estados?.length ? { estado: { [Op.in]: opts.estados } } : {})
    }
  });

  return total;
};

export const countByStatus = async (
  { from, to },
  opts = { dateField: 'fecha_hora', estados: undefined }
) => {
  const dateField = opts?.dateField ?? 'fecha_hora';

  const rows = await Cita.findAll({
    attributes: ['estado', [fn('COUNT', col('id')), 'count']],
    where: {
      [dateField]: { [Op.between]: [from, to] },
      ...(opts?.estados?.length ? { estado: { [Op.in]: opts.estados } } : {})
    },
    group: ['estado'],
    raw: true
  });

  const out = {};
  rows.forEach(r => { out[r.estado] = Number(r.count); });
  return out;
};




export default {
  create,
  findById,
  update,
  verificarDisponibilidad,
  countByRange,
  countByStatus
};

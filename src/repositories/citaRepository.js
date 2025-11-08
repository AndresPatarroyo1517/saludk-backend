import db from "../models/index.js";
import logger from "../utils/logger.js";
const { Cita } = db;


const create = async (data, options = {}) => {
  try {
    const cita = await Cita.create(data, options);
    return cita;
  } catch (err) {
    logger.error(`citaRepository.create: ${err.message}`);
    throw err;
  }
};

const findById = async (id) => {
  try {
    return await Cita.findByPk(id);
  } catch (err) {
    logger.error(`CitaRepository.findById: ${err.message}`);
    throw err;
  }
};

const update = async (id, attrs) => {
  try {
    const cita = await Cita.findByPk(id);
    if (!cita) return null;
    return await cita.update(attrs);
  } catch (err) {
    logger.error(`CitaRepository.update: ${err.message}`);
    throw err;
  }
};

const verificarDisponibilidad = async (medicoId, fecha, hora) => {
  try {
    const existente = await Cita.findOne({
      where: { medico_id: medicoId, fecha, hora, estado: 'PENDIENTE' }
    });
    return !existente;
  } catch (err) {
    logger.error(`citaRepository.verificarDisponibilidad: ${err.message}`);
    throw err;
  }
};

export default {
  create,
  findById,
  update,
  verificarDisponibilidad
};

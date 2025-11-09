import db from "../models/index.js";
import logger from "../utils/logger.js";
const { Cita } = db;


class citaRepository {
  async create(data) {
    return await Cita.create(data);
  }

  async findById(id) {
    return await Cita.findByPk(id);
  }

  async findByPaciente(paciente_id) {
    return await Cita.findAll({ where: { paciente_id } });
  }
}

export default new citaRepository();

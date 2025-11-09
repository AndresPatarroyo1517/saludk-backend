import db from "../models/index.js";
const { Medico, Cita } = db;


class medicoRepository {
  async validarDisponibilidad(medico_id, fecha_hora) {
    const citaExistente = await Cita.findOne({ where: { medico_id, fecha_hora } });
    return !citaExistente; 
  }
}

export default new medicoRepository();


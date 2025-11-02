import db from "../models/index.js";
const { Medico } = db;

class MedicoRepository {
  async crearMedico(data) {
    return await Medico.create(data);
  }

  async obtenerMedicos() {
    return await Medico.findAll();
  }

  async obtenerMedicoPorId(id) {
    return await Medico.findByPk(id);
  }

  async actualizarMedico(id, data) {
    const medicoEncontrado = await Medico.findByPk(id);
    if (!medicoEncontrado) return null;
    return await medicoEncontrado.update(data);
  }

  async eliminarMedico(id) {
    const medicoEncontrado = await Medico.findByPk(id);
    if (!medicoEncontrado) return null;
    await medicoEncontrado.destroy();
    return medicoEncontrado;
  }
}

export default new MedicoRepository();

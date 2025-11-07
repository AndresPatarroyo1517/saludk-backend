import db from "../models/index.js";
const { Medico, CalificacionMedico, Cita } = db;

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

  // IMPORTANTE (asociación sugerida):
  // CalificacionMedico.belongsTo(Cita, { foreignKey: 'cita_id', as: 'cita' })
  async avgRating  (
    { from, to },
    opts = { onlyCompletedAppointments: true, appointmentCompletedStates: ['COMPLETADA'], medicoId: undefined, minScore: undefined, maxScore: undefined }
  ) {
    const include = [];
    if (opts?.onlyCompletedAppointments) {
      const completed = opts?.appointmentCompletedStates?.length ? opts.appointmentCompletedStates : ['COMPLETADA'];
      include.push({
        model: Cita,
        as: 'cita',
        attributes: [],
        where: { estado: { [Op.in]: completed } }
      });
    }

    const where = {
      fecha_creacion: { [Op.between]: [from, to] },
      ...(opts?.medicoId ? { medico_id: opts.medicoId } : {})
    };

    if (opts?.minScore != null || opts?.maxScore != null) {
      where.puntuacion = {
        ...(opts?.minScore != null ? { [Op.gte]: opts.minScore } : {}),
        ...(opts?.maxScore != null ? { [Op.lte]: opts.maxScore } : {})
      };
    }

    const row = await CalificacionMedico.findOne({
      attributes: [[fn('AVG', col('puntuacion')), 'avg']],
      where,
      ...(include.length ? { include } : {}),
      raw: true
    });

    const v = row?.avg;
    return v == null ? null : Math.round(Number(v) * 100) / 100; // escala 1–10
  };

}

export default new MedicoRepository();

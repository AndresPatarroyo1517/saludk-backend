
import { Op } from 'sequelize';
import db from '../models/index.js'; 
class medicoRepository {
  async validarDisponibilidad(medico_id, fecha_hora) {
    const fecha = new Date(fecha_hora);
    const diaSemana = fecha.getDay(); 
    const hora = fecha.toTimeString().slice(0, 8); 

    // Buscar disponibilidad registrad
    const disponibilidad = await db.DisponibilidadMedico.findOne({
      where: {
        medico_id,
        dia_semana: diaSemana,
        disponible: true,
        hora_inicio: { [Op.lte]: hora },
        hora_fin: { [Op.gte]: hora },
      },
    });

    if (!disponibilidad) return false;

    // Verificar que no tenga otra cita en esa fecha y hora
    const citaExistente = await db.Cita.findOne({
      where: {
        medico_id,
        fecha_hora,
        estado: { [Op.ne]: 'CANCELADA' },
      },
    });

    if (citaExistente) return false;

    return true;
  }
}

export default new medicoRepository();


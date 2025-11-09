import citaRepository from '../repositories/citaRepository.js';
import medicoRepository from '../repositories/medicoRepository.js';
import notificationService from '../services/notificationService.js';

class CitasService {
  async agendarCita({ paciente_id, medico_id, fecha_hora, modalidad, motivo_consulta }) {
    // Validar disponibilidad del médico
    const disponible = await medicoRepository.validarDisponibilidad(medico_id, fecha_hora);
    if (!disponible) throw new Error('El médico no está disponible en esa fecha y hora.');

    // Crear la cita
    const cita = await citaRepository.create({
      paciente_id,
      medico_id,
      fecha_hora,
      modalidad,
      motivo_consulta,
      estado: 'AGENDADA',
    });

    // Notificar al paciente y al médico
    await notificationService.enviarEmail(
      paciente_id,
      'Confirmación de cita',
      `Tu cita fue agendada con éxito para el ${fecha_hora}.`
    );
    await notificationService.enviarEmail(
      medico_id,
      'Nueva cita asignada',
      `Tienes una nueva cita con un paciente el ${fecha_hora}.`
    );

    return cita;
  }

  async cancelarCita(citaId) {
    const cita = await citaRepository.findById(citaId);
    if (!cita) throw new Error('Cita no encontrada.');

    cita.estado = 'CANCELADA';
    await cita.save();

    await notificationService.enviarEmail(
      cita.paciente_id,
      'Cita cancelada',
      'Tu cita fue cancelada correctamente.'
    );

    return { message: 'Cita cancelada exitosamente.' };
  }
}

export default new CitasService();



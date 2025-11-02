import citaRepository from '../repositories/citaRepository.js';
import medicoRepository from '../repositories/medicoRepository.js';
import notificationService from './notificationService.js';

class citaService {
  async agendarCita({ pacienteId, medicoId, fecha, hora, modalidad }) {
    // Verificar que el médico exista
    const medico = await medicoRepository.obtenerMedicoPorId(medicoId);
    if (!medico) throw new Error('El médico no existe.');

    // Verificar disponibilidad
    const disponible = await citaRepository.verificarDisponibilidad(medicoId, fecha, hora);
    if (!disponible) throw new Error('No hay disponibilidad para esa fecha y hora.');

    // Crear la cita
    const nueva = await citaRepository.create({
      pacienteId,
      medicoId,
      fecha,
      hora,
      modalidad,
      estado: 'PENDIENTE'
    });

    // Enviar notificación 
    try {
      await notificationService.enviarEmail({
        destinatarios: [],
        asunto: 'Nueva cita creada',
        mensaje: `Tu cita ha sido agendada para el ${fecha} a las ${hora}.`
      });
    } catch (e) {
      console.warn('Error al enviar notificación, pero la cita fue creada - citaService.js:33');
    }

    return nueva;
  }

  async cancelarCita(id) {
    const cita = await citaRepository.obtenerCitaPorId(id);
    if (!cita) throw new Error('Cita no encontrada.');

    const actualizada = await citaRepository.update(id, { estado: 'CANCELADA' });
    return actualizada;
  }
}

export default new citaService();


import CitasService from '../services/citaService.js';

class CitasController {
  async agendarCita(req, res) {
    try {
      const { paciente_id, medico_id, fecha_hora, modalidad, motivo_consulta } = req.body;
      const cita = await CitasService.agendarCita({
        paciente_id,
        medico_id,
        fecha_hora,
        modalidad,
        motivo_consulta,
      });
      res.status(201).json({ message: 'Cita agendada exitosamente', cita });
    } catch (error) {
      console.error('Error al agendar cita: - citaController.js:16', error);
      res.status(400).json({ message: 'Error al agendar la cita', error: error.message });
    }
  }

  async cancelarCita(req, res) {
    try {
      const { id } = req.params;
      const result = await CitasService.cancelarCita(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: 'Error al cancelar la cita', error: error.message });
    }
  }
}

export default new CitasController();


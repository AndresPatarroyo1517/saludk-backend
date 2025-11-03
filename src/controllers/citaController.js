import citaService from '../services/citaService.js';
import logger from '../utils/logger.js';


const agendarCita = async (req, res) => {
  try {
    const body = req.body;
    const pacienteId = req.pacienteId || req.headers['x-paciente-id'] || body.pacienteId;
    const cita = await citaService.agendarCita({ ...body, pacienteId }); 
    return res.status(201).json({ success: true, data: cita });
  } catch (err) {
    logger.error(`citaController.agendarCita: ${err.message}`);
    return res.status(err.status || 400).json({ success: false, error: err.message }); 
  }
};

const cancelarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const resu = await citaService.cancelarCita(id); 
    return res.json({ success: true, data: resu });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export default {
  agendarCita,
  cancelarCita
};

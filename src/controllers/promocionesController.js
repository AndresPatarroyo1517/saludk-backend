import promocionesService from '../services/promocionesService.js';

class PromocionesController {
  async generarPromocion(req, res) {
    try {
      const pacienteId = req.params.pacienteId;
      if (!pacienteId) {
        return res.status(400).json({ success: false, error: 'pacienteId requerido' });
      }

      const promociones = await promocionesService.generarPromocionesParaPaciente(pacienteId);

      return res.json({ success: true, promociones });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default new PromocionesController();

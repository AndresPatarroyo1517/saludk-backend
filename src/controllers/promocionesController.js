import promocionesService from '../services/promocionesService.js';

class PromocionesController {
  /**
   * Genera promociones personalizadas para el paciente autenticado
   * GET /api/promociones/generar
   */
  async generarPromocion(req, res) {
    try {
      // ✅ CAMBIO CRÍTICO: El pacienteId viene de req.params.pacienteId (inyectado por la ruta)
      const pacienteId = req.params.pacienteId;
      
      if (!pacienteId) {
        return res.status(400).json({ 
          success: false, 
          error: 'pacienteId requerido' 
        });
      }

      const promociones = await promocionesService.generarPromocionesParaPaciente(pacienteId);

      return res.json({ 
        success: true, 
        data: promociones 
      });

    } catch (err) {
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
  }

  /**
   * Obtiene las promociones asignadas al paciente autenticado
   * GET /api/promociones/mis-promociones
   */
  async obtenerMisPromociones(req, res) {
    try {
      const pacienteId = req.params.pacienteId;

      if (!pacienteId) {
        return res.status(400).json({
          success: false,
          error: 'pacienteId requerido'
        });
      }

      const promociones = await promocionesService.obtenerPromocionesPorPaciente(pacienteId);

      return res.json({
        success: true,
        data: {
          pacienteId,
          total: promociones.length,
          promociones
        }
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
}

export default new PromocionesController();
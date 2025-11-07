import KpiService from '../services/KpiService.js';

const obtenerKpis = async (req, res) => {
    try {
        const { tipo, fecha_inicio, fecha_fin } = req.query;
        const filtros = { tipo, fecha_inicio, fecha_fin };
        const kpis = await KpiService.getResumenKpis(filtros);
        res.json({ filtros, kpis });
    } catch (error) {
        console.error('Error al obtener KPIs:', error);
        res.status(500).json({ error: 'Error al obtener KPIs', detalle: error.message });
    }
};

export default {
    obtenerKpis
};
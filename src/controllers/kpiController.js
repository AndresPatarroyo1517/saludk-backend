import * as kpiService from '../services/kpiService.js';

export const getKPIs = async (req, res) => {
    try {
        const kpis = await kpiService.obtenerKPIs(req.query);
        res.json(kpis);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error al obtener KPIs",
            error: error.message
        });
    }
};
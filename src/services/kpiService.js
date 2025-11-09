import * as kpiRepo from "../repositories/kpiRepository.js";
import { parsearFiltroFecha } from "../utils/dateRanges.js";

export const obtenerKPIs = async (filtroQuery) => {
    try {
        const filtros = parsearFiltroFecha(filtroQuery);

        const [
            citasAgendadas,
            resumenCitas,
            ingresos,
            califMedicos,
            califProductos,
            pacientes,
            solicitudes
        ] = await Promise.all([
            kpiRepo.countCitasAgendadas(filtros),
            kpiRepo.resumenCitas(filtros),
            kpiRepo.ingresosTotales(filtros),
            kpiRepo.calificacionPromedioMedicos(filtros),
            kpiRepo.calificacionPromedioProductos(filtros),
            kpiRepo.pacientesSuscripcion(filtros),
            kpiRepo.solicitudesResumen(filtros)
        ]);

        return {
            success: true,
            data: {
                citasAgendadas,
                resumenCitas,
                ingresos,
                califMedicos,
                califProductos,
                pacientes,
                solicitudes
            }
        };
    } catch (error) {
        throw new Error(error.message || "Error al obtener KPIs");
    }
};
import { computeDateRangeFromTipo } from '../utils/dateRange.js';
import { pick } from '../utils/pick.js';

import CitasRepository from '../repositories/citaRepository.js';
import CompraRepository from '../repositories/productoRepository.js';
import MedicoRepository from '../repositories/medicoRepository.js';
import SuscripcionRepository from '../repositories/suscripcionRepository.js';
import SolicitudRegistroRepository from '../repositories/solicitudRepository.js';

const citasRepo = new CitasRepository();
const compraRepo = new CompraRepository();
const califMedRepo = new MedicoRepository();
const suscripcionRepo = new SuscripcionRepository();
const solicitudRepo = new SolicitudRegistroRepository();

/**
 * Filtros esperados:
 * - tipo: 'hoy' | 'ultimos7' | 'mes' | 'personalizado'
 * - fecha_inicio: 'YYYY-MM-DD' (requerido si tipo='personalizado')
 * - fecha_fin: 'YYYY-MM-DD' (requerido si tipo='personalizado')
 */
async function getResumenKpis(filtros = {}) {
    const {
        tipo = 'mes',
        fecha_inicio,
        fecha_fin,
        tz = 'America/Bogota',

        fields,                                      // ej: ['appointmentsCount','revenueProducts']
        purchaseStates = ['PAGADA', 'ENTREGADA'],    // catálogo compra válido como ingreso
        purchaseDateField = 'fecha_pago',
        ratingScale = 10,                            // calificaciones 1–10
        appointmentCompletedStates = ['COMPLETADA'],
        subscriptionActiveStates = ['ACTIVA', 'PAGADA'],
        currency = 'COP',
        planRules = {
            premiumCodes: ['PREMIUM', 'GOLD'],
            estandarCodes: ['STANDARD', 'BASIC'],
            premiumPrefixes: ['PREM'],
            estandarPrefixes: ['STD'],
            premiumNamePatterns: ['%Premium%'],
            estandarNamePatterns: ['%Estándar%', '%Estandar%', '%Basic%']
        }
    } = filtros;

    // 1) Rango de fechas desde tus filtros
    const { range } = computeDateRangeFromTipo({ tipo, fecha_inicio, fecha_fin, tz });
    const asOfNow = new Date();

    // 2) Resolver planes premium/estándar
    const { premiumIds, estandarIds } = await planRepo.mapIdsByCategory(planRules);

    // 3) KPIs en paralelo
    const [
        appointmentsCount,
        appointmentsByStatus,
        revenueProducts,
        avgRatingMedicos,
        avgRatingProductos,
        pacientesPremium,
        requestsCount
    ] = await Promise.all([
        // Número de citas
        citasRepo.countByRange(range, { dateField: 'fecha_hora' }),

        // Resumen por estado
        citasRepo.countByStatus(range, { dateField: 'fecha_hora' }),

        // Ingresos totales (productos)
        compraRepo.sumRevenueTotal(range, { dateField: purchaseDateField, estados: purchaseStates, currency }),

        // Calificación promedio (médicos) 1–10, solo citas completadas
        califMedRepo.avgRating(range, { onlyCompletedAppointments: true, appointmentCompletedStates }),

        // Calificación promedio (productos) 1–10, solo compras válidas
        califProdRepo.avgRating(range, { onlyPaidPurchases: true, purchaseValidStates: purchaseStates, purchaseDateField }),

        // Pacientes premium vs estándar (foto actual)
        suscripcionRepo.countByPlanActualSnapshot({ asOf: asOfNow }, {
            activeStates: subscriptionActiveStates,
            premiumPlanIds: premiumIds,
            estandarPlanIds: estandarIds
        }),

        // Número de solicitudes
        solicitudRepo.countByRange(range, { dateField: 'fecha_creacion' })
    ]);

    const full = {
        appointmentsCount,
        revenueProducts, // { currency, total }
        avgRating: {
            medicos: avgRatingMedicos,
            productos: avgRatingProductos,
            scale: ratingScale
        },
        pacientesPremium,      // { sub_premium, sub_estandar }
        appointmentsByStatus,  // { estado: count, ... }
        requestsCount
    };

    const kpis = pick(full, Array.isArray(fields) ? fields : undefined);

    return kpis;
}

export default {
    getResumenKpis
};
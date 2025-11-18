import express from 'express';
import { getKPIs } from '../controllers/kpiController.js';
import { requireDirector } from '../middlewares/authMiddleware.js';
import { defaultCacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /metricas/kpi:
 *   get:
 *     summary: Obtener KPIs de la plataforma de salud (SOLO DIRECTOR MÉDICO)
 *     description: |
 *       Retorna todos los KPIs principales incluyendo número de citas, ingresos, 
 *       calificaciones, pacientes premium/estándar, resumen de estado de citas y solicitudes.
 *       
 *       **REQUIERE:** Rol DIRECTOR_MEDICO
 *       
 *       Información sensible que solo debe ser accesible por administradores.
 *     tags: [KPI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filtro
 *         required: false
 *         schema:
 *           type: string
 *           enum: [hoy, 7dias, mes, personalizado]
 *         description: Filtro de fecha para los KPIs
 *       - in: query
 *         name: desde
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial (solo si filtro=personalizado)
 *       - in: query
 *         name: hasta
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final (solo si filtro=personalizado)
 *     responses:
 *       '200':
 *         description: KPIs obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 numeroCitas:
 *                   type: integer
 *                   description: Número total de citas
 *                 resumenCitas:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     agendadas:
 *                       type: integer
 *                     completadas:
 *                       type: integer
 *                     canceladas:
 *                       type: integer
 *                 ingresosTotales:
 *                   type: number
 *                   description: Ingresos totales en el período
 *                 calificacionMedicos:
 *                   type: number
 *                   description: Calificación promedio de médicos
 *                 calificacionProductos:
 *                   type: number
 *                   description: Calificación promedio de productos
 *                 pacientesSuscripciones:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     premium:
 *                       type: integer
 *                     estandar:
 *                       type: integer
 *                 resumenSolicitudes:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pendiente:
 *                       type: integer
 *                     aprobada:
 *                       type: integer
 *                     rechazada:
 *                       type: integer
 *                     devuelta:
 *                       type: integer
 *       '401':
 *         description: No autorizado (sin token o token inválido)
 *       '403':
 *         description: Permisos insuficientes (no es Director Médico)
 *       '500':
 *         description: Error al obtener KPIs
 */
router.get('/kpi', requireDirector, defaultCacheMiddleware(300, 'kpis'), getKPIs);

export default router;
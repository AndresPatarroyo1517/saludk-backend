import express from 'express';
import { revisar, listarAprobadas, listarPendientesConErrores, aprobarDirector, devolverDirector, rechazarDirector } from '../controllers/validacionController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Validacion
 *     description: Endpoints para validar las solicitudes
 */

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     RevisionExitosa:
 *       type: object
 *       properties:
 *         estado:
 *           type: string
 *           enum: [APROBADA, RECHAZADA]
 *         resultado:
 *           type: object
 *           properties:
 *             clinico:
 *               type: object
 *               properties:
 *                 antecedentes:
 *                   type: array
 *                   items:
 *                     type: object
 *             policia:
 *               type: object
 *               properties:
 *                 tieneFraude:
 *                   type: boolean
 *                 registros:
 *                   type: array
 *                   items:
 *                     type: object
 *               required: [tieneFraude, registros]
 *           required: [clinico, policia]
 *       required: [estado, resultado]
 *     RevisionPendientePorError:
 *       type: object
 *       properties:
 *         estado:
 *           type: string
 *           enum: [PENDIENTE]
 *         error:
 *           type: string
 *         detalle:
 *           type: string
 *       required: [estado, error]
 */

/**
 * @openapi
 * /validacion/solicitudes/{id}/revisar:
 *   post:
 *     summary: Revisión automática de riesgos (HU-04)
 *     description: |
 *       Consulta bases externas (clínicas y policiales) y actualiza el estado de la solicitud:
 *
 *       - **APROBADA** si no hay fraude.
 *       - **RECHAZADA** si se detecta fraude.
 *       - Si ocurre un error al consultar las bases, **mantiene PENDIENTE** y permite revisión manual.
 *     tags:
 *       - Validacion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la solicitud_registro a revisar
 *     responses:
 *       '200':
 *         description: Resultado de la revisión automática
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/RevisionExitosa'
 *                 - $ref: '#/components/schemas/RevisionPendientePorError'
 *             examples:
 *               aprobada:
 *                 summary: Solicitud aprobada
 *                 value:
 *                   estado: APROBADA
 *                   resultado:
 *                     clinico: { antecedentes: [] }
 *                     policia: { tieneFraude: false, registros: [] }
 *               rechazada:
 *                 summary: Solicitud rechazada por fraude
 *                 value:
 *                   estado: RECHAZADA
 *                   resultado:
 *                     clinico: { antecedentes: [] }
 *                     policia:
 *                       tieneFraude: true
 *                       registros:
 *                         - tipo: "fraude"
 *                           descripcion: "Fraude a aseguradora"
 *       '400':
 *         description: Solicitud no está en estado PENDIENTE o error de validación
 *       '401':
 *         description: No autorizado (token inválido o ausente)
 *       '404':
 *         description: Solicitud no encontrada
 */
router.post('/solicitudes/:id/revisar', revisar);

/**
 * @openapi
 * /validacion/solicitudes/aprobadas:
 *   get:
 *     summary: Listar solicitudes APROBADAS (Director Médico)
 *     tags: [Validacion]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       '200':
 *         description: Lista de solicitudes aprobadas con datos de paciente y validaciones
 */
router.get('/solicitudes/aprobadas', listarAprobadas); //Poner authToken

/**
 * @openapi
 * /validacion/solicitudes/pendientes-con-errores:
 *   get:
 *     summary: Listar solicitudes PENDIENTES pero solo si tienen errores en resultados_bd_externas
 *     tags: [Validacion]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       '200':
 *         description: Lista de solicitudes pendientes con errores
 */
router.get('/solicitudes/pendientes-con-errores', listarPendientesConErrores); //Poner authToken

/**
 * @openapi
 * /validacion/solicitudes/{id}/aprobar:
 *   post:
 *     summary: Aprobar por Director (crea resultado_validacion y activa usuario)
 *     tags: [Validacion]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo_decision: { type: string }
 *     responses:
 *       '200':
 *         description: Solicitud aprobada y usuario activado
 */
router.post('/solicitudes/:id/aprobar', aprobarDirector); //Poner authToken

/**
 * @openapi
 * /validacion/solicitudes/{id}/rechazar:
 *   post:
 *     summary: Rechazar por Director (motivo obligatorio; crea resultado_validacion y elimina usuario/paciente/solicitud)
 *     tags: [Validacion]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo_decision]
 *             properties:
 *               motivo_decision: { type: string }
 *     responses:
 *       '200':
 *         description: Solicitud rechazada y entidades eliminadas
 */
router.post('/solicitudes/:id/rechazar', rechazarDirector); //Poner authToken

/**
 * @openapi
 * /validacion/solicitudes/{id}/devolver:
 *   post:
 *     summary: Devolver al solicitante (motivo obligatorio; deja la solicitud en PENDIENTE y actualiza fechas)
 *     tags: [Validacion]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo_decision]
 *             properties:
 *               motivo_decision: { type: string }
 *     responses:
 *       '200':
 *         description: Solicitud devuelta (estado PENDIENTE)
 */
router.post('/solicitudes/:id/devolver',  devolverDirector) //Poner authToken
export default router;
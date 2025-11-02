import express from 'express';
import { revisar } from '../controllers/validacionController.js';

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

export default router;
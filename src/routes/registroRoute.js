import express from 'express';
import { 
  registrarPacienteController, 
  registrarMedicoController 
} from '../controllers/registroController.js';
import { authenticateToken } from '../middlewares/auth.js'; // Middleware de autenticación

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Registro
 *     description: Endpoints para registrar pacientes y médicos
 */

/**
 * @swagger
 * /register/paciente:
 *   post:
 *     summary: Registro de paciente (público - no requiere autenticación)
 *     tags: [Registro]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *               paciente:
 *                 type: object
 *                 properties:
 *                   nombres:
 *                     type: string
 *                   apellidos:
 *                     type: string
 *                   numero_identificacion:
 *                     type: string
 *                   tipo_identificacion:
 *                     type: string
 *                   telefono:
 *                     type: string
 *                   tipo_sangre:
 *                     type: string
 *                   alergias:
 *                     type: array
 *                     items:
 *                       type: string
 *                   fecha_nacimiento:
 *                     type: string
 *                     format: date
 *                   genero:
 *                     type: string
 *     responses:
 *       201:
 *         description: Solicitud de registro enviada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     solicitud_id:
 *                       type: string
 *                     estado:
 *                       type: string
 *                     paciente:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         nombres:
 *                           type: string
 *                         apellidos:
 *                           type: string
 *                         numero_identificacion:
 *                           type: string
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         activo:
 *                           type: boolean
 *                 fecha_solicitud:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Datos incompletos o inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post('/paciente', registrarPacienteController);

/**
 * @swagger
 * /register/medico:
 *   post:
 *     summary: Registro de médico (requiere autenticación como admin)
 *     tags: [Registro]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *               medico:
 *                 type: object
 *                 properties:
 *                   nombres:
 *                     type: string
 *                   apellidos:
 *                     type: string
 *                   numero_identificacion:
 *                     type: string
 *                   especialidad:
 *                     type: string
 *                   registro_medico:
 *                     type: string
 *                   telefono:
 *                     type: string
 *                   costo_consulta_presencial:
 *                     type: number
 *                     format: float
 *                   costo_consulta_virtual:
 *                     type: number
 *                     format: float
 *                   localidad:
 *                     type: string
 *                   disponible:
 *                     type: boolean
 *     responses:
 *       201:
 *         description: Médico registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         rol:
 *                           type: string
 *                         activo:
 *                           type: boolean
 *                     medico:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         nombres:
 *                           type: string
 *                         apellidos:
 *                           type: string
 *                         especialidad:
 *                           type: string
 *                         registro_medico:
 *                           type: string
 *       400:
 *         description: Datos incompletos o inválidos
 *       401:
 *         description: No autorizado (requiere autenticación como admin)
 *       500:
 *         description: Error interno del servidor
 */
router.post('/medico', authenticateToken, registrarMedicoController);

export default router;
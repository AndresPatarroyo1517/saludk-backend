import { Router } from 'express';
import historialMedicoController from '../controllers/historialMedicoController.js';
import { requireMedico } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * NOTA IMPORTANTE:
 * Todas estas rutas usan requireMedico que:
 * 1. Verifica que el usuario esté autenticado
 * 2. Verifica que tenga rol MEDICO
 * 3. Carga automáticamente los datos del médico en req.user
 * 
 * Estructura de req.user después del middleware:
 * req.user = {
 *   userId: UUID,
 *   email: string,
 *   rol: 'MEDICO',
 *   medico: {
 *     id: UUID,
 *     nombres: string,
 *     apellidos: string,
 *     especialidad: string,
 *     registro_medico: string
 *   }
 * }
 */

// Aplicar middleware de autenticación y rol de médico a todas las rutas
router.use(requireMedico);

/**
 * @swagger
 * components:
 *   schemas:
 *     EnfermedadCronica:
 *       type: object
 *       required:
 *         - nombre
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre de la enfermedad
 *           example: "Diabetes Mellitus Tipo 2"
 *         desde:
 *           type: string
 *           format: date
 *           description: Fecha de diagnóstico (YYYY-MM-DD)
 *           example: "2020-05-15"
 *         tratamiento:
 *           type: string
 *           description: Tratamiento actual
 *           example: "Metformina 850mg cada 12 horas"
 *         estado:
 *           type: string
 *           enum: [activa, controlada, en_remision]
 *           description: Estado actual de la enfermedad
 *           example: "controlada"
 * 
 *     CirugiaPrevias:
 *       type: object
 *       required:
 *         - nombre
 *         - fecha
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre de la cirugía
 *           example: "Apendicectomía"
 *         fecha:
 *           type: string
 *           format: date
 *           description: Fecha de la cirugía (YYYY-MM-DD)
 *           example: "2018-03-20"
 *         hospital:
 *           type: string
 *           description: Hospital donde se realizó
 *           example: "Hospital San Ignacio"
 *         complicaciones:
 *           type: string
 *           description: Complicaciones presentadas
 *           example: "Ninguna"
 * 
 *     MedicamentoActual:
 *       type: object
 *       required:
 *         - nombre
 *         - dosis
 *         - frecuencia
 *       properties:
 *         nombre:
 *           type: string
 *           description: Nombre del medicamento
 *           example: "Losartán"
 *         dosis:
 *           type: string
 *           description: Dosis del medicamento
 *           example: "50mg"
 *         frecuencia:
 *           type: string
 *           description: Frecuencia de administración
 *           example: "Cada 24 horas"
 *         desde:
 *           type: string
 *           format: date
 *           description: Fecha de inicio del tratamiento
 *           example: "2023-01-10"
 *         prescrito_por:
 *           type: string
 *           description: Médico que prescribió
 *           example: "Dr. Juan Pérez"
 * 
 *     HistorialMedico:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID del historial
 *         paciente_id:
 *           type: string
 *           format: uuid
 *           description: ID del paciente
 *         enfermedades_cronicas:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EnfermedadCronica'
 *         cirugias_previas:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CirugiaPrevias'
 *         medicamentos_actuales:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MedicamentoActual'
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 * 
 *     HistorialMedicoInput:
 *       type: object
 *       properties:
 *         enfermedades_cronicas:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EnfermedadCronica'
 *         cirugias_previas:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CirugiaPrevias'
 *         medicamentos_actuales:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MedicamentoActual'
 * 
 *     PacienteResumen:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         nombres:
 *           type: string
 *         apellidos:
 *           type: string
 *         numero_identificacion:
 *           type: string
 *         tipo_sangre:
 *           type: string
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *         historial_medico:
 *           $ref: '#/components/schemas/HistorialMedico'
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error al procesar la solicitud"
 *         error:
 *           type: string
 * 
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /historialMedico/pacientes:
 *   get:
 *     summary: Obtener todos los pacientes del médico autenticado
 *     description: Retorna la lista de pacientes que han tenido al menos una cita con el médico, incluyendo sus historiales médicos
 *     tags: [Historial Médico]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pacientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PacienteResumen'
 *                 total:
 *                   type: integer
 *                   example: 5
 *             example:
 *               success: true
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombres: "María José"
 *                   apellidos: "González Pérez"
 *                   numero_identificacion: "1234567890"
 *                   tipo_sangre: "O+"
 *                   fecha_nacimiento: "1985-06-15"
 *                   historial_medico:
 *                     id: "660e8400-e29b-41d4-a716-446655440000"
 *                     enfermedades_cronicas:
 *                       - nombre: "Hipertensión"
 *                         desde: "2020-01-10"
 *                         tratamiento: "Losartán 50mg"
 *                         estado: "controlada"
 *               total: 1
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No autorizado (no es médico)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/pacientes', historialMedicoController.obtenerPacientesConHistorial);

/**
 * @swagger
 * /historialMedico/pacientes/{pacienteId}/historial:
 *   get:
 *     summary: Obtener historial médico completo de un paciente
 *     description: Retorna el historial médico detallado del paciente, incluyendo resultados de consultas, recetas activas y exámenes. Solo accesible si el médico tiene al menos una cita con el paciente.
 *     tags: [Historial Médico]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del paciente
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Historial médico obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/HistorialMedico'
 *             example:
 *               success: true
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 paciente_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 enfermedades_cronicas:
 *                   - nombre: "Diabetes Mellitus Tipo 2"
 *                     desde: "2020-05-15"
 *                     tratamiento: "Metformina 850mg cada 12 horas"
 *                     estado: "controlada"
 *                 cirugias_previas:
 *                   - nombre: "Apendicectomía"
 *                     fecha: "2018-03-20"
 *                     hospital: "Hospital San Ignacio"
 *                     complicaciones: "Ninguna"
 *                 medicamentos_actuales:
 *                   - nombre: "Losartán"
 *                     dosis: "50mg"
 *                     frecuencia: "Cada 24 horas"
 *                     desde: "2023-01-10"
 *                     prescrito_por: "Dr. Juan Pérez"
 *                 paciente:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   nombres: "María José"
 *                   apellidos: "González Pérez"
 *                   numero_identificacion: "1234567890"
 *                   tipo_sangre: "O+"
 *                 fecha_creacion: "2023-01-15T10:30:00.000Z"
 *                 fecha_actualizacion: "2024-11-10T15:20:00.000Z"
 *       400:
 *         description: ID del paciente inválido o faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No autorizado para acceder a este historial
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "No tienes autorización para acceder a este historial. Debe existir al menos una cita con este paciente."
 *       404:
 *         description: Historial no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Este paciente aún no tiene historial médico registrado"
 */
router.get('/pacientes/:pacienteId/historial', historialMedicoController.obtenerHistorial);

/**
 * @swagger
 * /historialMedico/pacientes/{pacienteId}/historial:
 *   post:
 *     summary: Crear o actualizar historial médico completo (UPSERT)
 *     description: Crea un nuevo historial médico si no existe, o actualiza el existente con los datos proporcionados. Solo accesible si el médico tiene al menos una cita con el paciente.
 *     tags: [Historial Médico]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del paciente
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HistorialMedicoInput'
 *           example:
 *             enfermedades_cronicas:
 *               - nombre: "Diabetes Mellitus Tipo 2"
 *                 desde: "2020-05-15"
 *                 tratamiento: "Metformina 850mg cada 12 horas"
 *                 estado: "controlada"
 *               - nombre: "Hipertensión Arterial"
 *                 desde: "2019-08-20"
 *                 tratamiento: "Losartán 50mg diarios"
 *                 estado: "controlada"
 *             cirugias_previas:
 *               - nombre: "Apendicectomía"
 *                 fecha: "2018-03-20"
 *                 hospital: "Hospital San Ignacio"
 *                 complicaciones: "Ninguna"
 *             medicamentos_actuales:
 *               - nombre: "Metformina"
 *                 dosis: "850mg"
 *                 frecuencia: "Cada 12 horas con alimentos"
 *                 desde: "2020-05-15"
 *                 prescrito_por: "Dr. Carlos Ramírez"
 *               - nombre: "Losartán"
 *                 dosis: "50mg"
 *                 frecuencia: "Una vez al día por la mañana"
 *                 desde: "2019-08-20"
 *                 prescrito_por: "Dr. Ana Martínez"
 *     responses:
 *       200:
 *         description: Historial médico guardado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Historial médico guardado exitosamente"
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 paciente_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 enfermedades_cronicas:
 *                   - nombre: "Diabetes Mellitus Tipo 2"
 *                     desde: "2020-05-15"
 *                     tratamiento: "Metformina 850mg cada 12 horas"
 *                     estado: "controlada"
 *                 fecha_actualizacion: "2024-11-15T16:45:00.000Z"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "La fecha 'desde' debe estar en formato YYYY-MM-DD"
 *       403:
 *         description: No autorizado para modificar este historial
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/pacientes/:pacienteId/historial', historialMedicoController.crearOActualizarHistorial);

/**
 * @swagger
 * /historialMedico/pacientes/{pacienteId}/historial:
 *   put:
 *     summary: Crear o actualizar historial médico completo (UPSERT) - Alias de POST
 *     description: Crea un nuevo historial médico si no existe, o actualiza el existente con los datos proporcionados. Funcionalmente idéntico al endpoint POST.
 *     tags: [Historial Médico]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del paciente
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HistorialMedicoInput'
 *     responses:
 *       200:
 *         description: Historial médico guardado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No autorizado para modificar este historial
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/pacientes/:pacienteId/historial', historialMedicoController.crearOActualizarHistorial);

/**
 * @swagger
 * /historialMedico/pacientes/{pacienteId}/historial:
 *   patch:
 *     summary: Actualizar parcialmente el historial médico
 *     description: Actualiza solo los campos específicos del historial médico que se envíen en el body. Requiere que el historial ya exista.
 *     tags: [Historial Médico]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del paciente
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enfermedades_cronicas:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/EnfermedadCronica'
 *               cirugias_previas:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/CirugiaPrevias'
 *               medicamentos_actuales:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/MedicamentoActual'
 *           examples:
 *             actualizarSoloMedicamentos:
 *               summary: Actualizar solo medicamentos
 *               value:
 *                 medicamentos_actuales:
 *                   - nombre: "Atorvastatina"
 *                     dosis: "20mg"
 *                     frecuencia: "Una vez al día por la noche"
 *                     desde: "2024-11-15"
 *                     prescrito_por: "Dr. Pedro López"
 *             agregarEnfermedad:
 *               summary: Agregar nueva enfermedad crónica
 *               value:
 *                 enfermedades_cronicas:
 *                   - nombre: "Diabetes Mellitus Tipo 2"
 *                     desde: "2020-05-15"
 *                     tratamiento: "Metformina 850mg"
 *                     estado: "controlada"
 *                   - nombre: "Hipotiroidismo"
 *                     desde: "2024-11-01"
 *                     tratamiento: "Levotiroxina 75mcg"
 *                     estado: "activa"
 *     responses:
 *       200:
 *         description: Historial médico actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Historial médico actualizado exitosamente"
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440000"
 *                 paciente_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 medicamentos_actuales:
 *                   - nombre: "Atorvastatina"
 *                     dosis: "20mg"
 *                     frecuencia: "Una vez al día por la noche"
 *                 fecha_actualizacion: "2024-11-15T17:30:00.000Z"
 *       400:
 *         description: Datos inválidos o body vacío
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Debe enviar al menos un campo para actualizar"
 *       403:
 *         description: No autorizado para modificar este historial
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: El paciente no tiene historial médico
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Este paciente no tiene historial médico. Debe crearlo primero."
 */
router.patch('/pacientes/:pacienteId/historial', historialMedicoController.actualizarHistorialParcial);

export default router;
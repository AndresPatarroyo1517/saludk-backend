import express from 'express';
import CitaController from '../controllers/citasController.js';

const router = express.Router();
const controller = new CitaController();

/**
 * @swagger
 * /citas/disponibilidad/{medicoId}:
 *   get:
 *     summary: Obtener disponibilidad de un médico para agendar citas
 *     description: Retorna todos los slots de tiempo disponibles y ocupados de un médico en un rango de fechas específico
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del médico
 *         example: 0336963c-9912-4dda-92c0-eedd85a06581
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango (formato YYYY-MM-DD)
 *         example: 2025-11-10
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango (formato YYYY-MM-DD)
 *         example: 2025-11-17
 *       - in: query
 *         name: modalidad
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PRESENCIAL, VIRTUAL]
 *         description: Filtrar por modalidad de consulta (opcional)
 *         example: VIRTUAL
 *       - in: query
 *         name: duracion_cita
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 240
 *           default: 30
 *         description: Duración de cada cita en minutos
 *         example: 30
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     medico_id:
 *                       type: string
 *                       format: uuid
 *                       example: 0336963c-9912-4dda-92c0-eedd85a06581
 *                     fecha_inicio:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-10T00:00:00.000Z
 *                     fecha_fin:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-17T00:00:00.000Z
 *                     duracion_cita_minutos:
 *                       type: integer
 *                       example: 30
 *                     disponibilidad:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fecha_hora_inicio:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-11-10T09:00:00.000Z
 *                           fecha_hora_fin:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-11-10T09:30:00.000Z
 *                           disponible:
 *                             type: boolean
 *                             example: true
 *                           modalidad:
 *                             type: string
 *                             enum: [PRESENCIAL, VIRTUAL]
 *                             example: VIRTUAL
 *             examples:
 *               conDisponibilidad:
 *                 summary: Médico con slots disponibles
 *                 value:
 *                   success: true
 *                   data:
 *                     medico_id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                     fecha_inicio: 2025-11-10T00:00:00.000Z
 *                     fecha_fin: 2025-11-17T00:00:00.000Z
 *                     duracion_cita_minutos: 30
 *                     disponibilidad:
 *                       - fecha_hora_inicio: 2025-11-10T09:00:00.000Z
 *                         fecha_hora_fin: 2025-11-10T09:30:00.000Z
 *                         disponible: true
 *                         modalidad: VIRTUAL
 *                       - fecha_hora_inicio: 2025-11-10T09:30:00.000Z
 *                         fecha_hora_fin: 2025-11-10T10:00:00.000Z
 *                         disponible: false
 *                         modalidad: VIRTUAL
 *               sinDisponibilidad:
 *                 summary: Médico sin horarios configurados
 *                 value:
 *                   success: true
 *                   data:
 *                     medico_id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                     disponibilidad: []
 *                     mensaje: El médico no tiene horarios configurados
 *       400:
 *         description: Parámetros inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               parametrosFaltantes:
 *                 summary: Faltan parámetros requeridos
 *                 value:
 *                   error: Los parámetros fecha_inicio y fecha_fin son requeridos
 *                   ejemplo: ?fecha_inicio=2025-11-10&fecha_fin=2025-11-17
 *               fechaInvalida:
 *                 summary: Formato de fecha incorrecto
 *                 value:
 *                   error: Formato de fecha inválido. Use formato ISO YYYY-MM-DD
 *               rangoExcedido:
 *                 summary: Rango de fechas muy amplio
 *                 value:
 *                   error: El rango máximo permitido es de 30 días
 *       404:
 *         description: Médico no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Médico no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener disponibilidad del médico
 *                 mensaje:
 *                   type: string
 */
router.get('/disponibilidad/:medicoId', controller.obtenerDisponibilidad);

/**
 * @swagger
 * /citas/disponibilidad/{medicoId}/validar:
 *   post:
 *     summary: Validar disponibilidad de un slot específico antes de agendar
 *     description: Verifica si un slot de tiempo específico está disponible para agendar una cita
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del médico
 *         example: 0336963c-9912-4dda-92c0-eedd85a06581
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fecha_hora
 *             properties:
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora del slot a validar (formato ISO 8601)
 *                 example: 2025-11-10T10:00:00
 *               duracion_minutos:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 240
 *                 default: 30
 *                 description: Duración de la cita en minutos
 *                 example: 30
 *           examples:
 *             validacionBasica:
 *               summary: Validación con duración por defecto
 *               value:
 *                 fecha_hora: 2025-11-10T10:00:00
 *             validacionPersonalizada:
 *               summary: Validación con duración personalizada
 *               value:
 *                 fecha_hora: 2025-11-10T14:30:00
 *                 duracion_minutos: 60
 *     responses:
 *       200:
 *         description: Validación realizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     disponible:
 *                       type: boolean
 *                     modalidad:
 *                       type: string
 *                       enum: [PRESENCIAL, VIRTUAL]
 *                     motivo:
 *                       type: string
 *                       description: Solo presente cuando disponible es false
 *             examples:
 *               slotDisponible:
 *                 summary: Slot disponible para agendar
 *                 value:
 *                   success: true
 *                   data:
 *                     disponible: true
 *                     modalidad: VIRTUAL
 *               slotOcupado:
 *                 summary: Slot ya ocupado
 *                 value:
 *                   success: true
 *                   data:
 *                     disponible: false
 *                     motivo: Ya existe una cita agendada en este horario
 *               fechaPasada:
 *                 summary: Fecha en el pasado
 *                 value:
 *                   success: true
 *                   data:
 *                     disponible: false
 *                     motivo: La fecha debe ser futura
 *               fueraDeHorario:
 *                 summary: Fuera del horario configurado
 *                 value:
 *                   success: true
 *                   data:
 *                     disponible: false
 *                     motivo: El médico no tiene disponibilidad configurada para este horario
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               fechaFaltante:
 *                 summary: Falta el parámetro fecha_hora
 *                 value:
 *                   error: El parámetro fecha_hora es requerido
 *               fechaInvalida:
 *                 summary: Formato de fecha incorrecto
 *                 value:
 *                   error: Formato de fecha_hora inválido. Use formato ISO YYYY-MM-DDTHH:mm:ss
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al validar disponibilidad
 */
router.post('/disponibilidad/:medicoId/validar', controller.validarSlot);

/**
 * @swagger
 * /citas/disponibilidad/{medicoId}/proximos-slots:
 *   get:
 *     summary: Obtener los próximos slots disponibles para agendar
 *     description: Retorna los próximos N slots disponibles del médico en los próximos 30 días
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del médico
 *         example: 0336963c-9912-4dda-92c0-eedd85a06581
 *       - in: query
 *         name: cantidad
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Cantidad de slots a retornar
 *         example: 10
 *       - in: query
 *         name: modalidad
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PRESENCIAL, VIRTUAL]
 *         description: Filtrar por modalidad de consulta (opcional)
 *         example: VIRTUAL
 *     responses:
 *       200:
 *         description: Próximos slots obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     medico_id:
 *                       type: string
 *                       format: uuid
 *                       example: 0336963c-9912-4dda-92c0-eedd85a06581
 *                     cantidad_solicitada:
 *                       type: integer
 *                       example: 10
 *                     cantidad_encontrada:
 *                       type: integer
 *                       example: 8
 *                       description: Puede ser menor si no hay suficientes slots disponibles
 *                     slots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fecha_hora_inicio:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-11-10T09:00:00.000Z
 *                           fecha_hora_fin:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-11-10T09:30:00.000Z
 *                           disponible:
 *                             type: boolean
 *                             example: true
 *                           modalidad:
 *                             type: string
 *                             enum: [PRESENCIAL, VIRTUAL]
 *                             example: VIRTUAL
 *             examples:
 *               exito:
 *                 summary: Respuesta exitosa con slots
 *                 value:
 *                   success: true
 *                   data:
 *                     medico_id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                     cantidad_solicitada: 5
 *                     cantidad_encontrada: 5
 *                     slots:
 *                       - fecha_hora_inicio: 2025-11-10T09:00:00.000Z
 *                         fecha_hora_fin: 2025-11-10T09:30:00.000Z
 *                         disponible: true
 *                         modalidad: VIRTUAL
 *                       - fecha_hora_inicio: 2025-11-10T09:30:00.000Z
 *                         fecha_hora_fin: 2025-11-10T10:00:00.000Z
 *                         disponible: true
 *                         modalidad: VIRTUAL
 *               pocosSlots:
 *                 summary: Menos slots de los solicitados
 *                 value:
 *                   success: true
 *                   data:
 *                     medico_id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                     cantidad_solicitada: 10
 *                     cantidad_encontrada: 3
 *                     slots:
 *                       - fecha_hora_inicio: 2025-11-15T14:00:00.000Z
 *                         fecha_hora_fin: 2025-11-15T14:30:00.000Z
 *                         disponible: true
 *                         modalidad: PRESENCIAL
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: La cantidad debe ser entre 1 y 50
 *       404:
 *         description: Médico no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Médico no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error al obtener próximos slots
 */
router.get('/disponibilidad/:medicoId/proximos-slots', controller.obtenerProximosSlots);
/**
 * @swagger
 * /citas:
 *   post:
 *     summary: Crear una nueva cita médica
 *     description: Crea una cita entre un médico y un paciente con validaciones de disponibilidad, modalidad y existencia del médico.
 *     tags:
 *       - Citas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medico_id
 *               - paciente_id
 *               - fecha_hora
 *               - modalidad
 *             properties:
 *               medico_id:
 *                 type: integer
 *                 example: 3
 *                 description: ID del médico que atenderá la cita.
 *               paciente_id:
 *                 type: integer
 *                 example: 12
 *                 description: ID del paciente que agenda la cita.
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-15T14:30:00Z"
 *                 description: Fecha y hora de la cita (en formato ISO 8601).
 *               modalidad:
 *                 type: string
 *                 enum: [PRESENCIAL, VIRTUAL]
 *                 example: PRESENCIAL
 *                 description: Modalidad de la cita.
 *               motivo_consulta:
 *                 type: string
 *                 example: "Dolor de cabeza persistente"
 *                 description: Motivo o razón de la consulta médica.
 *               duracion_minutos:
 *                 type: integer
 *                 example: 30
 *                 description: Duración estimada de la cita en minutos (por defecto 30).
 *     responses:
 *       201:
 *         description: Cita creada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mensaje:
 *                   type: string
 *                   example: "Cita creada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 45
 *                     paciente_id:
 *                       type: integer
 *                       example: 12
 *                     medico_id:
 *                       type: integer
 *                       example: 3
 *                     fecha_hora:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-15T14:30:00Z"
 *                     modalidad:
 *                       type: string
 *                       example: "PRESENCIAL"
 *                     estado:
 *                       type: string
 *                       example: "AGENDADA"
 *                     motivo_consulta:
 *                       type: string
 *                       example: "Dolor de cabeza persistente"
 *                     enlace_virtual:
 *                       type: string
 *                       nullable: true
 *                       example: "https://videollamada.example.com/abc123"
 *                     duracion_estimada_minutos:
 *                       type: integer
 *                       example: 30
 *       400:
 *         description: Error en la solicitud (faltan campos requeridos o datos inválidos).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El campo medico_id es requerido"
 *       404:
 *         description: No se encontró el recurso (por ejemplo, médico no existente).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Médico no encontrado"
 *       500:
 *         description: Error interno del servidor al crear la cita.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al crear la cita"
 *                 mensaje:
 *                   type: string
 *                   example: "Error inesperado en la base de datos"
 */

router.post('/', controller.crearCita);

export default router;
import express from 'express';
import CitaController from '../controllers/citasController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";

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

/**
 * @swagger
 * /citas/paciente/{pacienteId}:
 *   get:
 *     summary: Obtener todas las citas de un paciente
 *     description: Retorna un listado completo de citas del paciente con información del médico, filtros opcionales por estado, fecha, modalidad y opciones de ordenamiento.
 *     tags:
 *       - Citas
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del paciente
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *       - in: query
 *         name: estado
 *         required: false
 *         schema:
 *           type: string
 *           enum: [AGENDADA, CONFIRMADA, COMPLETADA, CANCELADA]
 *         description: Filtrar por estado de la cita
 *         example: AGENDADA
 *       - in: query
 *         name: fecha_desde
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar citas desde esta fecha (YYYY-MM-DD)
 *         example: "2025-11-10"
 *       - in: query
 *         name: fecha_hasta
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar citas hasta esta fecha (YYYY-MM-DD)
 *         example: "2025-12-10"
 *       - in: query
 *         name: modalidad
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PRESENCIAL, VIRTUAL]
 *         description: Filtrar por modalidad de consulta
 *         example: VIRTUAL
 *       - in: query
 *         name: ordenar_por
 *         required: false
 *         schema:
 *           type: string
 *           enum: [fecha_hora, fecha_hora_asc, estado]
 *           default: "fecha_hora"
 *         description: |
 *           Campo por el cual ordenar los resultados:
 *           - **fecha_hora**: Ordenar por fecha descendente (más recientes primero)
 *           - **fecha_hora_asc**: Ordenar por fecha ascendente (próximas primero)
 *           - **estado**: Ordenar por estado y luego por fecha
 *         example: "fecha_hora_asc"
 *     responses:
 *       200:
 *         description: Citas obtenidas exitosamente
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
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     total_citas:
 *                       type: integer
 *                       example: 5
 *                     citas:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           paciente_id:
 *                             type: string
 *                             format: uuid
 *                           medico_id:
 *                             type: string
 *                             format: uuid
 *                           medico:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               nombres:
 *                                 type: string
 *                               apellidos:
 *                                 type: string
 *                               especialidad:
 *                                 type: string
 *                               calificacion_promedio:
 *                                 type: number
 *                           fecha_hora:
 *                             type: string
 *                             format: date-time
 *                           modalidad:
 *                             type: string
 *                             enum: [PRESENCIAL, VIRTUAL]
 *                           estado:
 *                             type: string
 *                             enum: [AGENDADA, CONFIRMADA, COMPLETADA, CANCELADA]
 *                           motivo_consulta:
 *                             type: string
 *                             nullable: true
 *                           enlace_virtual:
 *                             type: string
 *                             nullable: true
 *                           notas_consulta:
 *                             type: string
 *                             nullable: true
 *                           costo_pagado:
 *                             type: number
 *                             nullable: true
 *                           fecha_creacion:
 *                             type: string
 *                             format: date-time
 *                           fecha_actualizacion:
 *                             type: string
 *                             format: date-time
 *             examples:
 *               conCitas:
 *                 summary: Paciente con citas
 *                 value:
 *                   success: true
 *                   data:
 *                     paciente_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     total_citas: 2
 *                     citas:
 *                       - id: "660e8400-e29b-41d4-a716-446655440001"
 *                         paciente_id: "550e8400-e29b-41d4-a716-446655440000"
 *                         medico_id: "0336963c-9912-4dda-92c0-eedd85a06581"
 *                         medico:
 *                           id: "0336963c-9912-4dda-92c0-eedd85a06581"
 *                           nombres: "Juan"
 *                           apellidos: "García"
 *                           especialidad: "Cardiología"
 *                           calificacion_promedio: 4.8
 *                         fecha_hora: "2025-11-15T10:30:00.000Z"
 *                         modalidad: "VIRTUAL"
 *                         estado: "AGENDADA"
 *                         motivo_consulta: "Chequeo general"
 *                         enlace_virtual: "https://meet.tuapp.com/abc123"
 *                         notas_consulta: null
 *                         costo_pagado: null
 *                         fecha_creacion: "2025-11-10T08:00:00.000Z"
 *                         fecha_actualizacion: "2025-11-10T08:00:00.000Z"
 *               sinCitas:
 *                 summary: Paciente sin citas
 *                 value:
 *                   success: true
 *                   data:
 *                     paciente_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     total_citas: 0
 *                     citas: []
 *       400:
 *         description: Parámetro pacienteId faltante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El parámetro pacienteId es requerido"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al obtener las citas del paciente"
 */
router.get('/paciente/:pacienteId', controller.obtenerCitasPaciente);

/**
 * @swagger
 * /citas/{citaId}/cancelar:
 *   delete:
 *     summary: Cancelar una cita médica
 *     description: |
 *       Cancela una cita existente con validaciones importantes:
 *       - Solo se pueden cancelar citas en estado AGENDADA o CONFIRMADA
 *       - Debe haber al menos 24 horas de anticipación
 *       - Se registra el motivo de cancelación (opcional)
 *       
 *       **Estados de cita permitidos para cancelación:**
 *       - AGENDADA - Cita recién creada
 *       - CONFIRMADA - Cita confirmada por ambas partes
 *       
 *       **No se pueden cancelar citas en estos estados:**
 *       - COMPLETADA - Cita ya realizada
 *       - CANCELADA - Cita ya cancelada
 *     tags:
 *       - Citas
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la cita a cancelar
 *         example: "660e8400-e29b-41d4-a716-446655440001"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo_cancelacion:
 *                 type: string
 *                 description: Motivo por el cual se cancela la cita (opcional)
 *                 example: "Cambio de planes"
 *           examples:
 *             conMotivo:
 *               summary: Cancelación con motivo
 *               value:
 *                 motivo_cancelacion: "Cambio de planes"
 *             sinMotivo:
 *               summary: Cancelación sin motivo
 *               value: {}
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
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
 *                   example: "Cita cancelada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "660e8400-e29b-41d4-a716-446655440001"
 *                     estado:
 *                       type: string
 *                       example: "CANCELADA"
 *                     fecha_hora:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-11-15T10:30:00.000Z"
 *                     medico_id:
 *                       type: string
 *                       format: uuid
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                     mensaje:
 *                       type: string
 *                       example: "Cita cancelada exitosamente"
 *       400:
 *         description: Error de validación (cita no cancelable o sin anticipación)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               estadoInvalido:
 *                 summary: Cita no puede ser cancelada
 *                 value:
 *                   error: "No se puede cancelar una cita en estado COMPLETADA. Solo se pueden cancelar citas en estado AGENDADA o CONFIRMADA"
 *               sinAnticipacion:
 *                 summary: Sin 24 horas de anticipación
 *                 value:
 *                   error: "No se puede cancelar una cita con menos de 24 horas de anticipación. Por favor, comuníquese con la clínica."
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
/**
 * @swagger
 * /citas/{citaId}:
 *   put:
 *     summary: Editar una cita existente
 *     description: Permite editar los detalles de una cita (fecha/hora, modalidad, motivo, notas). Solo se pueden editar citas en estado AGENDADA o CONFIRMADA.
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la cita a editar
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha y hora de la cita (ISO 8601)
 *                 example: "2025-11-20T14:30:00Z"
 *               modalidad:
 *                 type: string
 *                 enum: [PRESENCIAL, VIRTUAL]
 *                 description: Modalidad de la cita
 *                 example: "VIRTUAL"
 *               motivo_consulta:
 *                 type: string
 *                 description: Motivo de la consulta
 *                 example: "Dolor en el brazo izquierdo"
 *     responses:
 *       200:
 *         description: Cita actualizada exitosamente
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
 *                   example: "Cita actualizada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                     medico_id:
 *                       type: string
 *                       format: uuid
 *                     fecha_hora:
 *                       type: string
 *                       format: date-time
 *                     modalidad:
 *                       type: string
 *                       enum: [PRESENCIAL, VIRTUAL]
 *                     estado:
 *                       type: string
 *                       enum: [AGENDADA, CONFIRMADA, COMPLETADA, CANCELADA]
 *                     motivo_consulta:
 *                       type: string
 *                     notas_consulta:
 *                       type: string
 *       400:
 *         description: Solicitud inválida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               sinCampos:
 *                 summary: Sin campos para actualizar
 *                 value:
 *                   error: "Debe proporcionar al menos un campo para actualizar"
 *                   camposPermitidos: ["fecha_hora", "modalidad", "motivo_consulta", "notas_consulta"]
 *               estadoInvalido:
 *                 summary: Cita en estado no editable
 *                 value:
 *                   error: "No se puede editar una cita en estado COMPLETADA"
 *               sinAnticipacion:
 *                 summary: Sin 24 horas de anticipación
 *                 value:
 *                   error: "No se puede agendar o cambiar una cita con menos de 24 horas de anticipación"
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cita no encontrada"
 *       409:
 *         description: Conflicto - Horario no disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "El horario seleccionado no está disponible para el médico"
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:citaId', authMiddleware, controller.editarCita);

/**
 * @swagger
 * /citas/{citaId}/cancelar:
 *   delete:
 *     summary: Cancelar una cita
 *     description: Permite cancelar una cita existente. Solo se pueden cancelar citas en estado AGENDADA o CONFIRMADA con al menos 24 horas de anticipación.
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la cita a cancelar
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo_cancelacion:
 *                 type: string
 *                 description: Motivo de la cancelación (opcional)
 *                 example: "No puedo asistir"
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
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
 *                   example: "Cita cancelada exitosamente"
 *                 data:
 *                   type: object
 *       400:
 *         description: No se puede cancelar la cita
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               estadoInvalido:
 *                 summary: Estado no permitido
 *                 value:
 *                   error: "No se puede cancelar una cita en estado COMPLETADA"
 *               sinAnticipacion:
 *                 summary: Menos de 24 horas
 *                 value:
 *                   error: "No se puede cancelar una cita con menos de 24 horas de anticipación"
 *       404:
 *         description: Cita no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cita no encontrada"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error al cancelar la cita"
 */
router.delete('/:citaId/cancelar', authMiddleware, controller.cancelarCita);

export default router;
// routes/medicoRoutes.js
import express from 'express';
import MedicoController from '../controllers/medicoController.js';

const router = express.Router();
const controller = new MedicoController();

/**
 * @swagger
 * /medicos:
 *   get:
 *     summary: Listar médicos disponibles
 *     description: Obtiene una lista de médicos disponibles con múltiples opciones de filtrado y paginación
 *     tags: [Médicos]
 *     parameters:
 *       - in: query
 *         name: especialidad
 *         schema:
 *           type: string
 *         description: Filtrar por especialidad médica
 *         example: Cardiología
 *       - in: query
 *         name: localidad
 *         schema:
 *           type: string
 *         description: Filtrar por localidad del médico
 *         example: Bogotá
 *       - in: query
 *         name: modalidad
 *         schema:
 *           type: string
 *           enum: [PRESENCIAL, VIRTUAL]
 *         description: Filtrar por modalidad de consulta disponible
 *         example: VIRTUAL
 *       - in: query
 *         name: dia_semana
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Filtrar médicos disponibles en un día específico (0=Domingo, 6=Sábado)
 *         example: 1
 *       - in: query
 *         name: calificacion_minima
 *         schema:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 5
 *         description: Filtrar por calificación mínima
 *         example: 4.0
 *       - in: query
 *         name: costo_maximo
 *         schema:
 *           type: number
 *           format: float
 *         description: Filtrar por costo máximo de consulta
 *         example: 100000
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Buscar por nombre o apellido del médico
 *         example: Juan
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Cantidad de resultados por página
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Número de resultados a saltar
 *         example: 0
 *     responses:
 *       200:
 *         description: Lista de médicos obtenida exitosamente
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
 *                     medicos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           nombres:
 *                             type: string
 *                           apellidos:
 *                             type: string
 *                           nombre_completo:
 *                             type: string
 *                           especialidad:
 *                             type: string
 *                           registro_medico:
 *                             type: string
 *                           calificacion_promedio:
 *                             type: number
 *                           costo_consulta_presencial:
 *                             type: number
 *                           costo_consulta_virtual:
 *                             type: number
 *                           localidad:
 *                             type: string
 *                           telefono:
 *                             type: string
 *                           tiene_disponibilidad:
 *                             type: boolean
 *                           modalidades_disponibles:
 *                             type: array
 *                             items:
 *                               type: string
 *                               enum: [PRESENCIAL, VIRTUAL]
 *                     paginacion:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limite:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         pagina_actual:
 *                           type: integer
 *                         total_paginas:
 *                           type: integer
 *                         tiene_siguiente:
 *                           type: boolean
 *                         tiene_anterior:
 *                           type: boolean
 *                     filtros_aplicados:
 *                       type: object
 *             examples:
 *               sinFiltros:
 *                 summary: Listado sin filtros
 *                 value:
 *                   success: true
 *                   data:
 *                     medicos:
 *                       - id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                         nombres: Juan
 *                         apellidos: Pérez
 *                         nombre_completo: Juan Pérez
 *                         especialidad: Cardiología
 *                         registro_medico: RM-12345
 *                         calificacion_promedio: 4.5
 *                         costo_consulta_presencial: 80000
 *                         costo_consulta_virtual: 50000
 *                         localidad: Bogotá
 *                         telefono: 3001234567
 *                         tiene_disponibilidad: true
 *                         modalidades_disponibles: [PRESENCIAL, VIRTUAL]
 *                     paginacion:
 *                       total: 45
 *                       limite: 50
 *                       offset: 0
 *                       pagina_actual: 1
 *                       total_paginas: 1
 *                       tiene_siguiente: false
 *                       tiene_anterior: false
 *                     filtros_aplicados: {}
 *               conFiltros:
 *                 summary: Listado con filtros aplicados
 *                 value:
 *                   success: true
 *                   data:
 *                     medicos:
 *                       - id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                         nombres: Juan
 *                         apellidos: Pérez
 *                         nombre_completo: Juan Pérez
 *                         especialidad: Cardiología
 *                         calificacion_promedio: 4.8
 *                         modalidades_disponibles: [VIRTUAL]
 *                     paginacion:
 *                       total: 8
 *                       limite: 20
 *                       offset: 0
 *                       pagina_actual: 1
 *                       total_paginas: 1
 *                     filtros_aplicados:
 *                       especialidad: Cardiología
 *                       modalidad: VIRTUAL
 *                       calificacion_minima: 4.0
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
 *               limiteExcedido:
 *                 value:
 *                   error: El límite máximo es 100
 *               diaInvalido:
 *                 value:
 *                   error: El día de semana debe estar entre 0 (Domingo) y 6 (Sábado)
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', controller.listarMedicos);

/**
 * @swagger
 * /medicos/{medicoId}:
 *   get:
 *     summary: Obtener detalle de un médico
 *     description: Obtiene toda la información detallada de un médico específico incluyendo disponibilidad y calificaciones
 *     tags: [Médicos]
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
 *         name: incluir_calificaciones
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir calificaciones recientes
 *         example: true
 *     responses:
 *       200:
 *         description: Detalle del médico obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     numero_identificacion:
 *                       type: string
 *                     nombres:
 *                       type: string
 *                     apellidos:
 *                       type: string
 *                     nombre_completo:
 *                       type: string
 *                     especialidad:
 *                       type: string
 *                     registro_medico:
 *                       type: string
 *                     calificacion_promedio:
 *                       type: number
 *                     costo_consulta_presencial:
 *                       type: number
 *                     costo_consulta_virtual:
 *                       type: number
 *                     localidad:
 *                       type: string
 *                     telefono:
 *                       type: string
 *                     disponible:
 *                       type: boolean
 *                     email:
 *                       type: string
 *                     fecha_registro:
 *                       type: string
 *                       format: date-time
 *                     disponibilidad:
 *                       type: array
 *                       items:
 *                         type: object
 *                     calificaciones_recientes:
 *                       type: array
 *             example:
 *               success: true
 *               data:
 *                 id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                 numero_identificacion: "1234567890"
 *                 nombres: Juan
 *                 apellidos: Pérez
 *                 nombre_completo: Juan Pérez
 *                 especialidad: Cardiología
 *                 registro_medico: RM-12345
 *                 calificacion_promedio: 4.5
 *                 costo_consulta_presencial: 80000
 *                 costo_consulta_virtual: 50000
 *                 localidad: Bogotá
 *                 telefono: "3001234567"
 *                 disponible: true
 *                 email: juan.perez@example.com
 *                 disponibilidad:
 *                   - dia_numero: 2
 *                     dia_nombre: Martes
 *                     bloques:
 *                       - hora_inicio: "08:00:00"
 *                         hora_fin: "20:00:00"
 *                         modalidad: VIRTUAL
 *                         disponible: true
 *                 calificaciones_recientes: []
 *       404:
 *         description: Médico no encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: Médico no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:medicoId', controller.obtenerDetalle);

/**
 * @swagger
 * /medicos/{medicoId}/disponibilidad:
 *   post:
 *     summary: Configurar disponibilidad horaria del médico
 *     description: Permite al médico configurar sus horarios de disponibilidad por día y modalidad. Reemplaza la configuración anterior.
 *     tags: [Médicos]
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
 *               - disponibilidades
 *             properties:
 *               disponibilidades:
 *                 type: array
 *                 description: Array de bloques de disponibilidad
 *                 items:
 *                   type: object
 *                   required:
 *                     - dia_semana
 *                     - hora_inicio
 *                     - hora_fin
 *                     - modalidad
 *                   properties:
 *                     dia_semana:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       description: Día de la semana (0=Domingo, 6=Sábado)
 *                       example: 1
 *                     hora_inicio:
 *                       type: string
 *                       pattern: '^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$'
 *                       description: Hora de inicio (formato HH:mm:ss)
 *                       example: "08:00:00"
 *                     hora_fin:
 *                       type: string
 *                       pattern: '^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$'
 *                       description: Hora de fin (formato HH:mm:ss)
 *                       example: "12:00:00"
 *                     modalidad:
 *                       type: string
 *                       enum: [PRESENCIAL, VIRTUAL]
 *                       description: Modalidad de consulta
 *                       example: VIRTUAL
 *                     disponible:
 *                       type: boolean
 *                       default: true
 *                       description: Si el bloque está activo
 *           examples:
 *             lunesAViernes:
 *               summary: Disponibilidad de lunes a viernes
 *               value:
 *                 disponibilidades:
 *                   - dia_semana: 1
 *                     hora_inicio: "08:00:00"
 *                     hora_fin: "12:00:00"
 *                     modalidad: PRESENCIAL
 *                   - dia_semana: 1
 *                     hora_inicio: "14:00:00"
 *                     hora_fin: "18:00:00"
 *                     modalidad: VIRTUAL
 *                   - dia_semana: 2
 *                     hora_inicio: "08:00:00"
 *                     hora_fin: "20:00:00"
 *                     modalidad: VIRTUAL
 *             semanaCompleta:
 *               summary: Disponibilidad toda la semana
 *               value:
 *                 disponibilidades:
 *                   - dia_semana: 1
 *                     hora_inicio: "09:00:00"
 *                     hora_fin: "17:00:00"
 *                     modalidad: PRESENCIAL
 *                   - dia_semana: 2
 *                     hora_inicio: "09:00:00"
 *                     hora_fin: "17:00:00"
 *                     modalidad: PRESENCIAL
 *                   - dia_semana: 3
 *                     hora_inicio: "09:00:00"
 *                     hora_fin: "17:00:00"
 *                     modalidad: VIRTUAL
 *                   - dia_semana: 4
 *                     hora_inicio: "09:00:00"
 *                     hora_fin: "17:00:00"
 *                     modalidad: VIRTUAL
 *                   - dia_semana: 5
 *                     hora_inicio: "09:00:00"
 *                     hora_fin: "13:00:00"
 *                     modalidad: PRESENCIAL
 *     responses:
 *       201:
 *         description: Disponibilidad configurada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 mensaje:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     medico_id:
 *                       type: string
 *                       format: uuid
 *                     total_bloques:
 *                       type: integer
 *                     disponibilidades:
 *                       type: array
 *             example:
 *               success: true
 *               mensaje: Disponibilidad configurada exitosamente
 *               data:
 *                 medico_id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                 total_bloques: 5
 *                 disponibilidades: []
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             examples:
 *               campoRequerido:
 *                 value:
 *                   error: El campo disponibilidades es requerido
 *               validacion:
 *                 value:
 *                   error: "Disponibilidad 1: hora_inicio es requerido"
 *       404:
 *         description: Médico no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/:medicoId/disponibilidad', controller.configurarDisponibilidad);

/**
 * @swagger
 * /medicos/{medicoId}/disponibilidad:
 *   get:
 *     summary: Obtener disponibilidad configurada del médico
 *     description: Retorna la disponibilidad horaria configurada del médico agrupada por día de semana
 *     tags: [Médicos]
 *     parameters:
 *       - in: path
 *         name: medicoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID del médico
 *         example: 0336963c-9912-4dda-92c0-eedd85a06581
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     medico_id:
 *                       type: string
 *                       format: uuid
 *                     nombre_completo:
 *                       type: string
 *                     disponibilidad_por_dia:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           dia_numero:
 *                             type: integer
 *                           dia_nombre:
 *                             type: string
 *                           bloques:
 *                             type: array
 *                     total_bloques:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 medico_id: 0336963c-9912-4dda-92c0-eedd85a06581
 *                 nombre_completo: Juan Pérez
 *                 disponibilidad_por_dia:
 *                   - dia_numero: 1
 *                     dia_nombre: Lunes
 *                     bloques:
 *                       - id: 910ba040-599f-4c8d-b612-1b597349a738
 *                         hora_inicio: "08:00:00"
 *                         hora_fin: "12:00:00"
 *                         modalidad: PRESENCIAL
 *                         disponible: true
 *                   - dia_numero: 2
 *                     dia_nombre: Martes
 *                     bloques:
 *                       - hora_inicio: "08:00:00"
 *                         hora_fin: "20:00:00"
 *                         modalidad: VIRTUAL
 *                         disponible: true
 *                 total_bloques: 2
 *       404:
 *         description: Médico no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:medicoId/disponibilidad', controller.obtenerDisponibilidad);

export default router;
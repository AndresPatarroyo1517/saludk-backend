import express from 'express';
import multer from 'multer';
import registroController from '../controllers/registroController.js';
import { requireDirector } from '../middlewares/authMiddleware.js';
import rateLimiter from '../middlewares/rateLimiter.js';
import {
  validate,
  registroPacienteSchema,
  registroMedicoSchema,
  decisionSolicitudSchema
} from '../validators/registroValidator.js';

const router = express.Router();

// Configurar multer para archivos temporales
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG, PNG'));
    }
  }
});

/**
 * @swagger
 * tags:
 *   - name: Registro
 *     description: Endpoints para registro de pacientes y médicos
 *   - name: Solicitudes
 *     description: Gestión de solicitudes de registro (Director Médico)
 *   - name: Documentos
 *     description: Subida y gestión de documentos para solicitudes
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: |
 *         Token JWT en el header Authorization.
 *         Formato: `Bearer {token}`
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: accessToken
 *       description: |
 *         Token JWT almacenado en cookie httpOnly.
 *         Se envía automáticamente en cada request.
 *   
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "juan.perez@mail.com"
 *           description: Email único del usuario
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: "MiPassword123!"
 *           description: |
 *             Contraseña segura. Debe cumplir:
 *             - Mínimo 8 caracteres
 *             - Al menos 1 mayúscula
 *             - Al menos 1 minúscula
 *             - Al menos 1 número
 *             - Al menos 1 carácter especial
 *     
 *     Paciente:
 *       type: object
 *       required:
 *         - nombres
 *         - apellidos
 *         - numero_identificacion
 *         - tipo_identificacion
 *       properties:
 *         nombres:
 *           type: string
 *           example: "Juan Carlos"
 *           description: Nombres completos del paciente
 *         apellidos:
 *           type: string
 *           example: "Pérez López"
 *           description: Apellidos completos del paciente
 *         numero_identificacion:
 *           type: string
 *           example: "1234567890"
 *           description: Número de documento de identificación (único)
 *         tipo_identificacion:
 *           type: string
 *           enum: [CC, CAE, TIN, CE, PAS, NIE]
 *           example: "CC"
 *           description: |
 *             Tipo de identificación:
 *             - **CC**: Cédula de Ciudadanía (ciudadanos colombianos)
 *             - **CAE**: Carné de Afiliación EPS (afiliados a EPS)
 *             - **TIN**: Tarjeta de Identidad Niño (menores de edad)
 *             - **CE**: Cédula de Extranjería (extranjeros residentes)
 *             - **PAS**: Pasaporte (extranjeros temporales/turistas)
 *             - **NIE**: Número de Identificación de Extranjeros (estatus migratorio especial)
 *         telefono:
 *           type: string
 *           example: "3001234567"
 *           description: Número de teléfono celular (opcional)
 *         tipo_sangre:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *           example: "O+"
 *           description: Tipo de sangre (opcional)
 *         alergias:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Polen", "Ácaros", "Penicilina"]
 *           description: Lista de alergias conocidas (opcional)
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           example: "1990-01-15"
 *           description: |
 *             Fecha de nacimiento en formato YYYY-MM-DD.
 *             **Validación**: Debe ser mayor de 18 años
 *         genero:
 *           type: string
 *           example: "Masculino"
 *           description: Género del paciente (opcional)
 *     
 *     Direccion:
 *       type: object
 *       required:
 *         - tipo
 *         - direccion_completa
 *         - ciudad
 *         - departamento
 *       properties:
 *         tipo:
 *           type: string
 *           example: "RESIDENCIA"
 *           description: Tipo de dirección (ej. RESIDENCIA, TRABAJO, CONSULTORIO)
 *         direccion_completa:
 *           type: string
 *           minLength: 10
 *           example: "Calle 123 #45-67 Apto 301, Torres del Parque"
 *           description: Dirección completa (mínimo 10 caracteres)
 *         ciudad:
 *           type: string
 *           example: "Bogotá"
 *           description: Ciudad
 *         departamento:
 *           type: string
 *           example: "Cundinamarca"
 *           description: Departamento o estado
 *         es_principal:
 *           type: boolean
 *           default: true
 *           example: true
 *           description: Indica si es la dirección principal del paciente
 *     
 *     RegistroPacienteRequest:
 *       type: object
 *       required:
 *         - usuario
 *         - paciente
 *         - direccion
 *       properties:
 *         usuario:
 *           $ref: '#/components/schemas/Usuario'
 *         paciente:
 *           $ref: '#/components/schemas/Paciente'
 *         direccion:
 *           $ref: '#/components/schemas/Direccion'
 *     
 *     SolicitudResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Solicitud de registro enviada exitosamente. Tu cuenta estará activa cuando el Director Médico apruebe la solicitud."
 *         data:
 *           type: object
 *           properties:
 *             solicitud_id:
 *               type: string
 *               format: uuid
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *             estado:
 *               type: string
 *               enum: [PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, DEVUELTA]
 *               example: "PENDIENTE"
 *               description: |
 *                 Estados posibles:
 *                 - **PENDIENTE**: Solicitud recién creada, esperando documentos y revisión
 *                 - **EN_REVISION**: Director Médico está revisando la solicitud
 *                 - **APROBADA**: Solicitud aprobada, usuario activo
 *                 - **RECHAZADA**: Solicitud rechazada por incumplimiento de requisitos
 *                 - **DEVUELTA**: Requiere correcciones/documentos adicionales
 *             paciente:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 nombres:
 *                   type: string
 *                 apellidos:
 *                   type: string
 *                 numero_identificacion:
 *                   type: string
 *             usuario:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 activo:
 *                   type: boolean
 *                   example: false
 *                   description: Usuario inactivo hasta aprobación
 *             direccion:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 ciudad:
 *                   type: string
 *                 departamento:
 *                   type: string
 *             fecha_solicitud:
 *               type: string
 *               format: date-time
 *               example: "2025-11-08T14:30:00.000Z"
 *     
 *     DocumentoResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "660e8400-e29b-41d4-a716-446655440001"
 *         nombre:
 *           type: string
 *           example: "cedula_frente.pdf"
 *           description: Nombre original del archivo
 *         tipo_archivo:
 *           type: string
 *           enum: [PDF, JPG, PNG, JPEG]
 *           example: "PDF"
 *         tamano_bytes:
 *           type: integer
 *           example: 245678
 *           description: Tamaño del archivo en bytes
 *         estado:
 *           type: string
 *           enum: [PENDIENTE, VALIDADO, RECHAZADO]
 *           example: "PENDIENTE"
 *           description: |
 *             Estados del documento:
 *             - **PENDIENTE**: Subido, esperando revisión
 *             - **VALIDADO**: Aprobado por Director Médico
 *             - **RECHAZADO**: Rechazado (se elimina de Storj después de 2 días)
 *         fecha_carga:
 *           type: string
 *           format: date-time
 *           example: "2025-11-08T10:35:00.000Z"
 *         ruta_storj:
 *           type: string
 *           example: "https://link.storjshare.io/bucket/documentos/1730543700000_a1b2c3d4.pdf"
 *           description: URL de acceso al documento en Storj DCS
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "El email ya está registrado."
 *         code:
 *           type: string
 *           example: "DUPLICATE_EMAIL"
 *           description: Código de error (opcional)
 */

/**
 * @swagger
 * /registro/paciente:
 *   post:
 *     summary: Registrar un nuevo paciente
 *     description: |
 *       Crea una solicitud de registro para un nuevo paciente en el sistema SaludK.
 *       La cuenta quedará **inactiva** hasta que el Director Médico apruebe la solicitud.
 *     tags:
 *       - Registro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroPacienteRequest'
 *     responses:
 *       201:
 *         description: Solicitud de registro creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SolicitudResponse'
 *       400:
 *         description: Datos inválidos o validación fallida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email o número de identificación ya registrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Demasiadas solicitudes (rate limit excedido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/paciente',
  rateLimiter.rateLimit.global,
  validate(registroPacienteSchema),
  registroController.registrarPaciente
);

/**
 * @swagger
 * /registro/solicitudes/{id}/documentos:
 *   post:
 *     summary: Subir documento a una solicitud de registro
 *     description: |
 *       Permite subir documentos de identidad u otros archivos requeridos a una solicitud de registro en estado **PENDIENTE**.
 *     tags:
 *       - Documentos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la solicitud de registro (obtenido al registrarse)
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documento
 *             properties:
 *               documento:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (PDF, JPG, PNG). Máximo 10MB
 *     responses:
 *       201:
 *         description: Documento subido exitosamente
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
 *                   example: "Documento subido exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/DocumentoResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Documento duplicado (mismo hash SHA-256)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: Archivo demasiado grande (>10MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit excedido (demasiadas subidas)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error al subir a Storj o error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/solicitudes/:id/documentos',
  rateLimiter.rateLimit.upload || rateLimiter.rateLimit.global,
  upload.single('documento'),
  registroController.subirDocumento
);

/**
 * @swagger
 * /registro/solicitudes/{id}/documentos:
 *   get:
 *     summary: Listar documentos de una solicitud
 *     description: |
 *       Retorna la lista de todos los documentos asociados a una solicitud de registro.
 *     tags:
 *       - Documentos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la solicitud de registro
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Lista de documentos obtenida exitosamente
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/DocumentoResponse'
 *                       - type: object
 *                         properties:
 *                           ruta_storj:
 *                             type: string
 *                             description: URL de acceso al documento
 *                           hash_sha256:
 *                             type: string
 *                             description: Hash SHA-256 del archivo
 *                 total:
 *                   type: integer
 *                   example: 3
 *                   description: Cantidad total de documentos
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/solicitudes/:id/documentos',
  registroController.listarDocumentos
);

/**
 * @swagger
 * /registro/medico:
 *   post:
 *     summary: Registrar un nuevo médico
 *     description: |
 *       Crea un usuario y perfil de médico en el sistema SaludK.
 *       Solo DIRECTOR_MEDICO puede registrar médicos.
 *     tags:
 *       - Registro
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario
 *               - medico
 *             properties:
 *               usuario:
 *                 $ref: '#/components/schemas/Usuario'
 *               medico:
 *                 type: object
 *                 required:
 *                   - nombres
 *                   - apellidos
 *                   - numero_identificacion
 *                   - especialidad
 *                   - registro_medico
 *                   - costo_consulta_presencial
 *                   - costo_consulta_virtual
 *                 properties:
 *                   nombres:
 *                     type: string
 *                     example: "Laura"
 *                   apellidos:
 *                     type: string
 *                     example: "Martínez Rodríguez"
 *                   numero_identificacion:
 *                     type: string
 *                     example: "9988776655"
 *                   especialidad:
 *                     type: string
 *                     example: "Cardiología"
 *                   registro_medico:
 *                     type: string
 *                     minLength: 5
 *                     example: "RM-12345"
 *                     description: Registro profesional único (mínimo 5 caracteres)
 *                   telefono:
 *                     type: string
 *                     example: "3209876543"
 *                   costo_consulta_presencial:
 *                     type: number
 *                     minimum: 0
 *                     example: 150000
 *                     description: Costo en pesos colombianos
 *                   costo_consulta_virtual:
 *                     type: number
 *                     minimum: 0
 *                     example: 100000
 *                     description: Costo en pesos colombianos
 *                   localidad:
 *                     type: string
 *                     example: "Chapinero"
 *                     description: Localidad donde atiende (opcional)
 *                   disponible:
 *                     type: boolean
 *                     default: true
 *                     example: true
 *                     description: Si está disponible para agendar citas
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
 *                   example: "Médico Laura Martínez Rodríguez registrado exitosamente."
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         rol:
 *                           type: string
 *                           example: "MEDICO"
 *                         activo:
 *                           type: boolean
 *                           example: true
 *                     medico:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nombres:
 *                           type: string
 *                         apellidos:
 *                           type: string
 *                         especialidad:
 *                           type: string
 *                         registro_medico:
 *                           type: string
 *                         calificacion_promedio:
 *                           type: number
 *                           example: 0.0
 *                         disponible:
 *                           type: boolean
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado (sin token o token inválido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permisos insuficientes (no es DIRECTOR_MEDICO)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email, identificación o registro médico duplicados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/medico',
  requireDirector,
  validate(registroMedicoSchema),
  registroController.registrarMedico
);

/**
 * @swagger
 * /registro/solicitudes:
 *   get:
 *     summary: Listar solicitudes de registro
 *     description: |
 *       Retorna la lista de solicitudes de registro filtradas por estado.
 *       Solo DIRECTOR_MEDICO puede acceder.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, DEVUELTA]
 *           default: PENDIENTE
 *         description: Filtrar solicitudes por estado
 *         example: "PENDIENTE"
 *     responses:
 *       200:
 *         description: Lista de solicitudes obtenida exitosamente
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       estado:
 *                         type: string
 *                         enum: [PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, DEVUELTA]
 *                       fecha_creacion:
 *                         type: string
 *                         format: date-time
 *                       fecha_validacion:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       motivo_decision:
 *                         type: string
 *                         nullable: true
 *                       resultados_bd_externas:
 *                         type: object
 *                         description: Resultados de validaciones externas
 *                       paciente:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           nombres:
 *                             type: string
 *                           apellidos:
 *                             type: string
 *                           numero_identificacion:
 *                             type: string
 *                           tipo_identificacion:
 *                             type: string
 *                           telefono:
 *                             type: string
 *                           tipo_sangre:
 *                             type: string
 *                           alergias:
 *                             type: array
 *                             items:
 *                               type: string
 *                           fecha_nacimiento:
 *                             type: string
 *                             format: date
 *                           genero:
 *                             type: string
 *                           usuario:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               email:
 *                                 type: string
 *                               rol:
 *                                 type: string
 *                               activo:
 *                                 type: boolean
 *                       revisador:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           email:
 *                             type: string
 *                           rol:
 *                             type: string
 *                 total:
 *                   type: integer
 *                   example: 5
 *                   description: Cantidad total de solicitudes
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permisos insuficientes (no es DIRECTOR_MEDICO)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/solicitudes',
  requireDirector,
  registroController.listarSolicitudes
);

/**
 * @swagger
 * /registro/solicitudes/{id}/aprobar:
 *   patch:
 *     summary: Aprobar solicitud de registro
 *     description: |
 *       Aprueba una solicitud de registro en estado **PENDIENTE**, activando al usuario en el sistema.
 *       Solo DIRECTOR_MEDICO puede aprobar solicitudes.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la solicitud de registro
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Solicitud aprobada exitosamente
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
 *                   example: "Solicitud aprobada exitosamente. El usuario ya puede acceder a la plataforma."
 *                 data:
 *                   type: object
 *                   properties:
 *                     solicitud:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         estado:
 *                           type: string
 *                           example: "APROBADA"
 *                         revisado_por:
 *                           type: string
 *                           format: uuid
 *                         fecha_validacion:
 *                           type: string
 *                           format: date-time
 *                         motivo_decision:
 *                           type: string
 *                           example: "Solicitud aprobada por el Director Médico"
 *                     usuario_activado:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Solicitud ya procesada o sin documentos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permisos insuficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/solicitudes/:id/aprobar',
  requireDirector,
  registroController.aprobarSolicitud
);

/**
 * @swagger
 * /registro/solicitudes/{id}/rechazar:
 *   patch:
 *     summary: Rechazar solicitud de registro
 *     description: |
 *       Rechaza una solicitud de registro en estado **PENDIENTE**, desactivando al usuario pero conservando todos los datos para auditoría.
 *       Solo DIRECTOR_MEDICO puede rechazar solicitudes.
 *     tags:
 *       - Solicitudes
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la solicitud de registro
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - motivo_decision
 *             properties:
 *               motivo_decision:
 *                 type: string
 *                 minLength: 10
 *                 example: "Documentos ilegibles. Por favor suba fotografías más claras de su cédula por ambas caras."
 *                 description: Motivo detallado del rechazo
 *     responses:
 *       200:
 *         description: Solicitud rechazada exitosamente
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
 *                   example: "Solicitud rechazada. El usuario ha sido notificado del motivo."
 *                 data:
 *                   type: object
 *                   properties:
 *                     solicitud:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         estado:
 *                           type: string
 *                           example: "RECHAZADA"
 *                         revisado_por:
 *                           type: string
 *                           format: uuid
 *                         fecha_validacion:
 *                           type: string
 *                           format: date-time
 *                         motivo_decision:
 *                           type: string
 *                           example: "Documentos ilegibles. Por favor suba fotografías más claras."
 *                     usuario_desactivado:
 *                       type: boolean
 *                       example: true
 *                     mensaje:
 *                       type: string
 *                       example: "Solicitud rechazada. Los datos se conservan para auditoría."
 *       400:
 *         description: Solicitud ya procesada o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permisos insuficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/solicitudes/:id/rechazar',
  requireDirector,
  validate(decisionSolicitudSchema),
  registroController.rechazarSolicitud
);

export default router;
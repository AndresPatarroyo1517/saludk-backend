import express from 'express';
import multer from 'multer';
import registroController from '../controllers/registroController.js';
import { authMiddleware, checkRole } from '../middlewares/authMiddleware.js';
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
 *       
 *       ## Flujo completo de registro:
 *       
 *       1. **Registro inicial** (este endpoint):
 *          - Se crea el usuario (inactivo, rol: PACIENTE)
 *          - Se crea el perfil de paciente vinculado al usuario
 *          - Se crea la dirección del paciente
 *          - Se crea la solicitud de registro en estado PENDIENTE
 *       
 *       2. **Subir documentos**: El paciente debe usar el endpoint `POST /solicitudes/{id}/documentos`
 *          para subir documentos de identidad (cédula, etc.)
 *       
 *       3. **Revisión**: El Director Médico revisa la solicitud y documentos
 *       
 *       4. **Aprobación/Rechazo**: 
 *          - Si aprueba: Usuario queda activo y puede hacer login
 *          - Si rechaza: Usuario queda inactivo, datos se conservan para auditoría
 *       
 *       ## Validaciones aplicadas:
 *       - Email único en el sistema
 *       - Número de identificación único
 *       - Contraseña segura (mínimo 8 caracteres, mayúsculas, minúsculas, números, especiales)
 *       - Edad mínima 18 años (si se proporciona fecha_nacimiento)
 *       - Dirección mínimo 10 caracteres
 *       
 *       ## Datos sensibles:
 *       - La contraseña se hashea con bcrypt (10 rounds) antes de almacenarla
 *       - Se genera un salt único por usuario
 *       - Nunca se retorna la contraseña en ninguna respuesta
 *     tags:
 *       - Registro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroPacienteRequest'
 *           examples:
 *             registroCompleto:
 *               summary: Registro completo con todos los campos
 *               value:
 *                 usuario:
 *                   email: "juan.perez@mail.com"
 *                   password: "MiPassword123!"
 *                 paciente:
 *                   nombres: "Juan Carlos"
 *                   apellidos: "Pérez López"
 *                   numero_identificacion: "1234567890"
 *                   tipo_identificacion: "CC"
 *                   telefono: "3001234567"
 *                   tipo_sangre: "O+"
 *                   alergias: ["Polen", "Ácaros", "Penicilina"]
 *                   fecha_nacimiento: "1990-01-15"
 *                   genero: "Masculino"
 *                 direccion:
 *                   tipo: "RESIDENCIA"
 *                   direccion_completa: "Calle 123 #45-67 Apto 301"
 *                   ciudad: "Bogotá"
 *                   departamento: "Cundinamarca"
 *                   es_principal: true
 *             registroMinimo:
 *               summary: Registro con campos mínimos requeridos
 *               value:
 *                 usuario:
 *                   email: "maria.garcia@mail.com"
 *                   password: "SecurePass456!"
 *                 paciente:
 *                   nombres: "Maria"
 *                   apellidos: "García"
 *                   numero_identificacion: "9876543210"
 *                   tipo_identificacion: "CC"
 *                 direccion:
 *                   tipo: "RESIDENCIA"
 *                   direccion_completa: "Carrera 7 #12-34"
 *                   ciudad: "Medellín"
 *                   departamento: "Antioquia"
 *     responses:
 *       201:
 *         description: Solicitud de registro creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SolicitudResponse'
 *             example:
 *               success: true
 *               message: "Solicitud de registro enviada exitosamente. Tu cuenta estará activa cuando el Director Médico apruebe la solicitud."
 *               data:
 *                 solicitud_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 estado: "PENDIENTE"
 *                 paciente:
 *                   id: "660e8400-e29b-41d4-a716-446655440001"
 *                   nombres: "Juan Carlos"
 *                   apellidos: "Pérez López"
 *                   numero_identificacion: "1234567890"
 *                 usuario:
 *                   id: "770e8400-e29b-41d4-a716-446655440002"
 *                   email: "juan.perez@mail.com"
 *                   activo: false
 *                 direccion:
 *                   id: "880e8400-e29b-41d4-a716-446655440003"
 *                   ciudad: "Bogotá"
 *                   departamento: "Cundinamarca"
 *                 fecha_solicitud: "2025-11-08T14:30:00.000Z"
 *       400:
 *         description: Datos inválidos o validación fallida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               passwordDebil:
 *                 summary: Contraseña no cumple requisitos
 *                 value:
 *                   success: false
 *                   error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial"
 *               menorEdad:
 *                 summary: Usuario menor de 18 años
 *                 value:
 *                   success: false
 *                   error: "Debes tener al menos 18 años para registrarte"
 *               direccionCorta:
 *                 summary: Dirección muy corta
 *                 value:
 *                   success: false
 *                   error: "La dirección debe tener al menos 10 caracteres"
 *               emailInvalido:
 *                 summary: Formato de email incorrecto
 *                 value:
 *                   success: false
 *                   error: "Formato de email inválido"
 *               tipoIdInvalido:
 *                 summary: Tipo de identificación no válido
 *                 value:
 *                   success: false
 *                   error: "Tipo de identificación no válido. Debe ser: CC, CAE, TIN, CE, PAS o NIE"
 *       409:
 *         description: Email o número de identificación ya registrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailDuplicado:
 *                 summary: Email ya existe en el sistema
 *                 value:
 *                   success: false
 *                   error: "El email ya está registrado."
 *                   code: "DUPLICATE_EMAIL"
 *               identificacionDuplicada:
 *                 summary: Número de identificación ya existe
 *                 value:
 *                   success: false
 *                   error: "El número de identificación ya está registrado."
 *                   code: "DUPLICATE_IDENTIFICATION"
 *       429:
 *         description: Demasiadas solicitudes (rate limit excedido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Demasiadas solicitudes. Intenta nuevamente en unos minutos."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Error interno del servidor. Por favor contacta al administrador."
 */
router.post(
  '/paciente',
  rateLimiter.rateLimit.global,
  validate(registroPacienteSchema),
  registroController.registrarPaciente
);

/**
 * @swagger
 * /api/v1/registro/solicitudes/{id}/documentos:
 *   post:
 *     summary: Subir documento a una solicitud de registro
 *     description: |
 *       Permite subir documentos de identidad u otros archivos requeridos a una solicitud de registro en estado **PENDIENTE**.
 *       
 *       ## Archivos permitidos:
 *       - PDF (application/pdf)
 *       - JPG/JPEG (image/jpeg)
 *       - PNG (image/png)
 *       
 *       ## Validaciones:
 *       - Tamaño máximo: **10MB** por archivo
 *       - Se calcula hash **SHA-256** para detectar duplicados
 *       - Solo se pueden subir documentos a solicitudes en estado PENDIENTE
 *       - Se almacena en **Storj DCS** (almacenamiento descentralizado)
 *       
 *       ## Seguridad:
 *       - Cada archivo se renombra con timestamp + hash parcial
 *       - Se valida integridad mediante SHA-256
 *       - Los archivos temporales se eliminan después de la subida
 *       
 *       ## Importante:
 *       - Se requiere **al menos 1 documento** para que el Director Médico pueda aprobar la solicitud
 *       - Si la solicitud es rechazada, los documentos se eliminan automáticamente de Storj después de **2 días**
 *       
 *       ## Metadata almacenada:
 *       - Nombre original del archivo
 *       - URL de acceso en Storj
 *       - Tipo de archivo
 *       - Tamaño en bytes
 *       - Hash SHA-256
 *       - Fecha de carga
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
 *           encoding:
 *             documento:
 *               contentType: application/pdf, image/jpeg, image/png
 *           examples:
 *             cedulaFrente:
 *               summary: Cédula (frente)
 *               description: Fotografía o escaneo de la parte frontal de la cédula
 *             cedulaAtras:
 *               summary: Cédula (reverso)
 *               description: Fotografía o escaneo de la parte trasera de la cédula
 *             carnetEPS:
 *               summary: Carné EPS
 *               description: Documento de afiliación a EPS
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
 *             example:
 *               success: true
 *               message: "Documento subido exitosamente"
 *               data:
 *                 id: "660e8400-e29b-41d4-a716-446655440001"
 *                 nombre: "cedula_frente.pdf"
 *                 tipo: "PDF"
 *                 tamano_bytes: 245678
 *                 estado: "PENDIENTE"
 *                 fecha_carga: "2025-11-08T10:35:00.000Z"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               sinArchivo:
 *                 summary: No se envió ningún archivo
 *                 value:
 *                   success: false
 *                   error: "No se recibió ningún archivo"
 *               estadoInvalido:
 *                 summary: Solicitud ya procesada
 *                 value:
 *                   success: false
 *                   error: "No se pueden subir documentos a una solicitud APROBADA"
 *               tipoInvalido:
 *                 summary: Tipo de archivo no permitido
 *                 value:
 *                   success: false
 *                   error: "Tipo de archivo no permitido: application/x-msdownload. Solo se permiten: application/pdf, image/jpeg, image/png"
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Solicitud no encontrada"
 *       409:
 *         description: Documento duplicado (mismo hash SHA-256)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Este documento ya fue subido anteriormente"
 *               code: "DUPLICATE_DOCUMENT"
 *       413:
 *         description: Archivo demasiado grande (>10MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Archivo demasiado grande. Máximo: 10MB"
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
 *             example:
 *               success: false
 *               error: "Error al subir archivo a Storj: Connection timeout"
 */
router.post(
  '/solicitudes/:id/documentos',
  rateLimiter.rateLimit.upload || rateLimiter.rateLimit.global,
  upload.single('documento'),
  registroController.subirDocumento
);

/**
 * @swagger
 * /api/v1/registro/solicitudes/{id}/documentos:
 *   get:
 *     summary: Listar documentos de una solicitud
 *     description: |
 *       Retorna la lista de todos los documentos asociados a una solicitud de registro.
 *       
 *       ## Control de acceso:
 *       - **Director Médico**: Puede ver documentos de cualquier solicitud
 *       - **Paciente dueño**: Solo puede ver sus propios documentos (implementar validación)
 *       - **Otros roles**: No tienen acceso
 *       
 *       ## Información retornada:
 *       - ID del documento
 *       - Nombre original del archivo
 *       - Tipo de archivo (PDF, JPG, PNG)
 *       - Tamaño en bytes
 *       - Estado (PENDIENTE, VALIDADO, RECHAZADO)
 *       - Fecha de carga
 *       - URL de acceso en Storj
 *       
 *       ## Casos de uso:
 *       - Director Médico revisa documentos antes de aprobar/rechazar
 *       - Paciente verifica qué documentos ha subido
 *       - Auditoría de documentos por solicitud
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
 *             example:
 *               success: true
 *               data:
 *                 - id: "660e8400-e29b-41d4-a716-446655440001"
 *                   nombre: "cedula_frente.pdf"
 *                   tipo_archivo: "PDF"
 *                   tamano_bytes: 245678
 estado: "PENDIENTE"
                   fecha_carga: "2025-11-08T10:35:00.000Z"
                   ruta_storj: "https://link.storjshare.io/bucket/documentos/1730543700000_a1b2c3d4.pdf"
                   hash_sha256: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
                 - id: "660e8400-e29b-41d4-a716-446655440002"
                   nombre: "cedula_atras.jpg"
                   tipo_archivo: "JPG"
                   tamano_bytes: 189456
                   estado: "PENDIENTE"
                   fecha_carga: "2025-11-08T10:36:00.000Z"
                   ruta_storj: "https://link.storjshare.io/bucket/documentos/1730543760000_e5f6g7h8.jpg"
                   hash_sha256: "e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6"
                 - id: "660e8400-e29b-41d4-a716-446655440003"
                   nombre: "carnet_eps.pdf"
                   tipo_archivo: "PDF"
                   tamano_bytes: 312456
                   estado: "PENDIENTE"
                   fecha_carga: "2025-11-08T10:37:00.000Z"
                   ruta_storj: "https://link.storjshare.io/bucket/documentos/1730543820000_i9j0k1l2.pdf"
                   hash_sha256: "i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0"
               total: 3
 *       404:
 *         description: Solicitud no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Solicitud no encontrada"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "Error al obtener documentos"
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
 *       
 *       ## Diferencias con registro de paciente:
 *       - Los médicos quedan **activos inmediatamente** (no requieren aprobación)
 *       - No se crea solicitud de registro
 *       - No requieren subir documentos
 *       - Solo pueden ser registrados por ADMIN o DIRECTOR_MEDICO
 *       
 *       ## Autenticación requerida:
 *       - Token JWT válido en cookie `accessToken` o header `Authorization: Bearer {token}`
 *       - Rol: **ADMIN** o **DIRECTOR_MEDICO**
 *       
 *       ## Validaciones:
 *       - Email único en el sistema
 *       - Número de identificación único
 *       - Registro médico único (ej: RM-12345)
 *       - Costos de consulta deben ser números positivos
 *       - Registro médico mínimo 5 caracteres
 *       
 *       ## Campos generados automáticamente:
 *       - `calificacion_promedio`: 0.0 (se actualiza con las valoraciones de pacientes)
 *       - `disponible`: true por defecto
 *       - `fecha_registro`: timestamp actual
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
 *           example:
 *             usuario:
 *               email: "dra.martinez@hospital.com"
 *               password: "DoctorPass123!"
 *             medico:
 *               nombres: "Laura"
 *               apellidos: "Martínez Rodríguez"
 *               numero_identificacion: "9988776655"
 *               especialidad: "Cardiología"
 *               registro_medico: "RM-12345"
 *               telefono: "3209876543"
 *               costo_consulta_presencial: 150000
 *               costo_consulta_virtual: 100000
 *               localidad: "Chapinero"
 *               disponible: true
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
 *             examples:
 *               costoNegativo:
 *                 summary: Costo de consulta negativo
 *                 value:
 *                   success: false
 *                   error: "El costo de consulta presencial debe ser un número positivo"
 *               registroCorto:
 *                 summary: Registro médico muy corto
 *                 value:
 *                   success: false
 *                   error: "El registro médico debe tener al menos 5 caracteres"
 *       401:
 *         description: No autorizado (sin token o token inválido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               sinToken:
 *                 summary: Token no proporcionado
 *                 value:
 *                   success: false
 *                   error: "Token no proporcionado"
 *               tokenExpirado:
 *                 summary: Token expirado
 *                 value:
 *                   success: false
 *                   error: "Token expirado"
 *                   code: "TOKEN_EXPIRED"
 *               tokenInvalido:
 *                 summary: Token inválido
 *                 value:
 *                   success: false
 *                   error: "Token inválido"
 *       403:
 *         description: Permisos insuficientes (no es ADMIN ni DIRECTOR_MEDICO)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "No tiene permisos para acceder a este recurso"
 *       409:
 *         description: Email, identificación o registro médico duplicados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailDuplicado:
 *                 value:
 *                   success: false
 *                   error: "El email ya está registrado."
 *               identificacionDuplicada:
 *                 value:
 *                   success: false
 *                   error: "El número de identificación ya está registrado."
 *               registroDuplicado:
 *                 value:
 *                   success: false
 *                   error: "El registro médico ya está registrado."
 *       500:
 *         description: Error interno del servidor
 */
router.post(
  '/medico',
  //authMiddleware,
  //checkRole('ADMIN', 'DIRECTOR_MEDICO'),
  validate(registroMedicoSchema),
  registroController.registrarMedico
);

/**
 * @swagger
 * /api/v1/registro/solicitudes:
 *   get:
 *     summary: Listar solicitudes de registro
 *     description: |
 *       Retorna la lista de solicitudes de registro filtradas por estado.
 *       
 *       ## Autenticación requerida:
 *       - Token JWT válido (cookie o header)
 *       - Rol: **DIRECTOR_MEDICO** únicamente
 *       
 *       ## Filtros disponibles:
 *       - `estado`: Filtrar por estado específico (query param)
 *         - PENDIENTE (default)
 *         - EN_REVISION
 *         - APROBADA
 *         - RECHAZADA
 *         - DEVUELTA
 *       
 *       ## Información incluida:
 *       - Datos completos del paciente
 *       - Usuario asociado (email, estado activo)
 *       - Información del revisor (si existe)
 *       - Motivo de decisión (si fue aprobada/rechazada)
 *       - Resultados de validaciones externas
 *       - Fechas de creación y validación
 *       
 *       ## Orden:
 *       Las solicitudes se ordenan por fecha de creación descendente (más recientes primero)
 *       
 *       ## Casos de uso:
 *       - Dashboard del Director Médico
 *       - Cola de revisión de solicitudes pendientes
 *       - Auditoría de decisiones tomadas
 *       - Reportes de aprobaciones/rechazos
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
 *         description: |
 *           Filtrar solicitudes por estado:
 *           - **PENDIENTE**: Solicitudes recién creadas (default)
 *           - **EN_REVISION**: En proceso de revisión
 *           - **APROBADA**: Aprobadas por Director Médico
 *           - **RECHAZADA**: Rechazadas por incumplimiento
 *           - **DEVUELTA**: Requieren correcciones
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
 *             example:
 *               success: true
 *               data:
 *                 - id: "550e8400-e29b-41d4-a716-446655440000"
 *                   estado: "PENDIENTE"
 *                   fecha_creacion: "2025-11-08T14:30:00.000Z"
 *                   fecha_validacion: null
 *                   motivo_decision: null
 *                   resultados_bd_externas:
 *                     historial_medico:
 *                       consultado: false
 *                       resultado: null
 *                       fecha: null
 *                     antecedentes_policia:
 *                       consultado: false
 *                       resultado: null
 *                       fecha: null
 *                   paciente:
 *                     id: "660e8400-e29b-41d4-a716-446655440001"
 *                     nombres: "Juan Carlos"
 *                     apellidos: "Pérez López"
 *                     numero_identificacion: "1234567890"
 *                     tipo_identificacion: "CC"
 *                     telefono: "3001234567"
 *                     tipo_sangre: "O+"
 *                     alergias: ["Polen", "Ácaros"]
 *                     fecha_nacimiento: "1990-01-15"
 *                     genero: "Masculino"
 *                     usuario:
 *                       id: "770e8400-e29b-41d4-a716-446655440002"
 *                       email: "juan.perez@mail.com"
 *                       rol: "PACIENTE"
 *                       activo: false
 *                   revisador: null
 *               total: 1
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
  authMiddleware,
  checkRole('DIRECTOR_MEDICO'),
  registroController.listarSolicitudes
);

/**
 * @swagger
 * /api/v1/registro/solicitudes/{id}/aprobar:
 *   patch:
 *     summary: Aprobar solicitud de registro
 *     description: |
 *       Aprueba una solicitud de registro en estado **PENDIENTE**, activando al usuario en el sistema.
 *       
 *       ## Autenticación requerida:
 *       - Token JWT válido (cookie o header)
 *       - Rol: **DIRECTOR_MEDICO** únicamente
 *       
 *       ## Validaciones previas:
 *       - La solicitud debe existir
 *       - La solicitud debe estar en estado PENDIENTE
 *       - Debe tener **al menos 1 documento** subido
 *       
 *       ## Acciones realizadas (transacción atómica):
 *       1. Cambia `solicitud_registro.estado` → **APROBADA**
 *       2. Cambia `usuario.activo` → **true**
 *       3. Cambia `documento.estado` → **VALIDADO** (todos los documentos)
 *       4. Registra `revisado_por` → ID del Director Médico
 *       5. Registra `fecha_validacion` → timestamp actual
 *       6. Registra `motivo_decision` → "Solicitud aprobada por el Director Médico"
 *       
 *       ## Después de la aprobación:
 *       - El usuario puede hacer **login** con su email y contraseña
 *       - Tiene acceso completo a la plataforma
 *       - Puede agendar citas, ver su historial médico, etc.
 *       
 *       ## Auditoría:
 *       - Se registra quién aprobó la solicitud
 *       - Se registra cuándo fue aprobada
 *       - Los datos quedan permanentes para trazabilidad
 *       
 *       ## Notificaciones (recomendado implementar):
 *       - Enviar email al paciente informando la aprobación
 *       - Incluir instrucciones para primer login
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
 *             examples:
 *               yaAprobada:
 *                 summary: Solicitud ya fue aprobada
 *                 value:
 *                   success: false
 *                   error: "La solicitud ya fue aprobada."
 *               yaRechazada:
 *                 summary: Solicitud ya fue rechazada
 *                 value:
 *                   success: false
 *                   error: "La solicitud ya fue rechazada."
 *               sinDocumentos:
 *                 summary: No tiene documentos
 *                 value:
 *                   success: false
 *                   error: "No se puede aprobar una solicitud sin documentos."
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
 *             example:
 *               success: false
 *               error: "Solicitud no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/solicitudes/:id/aprobar',
  authMiddleware,
  checkRole('DIRECTOR_MEDICO'),
  registroController.aprobarSolicitud
);

/**
 * @swagger
 * /api/v1/registro/solicitudes/{id}/rechazar:
 *   patch:
 *     summary: Rechazar solicitud de registro
 *     description: |
 *       Rechaza una solicitud de registro en estado **PENDIENTE**, desactivando al usuario pero conservando todos los datos para auditoría.
 *       
 *       ## Autenticación requerida:
 *       - Token JWT válido (cookie o header)
 *       - Rol: **DIRECTOR_MEDICO** únicamente
 *       
 *       ## Validaciones previas:
 *       - La solicitud debe existir
 *       - La solicitud debe estar en estado PENDIENTE
 *       - Es **obligatorio** proporcionar un `motivo_decision` claro
 *       
 *       ## Acciones realizadas (transacción atómica):
 *       1. Cambia `solicitud_registro.estado` → **RECHAZADA**
 *       2. Cambia `usuario.activo` → **false** (NO SE BORRA)
 *       3. Cambia `documento.estado` → **RECHAZADO** (NO SE BORRAN)
 *       4. Registra `revisado_por` → ID del Director Médico
 *       5. Registra `fecha_validacion` → timestamp actual
 *       6. Registra `motivo_decision` → Texto proporcionado
 *       
 *       ## Importante - Conservación de datos:
 *       - **NO se eliminan** el usuario, paciente, dirección ni solicitud de la BD
 *       - **NO se eliminan** inmediatamente los documentos de Storj
 *       - Los documentos se eliminan automáticamente de Storj después de **2 días** (job cron)
 *       - Todos los datos se conservan para **auditoría y compliance**
 *       
 *       ## Después del rechazo:
 *       - El usuario **NO puede hacer login** (activo = false)
 *       - **NO puede reintentar** con el mismo email/identificación
 *       - El usuario debe registrarse nuevamente con datos diferentes
 *       
 *       ## Motivos comunes de rechazo:
 *       - "Documentos ilegibles. Por favor suba fotografías más claras"
 *       - "Número de identificación no coincide con documentos"
 *       - "Antecedentes policiales incompatibles con política de la plataforma"
 *       - "Documentación incompleta"
 *       - "Menor de edad (requiere 18+ años)"
 *       
 *       ## Notificaciones (recomendado implementar):
 *       - Enviar email al paciente informando el rechazo
 *       - Incluir motivo detallado
 *       - Indicar que NO puede reintentar con los mismos datos
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
 *                 description: |
 *                   Motivo detallado del rechazo. Debe ser claro y específico.
 *                   El paciente recibirá este mensaje.
 *           examples:
 *             documentosIlegibles:
 *               summary: Documentos de mala calidad
 *               value:
 *                 motivo_decision: "Documentos ilegibles. Por favor suba fotografías más claras de su cédula por ambas caras."
 *             datosNoCoinciden:
 *               summary: Datos no coinciden
 *               value:
 *                 motivo_decision: "El número de identificación ingresado no coincide con el mostrado en los documentos adjuntos."
 *             antecedentes:
 *               summary: Antecedentes policiales
 *               value:
 *                 motivo_decision: "Los antecedentes policiales encontrados son incompatibles con la política de aceptación de la plataforma."
 *             documentacionIncompleta:
 *               summary: Falta documentación
 *               value:
 *                 motivo_decision: "Documentación incompleta. Se requiere cédula por ambas caras y carné de EPS."
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
 *             example:
 *               success: true
 *               message: "Solicitud rechazada. El usuario ha sido notificado del motivo."
 *               data:
 *                 solicitud:
 *                   id: "550e8400-e29b-41d4-a716-446655440000"
 *                   estado: "RECHAZADA"
 *                   revisado_por: "990e8400-e29b-41d4-a716-446655440099"
 *                   fecha_validacion: "2025-11-08T15:45:00.000Z"
 *                   motivo_decision: "Documentos ilegibles. Por favor suba fotografías más claras de su cédula por ambas caras."
 *                 usuario_desactivado: true
 *                 mensaje: "Solicitud rechazada. Los datos se conservan para auditoría."
 *       400:
 *         description: Solicitud ya procesada o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               yaRechazada:
 *                 summary: Solicitud ya fue rechazada
 *                 value:
 *                   success: false
 *                   error: "La solicitud ya fue rechazada."
 *               yaAprobada:
 *                 summary: Solicitud ya fue aprobada
 *                 value:
 *                   success: false
 *                   error: "La solicitud ya fue aprobada."
 *               motivoVacio:
 *                 summary: No se proporcionó motivo
 *                 value:
 *                   success: false
 *                   error: "El motivo de decisión es obligatorio."
 *               motivoCorto:
 *                 summary: Motivo demasiado corto
 *                 value:
 *                   success: false
 *                   error: "El motivo de decisión debe tener al menos 10 caracteres."
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
 *             example:
 *               success: false
 *               error: "Solicitud no encontrada."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/solicitudes/:id/rechazar',
  authMiddleware,
  checkRole('DIRECTOR_MEDICO'),
  validate(decisionSolicitudSchema),
  registroController.rechazarSolicitud
);

export default router;
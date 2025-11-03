import Joi from 'joi';

/**
 * Schema de validación para registro de paciente
 */
export const registroPacienteSchema = Joi.object({
  usuario: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'El email debe ser válido',
        'any.required': 'El email es obligatorio'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?])/)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.pattern.base': 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales',
        'any.required': 'La contraseña es obligatoria'
      })
  }).required(),

  paciente: Joi.object({
    nombres: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'any.required': 'El nombre es obligatorio'
      }),
    apellidos: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'any.required': 'Los apellidos son obligatorios'
      }),
    numero_identificacion: Joi.string()
      .required()
      .messages({
        'any.required': 'El número de identificación es obligatorio'
      }),
    tipo_identificacion: Joi.string()
      .valid('CC', 'CE', 'NIT', 'PASAPORTE')
      .required()
      .messages({
        'any.only': 'Tipo de identificación inválido',
        'any.required': 'El tipo de identificación es obligatorio'
      }),
    telefono: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional()
      .messages({
        'string.pattern.base': 'El teléfono debe tener 10 dígitos'
      }),
    tipo_sangre: Joi.string()
      .valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      .optional()
      .messages({
        'any.only': 'Tipo de sangre inválido'
      }),
    alergias: Joi.array()
      .items(Joi.string())
      .optional()
      .default([]),
    fecha_nacimiento: Joi.date()
      .max('now')
      .optional()
      .messages({
        'date.max': 'La fecha de nacimiento no puede ser futura'
      }),
    genero: Joi.string()
      .valid('Masculino', 'Femenino', 'Otro')
      .optional()
  }).required(),
  direccion: Joi.object({
    tipo: Joi.string().required(), // Ej: "RESIDENCIA", "TRABAJO"
    direccion_completa: Joi.string().required(),
    ciudad: Joi.string().required(),
    departamento: Joi.string().required(),
    es_principal: Joi.boolean().default(true)
  }).required()
});

/**
 * Schema de validación para registro de médico
 */
export const registroMedicoSchema = Joi.object({
  usuario: Joi.object({
    email: Joi.string()
      .email()
      .required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
      .required()
  }).required(),

  medico: Joi.object({
    nombres: Joi.string()
      .required(),
    apellidos: Joi.string()
      .required(),
    numero_identificacion: Joi.string()
      .required(),
    especialidad: Joi.string()
      .required()
      .messages({
        'any.required': 'La especialidad es obligatoria'
      }),
    registro_medico: Joi.string()
      .required()
      .messages({
        'any.required': 'El registro médico es obligatorio'
      }),
    telefono: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional(),
    costo_consulta_presencial: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'El costo debe ser positivo',
        'any.required': 'El costo de consulta presencial es obligatorio'
      }),
    costo_consulta_virtual: Joi.number()
      .positive()
      .required(),
    localidad: Joi.string()
      .optional(),
    disponible: Joi.boolean()
      .optional()
      .default(true)
  }).required()
});

/**
 * Schema de validación para aprobación/rechazo
 */
export const decisionSolicitudSchema = Joi.object({
  motivo_decision: Joi.string()
    .when('$action', {
      is: 'rechazar',
      then: Joi.required().messages({
        'any.required': 'El motivo de rechazo es obligatorio'
      }),
      otherwise: Joi.optional()
    })
});

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
};

export default {
  registroPacienteSchema,
  registroMedicoSchema,
  decisionSolicitudSchema,
  validate
};
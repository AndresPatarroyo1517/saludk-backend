import Joi from 'joi';

/**
 * Schema de validación para login
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email debe ser válido',
      'any.required': 'El email es obligatorio'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es obligatoria'
    })
});

/**
 * Schema de validación para registro
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'El email debe ser válido',
      'any.required': 'El email es obligatorio'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales',
      'any.required': 'La contraseña es obligatoria'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'Debe confirmar la contraseña'
    }),
  rol: Joi.string()
    .valid('PACIENTE', 'MEDICO', 'DIRECTOR_MEDICO', 'ADMIN')
    .default('PACIENTE')
    .messages({
      'any.only': 'Rol inválido'
    })
});

/**
 * Schema de validación para refresh token
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'El refresh token es obligatorio'
    })
});

/**
 * Schema de validación para cambio de contraseña
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña actual es obligatoria'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales',
      'any.required': 'La nueva contraseña es obligatoria'
    }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'Debe confirmar la nueva contraseña'
    })
});

/**
 * Middleware de validación genérico
 * @param {Joi.Schema} schema - Schema de validación
 * @returns {Function} Middleware de Express
 */
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
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  validate
};
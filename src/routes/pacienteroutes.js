const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { registrarPaciente } = require("../controllers/pacienteController");

// Validaciones de campos
const validators = [
  body("nombres")
    .notEmpty().withMessage("El campo nombres es obligatorio")
    .isString().withMessage("El campo nombres debe ser texto")
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage("El campo nombres debe tener entre 2 y 255 caracteres"),
  
  body("apellidos")
    .notEmpty().withMessage("El campo apellidos es obligatorio")
    .isString().withMessage("El campo apellidos debe ser texto")
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage("El campo apellidos debe tener entre 2 y 255 caracteres"),
  
  body("numero_identificacion")
    .notEmpty().withMessage("El campo numero_identificacion es obligatorio")
    .isString().withMessage("El campo numero_identificacion debe ser texto")
    .trim()
    .isLength({ min: 5, max: 50 }).withMessage("El campo numero_identificacion debe tener entre 5 y 50 caracteres"),
  
  body("tipo_identificacion")
    .notEmpty().withMessage("El campo tipo_identificacion es obligatorio")
    .isIn(["CC", "CAE", "TIN", "CE", "PAS", "NIE"])
    .withMessage("El tipo de identificación debe ser: CC, CAE, TIN, CE, PAS o NIE"),
  
  body("usuario_id")
    .notEmpty().withMessage("El campo usuario_id es obligatorio")
    .isUUID().withMessage("El campo usuario_id debe ser un UUID válido"),
  
  body("telefono")
    .optional()
    .isString().withMessage("El campo telefono debe ser texto")
    .trim()
    .isLength({ max: 20 }).withMessage("El campo telefono no debe exceder 20 caracteres"),
  
  body("tipo_sangre")
    .optional()
    .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .withMessage("El tipo de sangre debe ser válido (A+, A-, B+, B-, AB+, AB-, O+, O-)"),
  
  body("fecha_nacimiento")
    .optional()
    .isISO8601().withMessage("La fecha de nacimiento debe tener formato válido (YYYY-MM-DD)")
    .toDate(),
  
  body("genero")
    .optional()
    .isString().withMessage("El campo genero debe ser texto")
    .trim()
    .isLength({ max: 20 }).withMessage("El campo genero no debe exceder 20 caracteres"),
  
  body("alergias")
    .optional(),
  
  // Middleware para manejar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: "Errores de validación en los datos enviados",
        errors: errors.array().map(err => ({
          campo: err.path,
          mensaje: err.msg,
          valor: err.value
        }))
      });
    }
    next();
  },
];

// Ruta para registrar paciente
router.post(
  "/register",
  validators, 
  registrarPaciente
);

// Manejo de errores de Multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo excede el tamaño máximo permitido de 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Se excedió el número máximo de archivos permitidos (5)'
      });
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;
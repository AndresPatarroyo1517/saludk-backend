
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { body, validationResult } = require("express-validator");
const pacienteController = require("../controllers/paciente.controller");


const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

// Validaciones 
const validators = [
  body("nombres").notEmpty().withMessage("nombres es obligatorio"),
  body("apellidos").notEmpty().withMessage("apellidos es obligatorio"),
  body("numero_identificacion").notEmpty().withMessage("numero_identificacion es obligatorio"),
  body("correo").isEmail().withMessage("correo inválido"),
 
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

router.post("/register", upload.array("documentos", 5), validators, pacienteController.registrarPaciente);
module.exports = router;

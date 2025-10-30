const { crearPaciente } = require("../services/pacienteService");
const logger = require('../utils/logger');

const registrarPaciente = async (req, res, next) => {
  try {
    // Crear el paciente
    const paciente = await crearPaciente(req.body, req.files);

    // Respuesta exitosa
    return res.status(201).json({
      success: true,
      message: `Paciente ${paciente.nombres} ${paciente.apellidos} con identificación ${paciente.numero_identificacion} registrado correctamente.`,
      data: {
        id: paciente.id,
        usuario_id: paciente.usuario_id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        numero_identificacion: paciente.numero_identificacion,
        tipo_identificacion: paciente.tipo_identificacion,
        telefono: paciente.telefono,
        tipo_sangre: paciente.tipo_sangre,
        alergias: paciente.alergias,
        fecha_nacimiento: paciente.fecha_nacimiento,
        genero: paciente.genero,
        fecha_creacion: paciente.fecha_creacion,
        fecha_actualizacion: paciente.fecha_actualizacion,
      },
    });
  } catch (error) {
    // Determinar el status code apropiado
    const status = error.status || 500;
    const message = error.message || "Error al registrar paciente";
    
    // Log del error
    logger.error(`Error al registrar paciente: ${message}`, {
      error: error.stack,
      body: req.body,
      status: status
    });

    // Respuesta de error
    return res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.stack,
        details: error.details || null 
      })
    });
  }
};

module.exports = {
  registrarPaciente,
};
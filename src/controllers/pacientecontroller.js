const pacienteService = require("../services/pacienteservice");

exports.registrarPaciente = async (req, res, next) => {
  try {
    const paciente = await pacienteService.crearPaciente(req.body, req.files);
    return res.status(201).json({
      success: true,
      message: "Paciente registrado correctamente",
      data: {
        id: paciente.id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        correo: paciente.correo,
        estado: paciente.estado,
        documentos: paciente.documentos,
        createdAt: paciente.createdAt,
      },
    });
  } catch (error) {
    // normalize error
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Error al registrar paciente",
    });
  }
};

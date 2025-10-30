const db = require("../models/index");
const Paciente = db.Paciente;
const logger = require("../utils/logger");

exports.crearPaciente = async (datos) => {
  // Validación de campos obligatorios
  if (!datos.nombres || !datos.apellidos || !datos.numero_identificacion || !datos.tipo_identificacion || !datos.usuario_id) {
    const e = new Error("Los campos nombres, apellidos, número de identificación, tipo de identificación y usuario_id son obligatorios.");
    e.status = 400;
    throw e;
  }

  // Validar que el tipo_identificacion sea válido
  const tiposValidos = ["CC", "CAE", "TIN", "CE", "PAS", "NIE"];
  if (!tiposValidos.includes(datos.tipo_identificacion)) {
    const e = new Error("Tipo de identificación no válido. Debe ser: CC, CAE, TIN, CE, PAS o NIE.");
    e.status = 400;
    throw e;
  }

  // Verificar si ya existe un paciente con ese número de identificación
  const pacienteExistente = await Paciente.findOne({ 
    where: { numero_identificacion: datos.numero_identificacion } 
  });
  
  if (pacienteExistente) {
    const e = new Error("Ya existe un paciente con ese número de identificación.");
    e.status = 409;
    throw e;
  }

  // Verificar si el usuario ya tiene un paciente registrado
  const usuarioExistente = await Paciente.findOne({
    where: { usuario_id: datos.usuario_id }
  });

  if (usuarioExistente) {
    const e = new Error("Este usuario ya tiene un paciente registrado.");
    e.status = 409;
    throw e;
  }

  // Validar tipo de sangre si se proporciona
  if (datos.tipo_sangre) {
    const tiposSangreValidos = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    if (!tiposSangreValidos.includes(datos.tipo_sangre)) {
      const e = new Error("Tipo de sangre no válido.");
      e.status = 400;
      throw e;
    }
  }

  // Validar formato de fecha de nacimiento si se proporciona
  if (datos.fecha_nacimiento) {
    const fecha = new Date(datos.fecha_nacimiento);
    if (isNaN(fecha.getTime())) {
      const e = new Error("Formato de fecha de nacimiento no válido.");
      e.status = 400;
      throw e;
    }
  }

  // Procesar alergias (debe ser un array)
  let alergias = [];
  if (datos.alergias) {
    if (typeof datos.alergias === 'string') {
      try {
        alergias = JSON.parse(datos.alergias);
      } catch {
        alergias = [datos.alergias];
      }
    } else if (Array.isArray(datos.alergias)) {
      alergias = datos.alergias;
    }
  }

  // Crear el paciente
  try {
    const paciente = await Paciente.create({
      usuario_id: datos.usuario_id,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      numero_identificacion: datos.numero_identificacion,
      tipo_identificacion: datos.tipo_identificacion,
      telefono: datos.telefono || null,
      tipo_sangre: datos.tipo_sangre || null,
      alergias: alergias,
      fecha_nacimiento: datos.fecha_nacimiento || null,
      genero: datos.genero || null,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
    });

    logger.info(`Paciente creado exitosamente: ${paciente.id}`);
    return paciente;
  } catch (dbError) {
    logger.error(`Error al crear paciente en la base de datos: ${dbError.message}`);
    const e = new Error("Error al guardar el paciente en la base de datos.");
    e.status = 500;
    throw e;
  }
};
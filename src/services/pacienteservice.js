
const { Paciente } = require("../models");
const storjService = require("./storj.service");
const logger = require("../utils/logger");

exports.crearPaciente = async (datos, archivos) => {
 
  if (!datos.nombres || !datos.apellidos || !datos.numero_identificacion || !datos.correo) {
    const e = new Error("Los campos nombres, apellidos, número de identificación y correo son obligatorios.");
    e.status = 400;
    throw e;
  }

  // Validación de correo duplicado
  const existente = await Paciente.findOne({ where: { correo: datos.correo } });
  if (existente) {
    const e = new Error("Ya existe un paciente con ese correo.");
    e.status = 409;
    throw e;
  }

  // Subir archivos si hay
  let documentos = [];
  if (archivos && archivos.length > 0) {
    documentos = await Promise.all(
      archivos.map(async (f) => await storjService.subirArchivo(f))
    );
  }

  const paciente = await Paciente.create({
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    numero_identificacion: datos.numero_identificacion,
    correo: datos.correo,
    telefono: datos.telefono || null,
    direccion: datos.direccion || null,
    tipo_sangre: datos.tipo_sangre || null,
    alergias: datos.alergias || null,
    antecedentes_medicos: datos.antecedentes_medicos || null,
    documentos,
    estado: "Pendiente",
  });

  logger.info(`Paciente creado: ${paciente.id}`);
  return paciente;
};

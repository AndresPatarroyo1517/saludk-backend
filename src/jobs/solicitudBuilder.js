/**
 * SolicitudBuilder
 * Patrón Builder para construir y validar solicitudes de registro
 * Valida datos antes de enviarlos al Repository
 */

class SolicitudBuilder {
  constructor() {
    this.solicitud = {
      tipo: null,
      usuario: {},
      perfil: {} // Puede ser paciente o médico
    };
  }

  /**
   * Establece y valida los datos del usuario
   */
  setUsuarioData(usuario) {
    // Validar campos obligatorios
    if (!usuario.email || !usuario.password) {
      const e = new Error("Email y password son obligatorios.");
      e.status = 400;
      throw e;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario.email)) {
      const e = new Error("Formato de email inválido.");
      e.status = 400;
      throw e;
    }

    // Validar longitud de password
    if (usuario.password.length < 8) {
      const e = new Error("La contraseña debe tener al menos 8 caracteres.");
      e.status = 400;
      throw e;
    }

    this.solicitud.usuario = {
      email: usuario.email.toLowerCase().trim(),
      password: usuario.password
    };

    return this;
  }

  /**
   * Establece y valida los datos del paciente
   */
  setPacienteData(paciente) {
    // Validar campos obligatorios
    if (!paciente.nombres || !paciente.apellidos || !paciente.numero_identificacion || !paciente.tipo_identificacion) {
      const e = new Error("Los campos nombres, apellidos, número de identificación y tipo de identificación son obligatorios.");
      e.status = 400;
      throw e;
    }

    // Validar tipo de identificación
    const tiposValidos = ["CC", "CAE", "TIN", "CE", "PAS", "NIE"];
    if (!tiposValidos.includes(paciente.tipo_identificacion)) {
      const e = new Error("Tipo de identificación no válido. Debe ser: CC, CAE, TIN, CE, PAS o NIE.");
      e.status = 400;
      throw e;
    }

    // Validar tipo de sangre si se proporciona
    if (paciente.tipo_sangre) {
      const tiposSangreValidos = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      if (!tiposSangreValidos.includes(paciente.tipo_sangre)) {
        const e = new Error("Tipo de sangre no válido.");
        e.status = 400;
        throw e;
      }
    }

    // Validar fecha de nacimiento si se proporciona
    if (paciente.fecha_nacimiento) {
      const fecha = new Date(paciente.fecha_nacimiento);
      if (isNaN(fecha.getTime())) {
        const e = new Error("Formato de fecha de nacimiento no válido.");
        e.status = 400;
        throw e;
      }
      
      // Verificar que no sea una fecha futura
      if (fecha > new Date()) {
        const e = new Error("La fecha de nacimiento no puede ser futura.");
        e.status = 400;
        throw e;
      }
    }

    // Procesar alergias (debe ser un array)
    let alergias = [];
    if (paciente.alergias) {
      if (typeof paciente.alergias === 'string') {
        try {
          alergias = JSON.parse(paciente.alergias);
        } catch {
          alergias = [paciente.alergias];
        }
      } else if (Array.isArray(paciente.alergias)) {
        alergias = paciente.alergias;
      }
    }

    this.solicitud.perfil = {
      nombres: paciente.nombres.trim(),
      apellidos: paciente.apellidos.trim(),
      numero_identificacion: paciente.numero_identificacion.trim(),
      tipo_identificacion: paciente.tipo_identificacion,
      telefono: paciente.telefono?.trim() || null,
      tipo_sangre: paciente.tipo_sangre || null,
      alergias: alergias,
      fecha_nacimiento: paciente.fecha_nacimiento || null,
      genero: paciente.genero?.trim() || null
    };

    return this;
  }

  /**
   * Establece y valida los datos del médico
   */
  setMedicoData(medico) {
    // Validar campos obligatorios
    if (!medico.nombres || !medico.apellidos || !medico.numero_identificacion || 
        !medico.especialidad || !medico.registro_medico || 
        medico.costo_consulta_presencial === undefined || 
        medico.costo_consulta_virtual === undefined) {
      const e = new Error("Los campos nombres, apellidos, número de identificación, especialidad, registro médico y costos de consulta son obligatorios.");
      e.status = 400;
      throw e;
    }

    // Validar costos (deben ser números positivos)
    if (isNaN(medico.costo_consulta_presencial) || medico.costo_consulta_presencial < 0) {
      const e = new Error("El costo de consulta presencial debe ser un número positivo.");
      e.status = 400;
      throw e;
    }

    if (isNaN(medico.costo_consulta_virtual) || medico.costo_consulta_virtual < 0) {
      const e = new Error("El costo de consulta virtual debe ser un número positivo.");
      e.status = 400;
      throw e;
    }

    // Validar registro médico (debe tener formato adecuado, ej: al menos 5 caracteres)
    if (medico.registro_medico.trim().length < 5) {
      const e = new Error("El registro médico debe tener al menos 5 caracteres.");
      e.status = 400;
      throw e;
    }

    this.solicitud.perfil = {
      nombres: medico.nombres.trim(),
      apellidos: medico.apellidos.trim(),
      numero_identificacion: medico.numero_identificacion.trim(),
      especialidad: medico.especialidad.trim(),
      registro_medico: medico.registro_medico.trim(),
      telefono: medico.telefono?.trim() || null,
      costo_consulta_presencial: parseFloat(medico.costo_consulta_presencial),
      costo_consulta_virtual: parseFloat(medico.costo_consulta_virtual),
      localidad: medico.localidad?.trim() || null,
      disponible: medico.disponible !== undefined ? medico.disponible : true
    };

    return this;
  }

  /**
   * Establece el tipo de solicitud
   */
  setTipo(tipo) {
    if (!['paciente', 'medico'].includes(tipo)) {
      const e = new Error("Tipo de solicitud inválido.");
      e.status = 400;
      throw e;
    }
    this.solicitud.tipo = tipo;
    return this;
  }

  /**
   * Construye y retorna la solicitud validada
   */
  build() {
    // Validar que se haya establecido el tipo
    if (!this.solicitud.tipo) {
      const e = new Error("Debe establecer el tipo de solicitud.");
      e.status = 400;
      throw e;
    }

    // Validar que se hayan establecido datos de usuario
    if (!this.solicitud.usuario.email) {
      const e = new Error("Debe establecer los datos del usuario.");
      e.status = 400;
      throw e;
    }

    // Validar que se hayan establecido datos del perfil
    if (!this.solicitud.perfil.nombres) {
      const e = new Error(`Debe establecer los datos del ${this.solicitud.tipo}.`);
      e.status = 400;
      throw e;
    }

    return this.solicitud;
  }

  /**
   * Reinicia el builder para crear una nueva solicitud
   */
  reset() {
    this.solicitud = {
      tipo: null,
      usuario: {},
      perfil: {}
    };
    return this;
  }
}

export default SolicitudBuilder;
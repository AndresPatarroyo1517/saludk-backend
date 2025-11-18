import { 
  Usuario, 
  Paciente, 
  Medico,
  Direccion, 
  HistorialMedico, 
  Cita, 
  Suscripcion,
  Plan,
  OrdenPago,
  DisponibilidadMedico,
  CalificacionMedico
} from "../models/index.js";
import { Op } from "sequelize";
import logger from "../utils/logger.js";

class UserService {
  /**
   * Obtener perfil completo del usuario autenticado
   * Funciona para PACIENTE y MÉDICO
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        const error = new Error("ID de usuario requerido");
        error.status = 400;
        throw error;
      }

      // Primero obtenemos el usuario base para saber su ROL
      const usuarioBase = await Usuario.findByPk(userId, {
        attributes: ['id', 'email', 'rol', 'activo']
      });

      if (!usuarioBase) {
        const error = new Error("Usuario no encontrado");
        error.status = 404;
        error.code = "USER_NOT_FOUND";
        throw error;
      }

      if (!usuarioBase.activo) {
        const error = new Error("Cuenta desactivada");
        error.status = 403;
        error.code = "ACCOUNT_DISABLED";
        throw error;
      }

      // Delegar según el rol
      if (usuarioBase.rol === 'PACIENTE') {
        return await this._getPacienteProfile(userId);
      } else if (usuarioBase.rol === 'MEDICO') {
        return await this._getMedicoProfile(userId);
      } else {
        // Para ADMIN u otros roles
        return await this._getBasicProfile(userId);
      }

    } catch (error) {
      logger.error(`Error al obtener perfil de usuario ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * PERFIL COMPLETO DE PACIENTE
   */
  async _getPacienteProfile(userId) {
    const usuario = await Usuario.findByPk(userId, {
      attributes: ['id', 'email', 'rol', 'activo', 'ultimo_acceso'],
      include: [
        {
          model: Paciente,
          as: 'paciente',
          attributes: [
            'id',
            'nombres',
            'apellidos',
            'fecha_nacimiento',
            'telefono',
            'genero',
            'tipo_identificacion',
            'numero_identificacion',
            'tipo_sangre',
            'alergias'
          ],
          required: true, // Debe existir si es rol PACIENTE
          include: [
            // 1. Direcciones
            {
              model: Direccion,
              as: 'direcciones',
              attributes: [
                'id',
                'direccion_completa',
                'ciudad',
                'departamento',
                'tipo'
              ],
              required: false
            },
            // 2. Historial Médico
            {
              model: HistorialMedico,
              as: 'historial_medico',
              attributes: [
                'id',
                'enfermedades_cronicas',
                'cirugias_previas',
                'medicamentos_actuales',
                'fecha_actualizacion'
              ],
              required: false
            },
            // 3. Próximas Citas
            {
              model: Cita,
              as: 'citas',
              attributes: [
                'id',
                'fecha_hora',
                'modalidad',
                'estado',
                'motivo_consulta',
                'enlace_virtual',
                'costo_pagado'
              ],
              where: {
                estado: {
                  [Op.notIn]: ['CANCELADA', 'COMPLETADA']
                },
                fecha_hora: {
                  [Op.gte]: new Date()
                }
              },
              order: [['fecha_hora', 'ASC']],
              required: false,
              include: [
                {
                  model: Medico,
                  as: 'medico',
                  attributes: ['id', 'nombres', 'apellidos', 'especialidad'],
                  required: false
                }
              ]
            },
            // 4. Suscripción Activa
            {
              model: Suscripcion,
              as: 'suscripciones',
              attributes: [
                'id',
                'fecha_inicio',
                'fecha_vencimiento',
                'estado',
                'auto_renovable',
                'consultas_virtuales_usadas',
                'consultas_presenciales_usadas'
              ],
              where: {
                estado: 'ACTIVA'
              },
              required: false,
              include: [
                {
                  model: Plan,
                  as: 'plan',
                  attributes: [
                    'id',
                    'nombre',
                    'codigo',
                    'descripcion',
                    'precio_mensual',
                    'duracion_meses',
                    'beneficios',
                    'consultas_virtuales_incluidas',
                    'consultas_presenciales_incluidas',
                    'descuento_productos'
                  ],
                  required: false
                }
              ],
              limit: 1
            },
            // 5. Órdenes de Pago
            {
              model: OrdenPago,
              as: 'ordenes_pago',
              attributes: [
                'id',
                'tipo_orden',
                'monto',
                'metodo_pago',
                'estado',
                'fecha_creacion',
                'fecha_pago',
                'referencia_transaccion',
                'comprobante_url'
              ],
              order: [['fecha_creacion', 'DESC']],
              required: false,
              limit: 10
            }
          ]
        }
      ]
    });

    if (!usuario || !usuario.paciente) {
      const error = new Error("Datos de paciente no encontrados");
      error.status = 404;
      throw error;
    }

    const paciente = usuario.paciente;

    // Formatear respuesta
    const response = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.toLowerCase(),
      activo: usuario.activo,
      ultimo_acceso: usuario.ultimo_acceso,
      datos_personales: {
        id: paciente.id,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        nombre_completo: `${paciente.nombres} ${paciente.apellidos}`,
        fecha_nacimiento: paciente.fecha_nacimiento,
        telefono: paciente.telefono,
        genero: paciente.genero,
        tipo_identificacion: paciente.tipo_identificacion,
        numero_identificacion: paciente.numero_identificacion,
        tipo_sangre: paciente.tipo_sangre,
        alergias: paciente.alergias || [],
        direcciones: paciente.direcciones || []
      },
      historial_medico: null,
      proximas_citas: [],
      plan_activo: null,
      ordenes_pago: []
    };

    // Historial médico
    if (paciente.historial_medico) {
      response.historial_medico = {
        id: paciente.historial_medico.id,
        enfermedades_cronicas: paciente.historial_medico.enfermedades_cronicas || [],
        cirugias_previas: paciente.historial_medico.cirugias_previas || [],
        medicamentos_actuales: paciente.historial_medico.medicamentos_actuales || [],
        ultima_actualizacion: paciente.historial_medico.fecha_actualizacion
      };
    }

    // Próximas citas
    if (paciente.citas?.length > 0) {
      response.proximas_citas = paciente.citas.map(cita => ({
        id: cita.id,
        fecha_hora: cita.fecha_hora,
        modalidad: cita.modalidad,
        estado: cita.estado,
        motivo_consulta: cita.motivo_consulta,
        enlace_virtual: cita.enlace_virtual,
        costo_pagado: cita.costo_pagado,
        medico: cita.medico ? {
          id: cita.medico.id,
          nombre_completo: `${cita.medico.nombres} ${cita.medico.apellidos}`,
          especialidad: cita.medico.especialidad
        } : null
      }));
    }

    // Plan activo
    if (paciente.suscripciones?.length > 0) {
      const sub = paciente.suscripciones[0];
      response.plan_activo = {
        suscripcion_id: sub.id,
        fecha_inicio: sub.fecha_inicio,
        fecha_vencimiento: sub.fecha_vencimiento,
        estado: sub.estado,
        auto_renovable: sub.auto_renovable,
        consultas_virtuales: {
          usadas: sub.consultas_virtuales_usadas || 0,
          incluidas: sub.plan?.consultas_virtuales_incluidas || 0,
          disponibles: Math.max(0, (sub.plan?.consultas_virtuales_incluidas || 0) - (sub.consultas_virtuales_usadas || 0))
        },
        consultas_presenciales: {
          usadas: sub.consultas_presenciales_usadas || 0,
          incluidas: sub.plan?.consultas_presenciales_incluidas || 0,
          disponibles: Math.max(0, (sub.plan?.consultas_presenciales_incluidas || 0) - (sub.consultas_presenciales_usadas || 0))
        },
        plan: sub.plan ? {
          id: sub.plan.id,
          nombre: sub.plan.nombre,
          codigo: sub.plan.codigo,
          descripcion: sub.plan.descripcion,
          precio_mensual: sub.plan.precio_mensual,
          duracion_meses: sub.plan.duracion_meses,
          beneficios: sub.plan.beneficios,
          descuento_productos: sub.plan.descuento_productos
        } : null
      };
    }

    // Órdenes de pago
    if (paciente.ordenes_pago?.length > 0) {
      response.ordenes_pago = paciente.ordenes_pago.map(orden => ({
        id: orden.id,
        tipo_orden: orden.tipo_orden,
        monto: orden.monto,
        metodo_pago: orden.metodo_pago,
        estado: orden.estado,
        fecha_creacion: orden.fecha_creacion,
        fecha_pago: orden.fecha_pago,
        referencia_transaccion: orden.referencia_transaccion,
        comprobante_url: orden.comprobante_url
      }));
    }

    logger.info(`Perfil de paciente obtenido: ${userId}`);

    return {
      success: true,
      usuario: response
    };
  }

  /**
   * PERFIL COMPLETO DE MÉDICO
   */
  async _getMedicoProfile(userId) {
    const usuario = await Usuario.findByPk(userId, {
      attributes: ['id', 'email', 'rol', 'activo', 'ultimo_acceso'],
      include: [
        {
          model: Medico,
          as: 'medico',
          attributes: [
            'id',
            'nombres',
            'apellidos',
            'especialidad',
            'numero_identificacion',
            'registro_medico',
            'telefono',
            'localidad',
            'costo_consulta_presencial',
            'costo_consulta_virtual',
            'calificacion_promedio'
          ],
          required: true,
          include: [
            // 1. Disponibilidades
            {
              model: DisponibilidadMedico,
              as: 'disponibilidades',
              attributes: [
                'id',
                'dia_semana',
                'hora_inicio',
                'hora_fin',
                'disponible'
              ],
              where: {
                disponible: true
              },
              required: false
            },
            // 2. Próximas Citas del Médico
            {
              model: Cita,
              as: 'citas',
              attributes: [
                'id',
                'fecha_hora',
                'modalidad',
                'estado',
                'motivo_consulta',
                'enlace_virtual'
              ],
              where: {
                estado: {
                  [Op.in]: ['AGENDADA', 'CONFIRMADA']
                },
                fecha_hora: {
                  [Op.gte]: new Date()
                }
              },
              order: [['fecha_hora', 'ASC']],
              required: false,
              include: [
                {
                  model: Paciente,
                  as: 'paciente',
                  attributes: ['id', 'nombres', 'apellidos', 'telefono'],
                  required: false
                }
              ]
            },
            // 3. Calificaciones recientes
            {
              model: CalificacionMedico,
              as: 'calificaciones',
              attributes: [
                'id',
                'puntuacion',
                'comentario',
                'fecha_creacion'
              ],
              order: [['fecha_creacion', 'DESC']],
              required: false,
              limit: 5,
              include: [
                {
                  model: Paciente,
                  as: 'paciente',
                  attributes: ['nombres', 'apellidos'],
                  required: false
                }
              ]
            }
          ]
        }
      ]
    });

    if (!usuario || !usuario.medico) {
      const error = new Error("Datos de médico no encontrados");
      error.status = 404;
      throw error;
    }

    const medico = usuario.medico;

    const response = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.toLowerCase(),
      activo: usuario.activo,
      ultimo_acceso: usuario.ultimo_acceso,
      datos_personales: {
        id: medico.id,
        nombres: medico.nombres,
        apellidos: medico.apellidos,
        nombre_completo: `${medico.nombres} ${medico.apellidos}`,
        especialidad: medico.especialidad,
        numero_licencia: medico.numero_licencia,
        telefono: medico.telefono,
        biografia: medico.biografia,
        tarifa_consulta: medico.tarifa_consulta,
        calificacion_promedio: medico.calificacion_promedio,
        total_consultas: medico.total_consultas
      },
      disponibilidades: [],
      proximas_citas: [],
      calificaciones_recientes: []
    };

    // Disponibilidades
    if (medico.disponibilidades?.length > 0) {
      response.disponibilidades = medico.disponibilidades.map(d => ({
        id: d.id,
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin,
        activo: d.activo
      }));
    }

    // Próximas citas
    if (medico.citas?.length > 0) {
      response.proximas_citas = medico.citas.map(cita => ({
        id: cita.id,
        fecha_hora: cita.fecha_hora,
        modalidad: cita.modalidad,
        estado: cita.estado,
        motivo_consulta: cita.motivo_consulta,
        enlace_virtual: cita.enlace_virtual,
        paciente: cita.paciente ? {
          id: cita.paciente.id,
          nombre_completo: `${cita.paciente.nombres} ${cita.paciente.apellidos}`,
          telefono: cita.paciente.telefono
        } : null
      }));
    }

    // Calificaciones
    if (medico.calificaciones?.length > 0) {
      response.calificaciones_recientes = medico.calificaciones.map(cal => ({
        id: cal.id,
        calificacion: cal.calificacion,
        comentario: cal.comentario,
        fecha: cal.fecha_creacion,
        paciente: cal.paciente ? `${cal.paciente.nombres} ${cal.paciente.apellidos}` : 'Anónimo'
      }));
    }

    logger.info(`Perfil de médico obtenido: ${userId}`);

    return {
      success: true,
      usuario: response
    };
  }

  /**
   * PERFIL BÁSICO (para ADMIN u otros roles)
   */
  async _getBasicProfile(userId) {
    const usuario = await Usuario.findByPk(userId, {
      attributes: ['id', 'email', 'rol', 'activo', 'ultimo_acceso']
    });

    return {
      success: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol.toLowerCase(),
        activo: usuario.activo,
        ultimo_acceso: usuario.ultimo_acceso
      }
    };
  }

  /**
   * Obtener estadísticas rápidas (para cualquier rol)
   */
  async getUserStats(userId, rol) {
    try {
      if (rol === 'PACIENTE') {
        return await this._getPacienteStats(userId);
      } else if (rol === 'MEDICO') {
        return await this._getMedicoStats(userId);
      }
      
      return {};
    } catch (error) {
      logger.error(`Error al obtener estadísticas de usuario ${userId}: ${error.message}`);
      throw error;
    }
  }

  async _getPacienteStats(userId) {
    const paciente = await Paciente.findOne({
      where: { usuario_id: userId },
      attributes: ['id']
    });

    if (!paciente) return { proximas_citas_count: 0, ordenes_pendientes_count: 0, tiene_plan_activo: false };

    const [citasCount, ordenesCount, suscripcionActiva] = await Promise.all([
      Cita.count({
        where: {
          paciente_id: paciente.id,
          estado: { [Op.notIn]: ['CANCELADA', 'COMPLETADA'] },
          fecha_hora: { [Op.gte]: new Date() }
        }
      }),
      OrdenPago.count({
        where: {
          paciente_id: paciente.id,
          estado: 'PENDIENTE'
        }
      }),
      Suscripcion.findOne({
        where: {
          paciente_id: paciente.id,
          estado: 'ACTIVA'
        },
        attributes: ['id']
      })
    ]);

    return {
      proximas_citas_count: citasCount,
      ordenes_pendientes_count: ordenesCount,
      tiene_plan_activo: !!suscripcionActiva
    };
  }

  async _getMedicoStats(userId) {
    const medico = await Medico.findOne({
      where: { usuario_id: userId },
      attributes: ['id']
    });

    if (!medico) return { proximas_citas_count: 0, calificacion_promedio: 0 };

    const citasCount = await Cita.count({
      where: {
        medico_id: medico.id,
        estado: { [Op.in]: ['AGENDADA', 'CONFIRMADA'] },
        fecha_hora: { [Op.gte]: new Date() }
      }
    });

    return {
      proximas_citas_count: citasCount
    };
  }
}

export default new UserService();
import { Sequelize } from 'sequelize';
import { sequelize } from '../database/database.js';

// ============================================
// IMPORTAR TODOS LOS MODELOS
// ============================================
import usuarioModel from './usuario.js';
import pacienteModel from './paciente.js';
import direccionModel from './direccion.js';
import medicoModel from './medico.js';
import disponibilidadMedicoModel from './disponibilidad_medico.js';
import solicitudRegistroModel from './solicitud_registro.js';
import documentoModel from './documento.js';
import resultadoValidacionModel from './resultado_validacion.js';
import citaModel from './cita.js';
import historialMedicoModel from './historial_medico.js';
import resultadoConsultaModel from './resultado_consulta.js';
import recetaModel from './receta.js';
import examenModel from './examen.js';
import planModel from './plan.js';
import suscripcionModel from './suscripcion.js';
import productoFarmaceuticoModel from './producto_farmaceutico.js';
import stockModel from './stock.js';
import compraModel from './compra.js';
import compraProductoModel from './compra_producto.js';
import calificacionMedicoModel from './calificacion_medico.js';
import calificacionProductoModel from './calificacion_producto.js';
import promocionModel from './promocion.js';
import promocionPacienteModel from './promocion_paciente.js';
import ordenPagoModel from './orden_pago.js';
import notificacionModel from './notificacion.js';
import auditoriaModel from './auditoria.js';

// ============================================
// INICIALIZAR MODELOS
// ============================================
const Usuario = usuarioModel(sequelize, Sequelize.DataTypes);
const Paciente = pacienteModel(sequelize, Sequelize.DataTypes);
const Direccion = direccionModel(sequelize, Sequelize.DataTypes);
const Medico = medicoModel(sequelize, Sequelize.DataTypes);
const DisponibilidadMedico = disponibilidadMedicoModel(sequelize, Sequelize.DataTypes);
const SolicitudRegistro = solicitudRegistroModel(sequelize, Sequelize.DataTypes);
const Documento = documentoModel(sequelize, Sequelize.DataTypes);
const ResultadoValidacion = resultadoValidacionModel(sequelize, Sequelize.DataTypes);
const Cita = citaModel(sequelize, Sequelize.DataTypes);
const HistorialMedico = historialMedicoModel(sequelize, Sequelize.DataTypes);
const ResultadoConsulta = resultadoConsultaModel(sequelize, Sequelize.DataTypes);
const Receta = recetaModel(sequelize, Sequelize.DataTypes);
const Examen = examenModel(sequelize, Sequelize.DataTypes);
const Plan = planModel(sequelize, Sequelize.DataTypes);
const Suscripcion = suscripcionModel(sequelize, Sequelize.DataTypes);
const ProductoFarmaceutico = productoFarmaceuticoModel(sequelize, Sequelize.DataTypes);
const Stock = stockModel(sequelize, Sequelize.DataTypes);
const Compra = compraModel(sequelize, Sequelize.DataTypes);
const CompraProducto = compraProductoModel(sequelize, Sequelize.DataTypes);
const CalificacionMedico = calificacionMedicoModel(sequelize, Sequelize.DataTypes);
const CalificacionProducto = calificacionProductoModel(sequelize, Sequelize.DataTypes);
const Promocion = promocionModel(sequelize, Sequelize.DataTypes);
const PromocionPaciente = promocionPacienteModel(sequelize, Sequelize.DataTypes);
const OrdenPago = ordenPagoModel(sequelize, Sequelize.DataTypes);
const Notificacion = notificacionModel(sequelize, Sequelize.DataTypes);
const Auditoria = auditoriaModel(sequelize, Sequelize.DataTypes);

// ============================================
// DEFINIR ASOCIACIONES (RELACIONES)
// ============================================

// ============================================
// USUARIO - PACIENTE (1:1)
// ============================================
Usuario.hasOne(Paciente, {
  foreignKey: 'usuario_id',
  as: 'paciente',
  onDelete: 'CASCADE'
});
Paciente.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// ============================================
// USUARIO - MEDICO (1:1)
// ============================================
Usuario.hasOne(Medico, {
  foreignKey: 'usuario_id',
  as: 'medico',
  onDelete: 'CASCADE'
});
Medico.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// ============================================
// USUARIO - AUDITORÍA (1:N)
// ============================================
Usuario.hasMany(Auditoria, {
  foreignKey: 'usuario_id',
  as: 'auditorias'
});
Auditoria.belongsTo(Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuario'
});

// ============================================
// PACIENTE - DIRECCION (1:N)
// ============================================
Paciente.hasMany(Direccion, {
  foreignKey: 'paciente_id',
  as: 'direcciones',
  onDelete: 'CASCADE'
});
Direccion.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// PACIENTE - SOLICITUD_REGISTRO (1:N)
// ============================================
Paciente.hasMany(SolicitudRegistro, {
  foreignKey: 'paciente_id',
  as: 'solicitudes',
  onDelete: 'CASCADE'
});
SolicitudRegistro.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// Usuario (revisor) - SolicitudRegistro
Usuario.hasMany(SolicitudRegistro, {
  foreignKey: 'revisado_por',
  as: 'solicitudes_revisadas'
});
SolicitudRegistro.belongsTo(Usuario, {
  foreignKey: 'revisado_por',
  as: 'revisador'
});

// ============================================
// SOLICITUD_REGISTRO - DOCUMENTO (1:N)
// ============================================
SolicitudRegistro.hasMany(Documento, {
  foreignKey: 'solicitud_id',
  as: 'documentos',
  onDelete: 'CASCADE'
});
Documento.belongsTo(SolicitudRegistro, {
  foreignKey: 'solicitud_id',
  as: 'solicitud'
});

// ============================================
// PACIENTE - DOCUMENTO (1:N) - Post-aprobación
// ============================================
Paciente.hasMany(Documento, {
  foreignKey: 'paciente_id',
  as: 'documentos',
  onDelete: 'CASCADE'
});
Documento.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// SOLICITUD_REGISTRO - RESULTADO_VALIDACION (1:N)
// ============================================
SolicitudRegistro.hasMany(ResultadoValidacion, {
  foreignKey: 'solicitud_id',
  as: 'validaciones',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
ResultadoValidacion.belongsTo(SolicitudRegistro, {
  foreignKey: 'solicitud_id',
  as: 'solicitud',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

// Usuario (validador) - ResultadoValidacion
Usuario.hasMany(ResultadoValidacion, {
  foreignKey: 'validado_por',
  as: 'validaciones_realizadas'
});
ResultadoValidacion.belongsTo(Usuario, {
  foreignKey: 'validado_por',
  as: 'validador'
});

// ============================================
// MEDICO - DISPONIBILIDAD_MEDICO (1:N)
// ============================================
Medico.hasMany(DisponibilidadMedico, {
  foreignKey: 'medico_id',
  as: 'disponibilidades',
  onDelete: 'CASCADE'
});
DisponibilidadMedico.belongsTo(Medico, {
  foreignKey: 'medico_id',
  as: 'medico'
});

// ============================================
// PACIENTE - HISTORIAL_MEDICO (1:1)
// ============================================
Paciente.hasOne(HistorialMedico, {
  foreignKey: 'paciente_id',
  as: 'historial_medico',
  onDelete: 'CASCADE'
});
HistorialMedico.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// PACIENTE - CITA (1:N)
// ============================================
Paciente.hasMany(Cita, {
  foreignKey: 'paciente_id',
  as: 'citas',
  onDelete: 'CASCADE'
});
Cita.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// MEDICO - CITA (1:N)
// ============================================
Medico.hasMany(Cita, {
  foreignKey: 'medico_id',
  as: 'citas',
  onDelete: 'CASCADE'
});
Cita.belongsTo(Medico, {
  foreignKey: 'medico_id',
  as: 'medico'
});

// ============================================
// CITA - RESULTADO_CONSULTA (1:1)
// ============================================
Cita.hasOne(ResultadoConsulta, {
  foreignKey: 'cita_id',
  as: 'resultado_consulta',
  onDelete: 'CASCADE'
});
ResultadoConsulta.belongsTo(Cita, {
  foreignKey: 'cita_id',
  as: 'cita'
});

// ============================================
// HISTORIAL_MEDICO - RESULTADO_CONSULTA (1:N)
// ============================================
HistorialMedico.hasMany(ResultadoConsulta, {
  foreignKey: 'historial_id',
  as: 'resultados_consultas',
  onDelete: 'CASCADE'
});
ResultadoConsulta.belongsTo(HistorialMedico, {
  foreignKey: 'historial_id',
  as: 'historial'
});

// ============================================
// CITA - RECETA (1:N)
// ============================================
Cita.hasMany(Receta, {
  foreignKey: 'cita_id',
  as: 'recetas',
  onDelete: 'CASCADE'
});
Receta.belongsTo(Cita, {
  foreignKey: 'cita_id',
  as: 'cita'
});

// ============================================
// HISTORIAL_MEDICO - RECETA (1:N)
// ============================================
HistorialMedico.hasMany(Receta, {
  foreignKey: 'historial_id',
  as: 'recetas',
  onDelete: 'CASCADE'
});
Receta.belongsTo(HistorialMedico, {
  foreignKey: 'historial_id',
  as: 'historial'
});

// ============================================
// HISTORIAL_MEDICO - EXAMEN (1:N)
// ============================================
HistorialMedico.hasMany(Examen, {
  foreignKey: 'historial_id',
  as: 'examenes',
  onDelete: 'CASCADE'
});
Examen.belongsTo(HistorialMedico, {
  foreignKey: 'historial_id',
  as: 'historial'
});

// ============================================
// CITA - EXAMEN (1:N) - Opcional
// ============================================
Cita.hasMany(Examen, {
  foreignKey: 'cita_id',
  as: 'examenes'
});
Examen.belongsTo(Cita, {
  foreignKey: 'cita_id',
  as: 'cita'
});

// ============================================
// PLAN - SUSCRIPCION (1:N)
// ============================================
Plan.hasMany(Suscripcion, {
  foreignKey: 'plan_id',
  as: 'suscripciones'
});
Suscripcion.belongsTo(Plan, {
  foreignKey: 'plan_id',
  as: 'plan'
});

// ============================================
// PACIENTE - SUSCRIPCION (1:N)
// ============================================
Paciente.hasMany(Suscripcion, {
  foreignKey: 'paciente_id',
  as: 'suscripciones',
  onDelete: 'CASCADE'
});
Suscripcion.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// PRODUCTO_FARMACEUTICO - STOCK (1:1)
// ============================================
ProductoFarmaceutico.hasOne(Stock, {
  foreignKey: 'producto_id',
  as: 'stock',
  onDelete: 'CASCADE'
});
Stock.belongsTo(ProductoFarmaceutico, {
  foreignKey: 'producto_id',
  as: 'producto'
});

// ============================================
// PACIENTE - COMPRA (1:N)
// ============================================
Paciente.hasMany(Compra, {
  foreignKey: 'paciente_id',
  as: 'compras',
  onDelete: 'CASCADE'
});
Compra.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// DIRECCION - COMPRA (1:N)
// ============================================
Direccion.hasMany(Compra, {
  foreignKey: 'direccion_entrega_id',
  as: 'compras'
});
Compra.belongsTo(Direccion, {
  foreignKey: 'direccion_entrega_id',
  as: 'direccion_entrega'
});

// ============================================
// COMPRA - COMPRA_PRODUCTO (1:N)
// ============================================
Compra.hasMany(CompraProducto, {
  foreignKey: 'compra_id',
  as: 'productos',
  onDelete: 'CASCADE'
});
CompraProducto.belongsTo(Compra, {
  foreignKey: 'compra_id',
  as: 'compra'
});

// ============================================
// PRODUCTO_FARMACEUTICO - COMPRA_PRODUCTO (1:N)
// ============================================
ProductoFarmaceutico.hasMany(CompraProducto, {
  foreignKey: 'producto_id',
  as: 'compras'
});
CompraProducto.belongsTo(ProductoFarmaceutico, {
  foreignKey: 'producto_id',
  as: 'producto'
});

// ============================================
// RELACIÓN MANY-TO-MANY: COMPRA <-> PRODUCTO_FARMACEUTICO
// A través de COMPRA_PRODUCTO
// ============================================
Compra.belongsToMany(ProductoFarmaceutico, {
  through: CompraProducto,
  foreignKey: 'compra_id',
  otherKey: 'producto_id',
  as: 'productos_comprados'
});
ProductoFarmaceutico.belongsToMany(Compra, {
  through: CompraProducto,
  foreignKey: 'producto_id',
  otherKey: 'compra_id',
  as: 'compras_realizadas'
});

// ============================================
// PACIENTE - CALIFICACION_MEDICO (1:N)
// ============================================
Paciente.hasMany(CalificacionMedico, {
  foreignKey: 'paciente_id',
  as: 'calificaciones_medicos',
  onDelete: 'CASCADE'
});
CalificacionMedico.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// MEDICO - CALIFICACION_MEDICO (1:N)
// ============================================
Medico.hasMany(CalificacionMedico, {
  foreignKey: 'medico_id',
  as: 'calificaciones',
  onDelete: 'CASCADE'
});
CalificacionMedico.belongsTo(Medico, {
  foreignKey: 'medico_id',
  as: 'medico'
});

// ============================================
// CITA - CALIFICACION_MEDICO (1:1)
// ============================================
Cita.hasOne(CalificacionMedico, {
  foreignKey: 'cita_id',
  as: 'calificacion'
});
CalificacionMedico.belongsTo(Cita, {
  foreignKey: 'cita_id',
  as: 'cita'
});

// ============================================
// PACIENTE - CALIFICACION_PRODUCTO (1:N)
// ============================================
Paciente.hasMany(CalificacionProducto, {
  foreignKey: 'paciente_id',
  as: 'calificaciones_productos',
  onDelete: 'CASCADE'
});
CalificacionProducto.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// PRODUCTO_FARMACEUTICO - CALIFICACION_PRODUCTO (1:N)
// ============================================
ProductoFarmaceutico.hasMany(CalificacionProducto, {
  foreignKey: 'producto_id',
  as: 'calificaciones',
  onDelete: 'CASCADE'
});
CalificacionProducto.belongsTo(ProductoFarmaceutico, {
  foreignKey: 'producto_id',
  as: 'producto'
});

// ============================================
// COMPRA - CALIFICACION_PRODUCTO (1:N)
// ============================================
Compra.hasMany(CalificacionProducto, {
  foreignKey: 'compra_id',
  as: 'calificaciones'
});
CalificacionProducto.belongsTo(Compra, {
  foreignKey: 'compra_id',
  as: 'compra'
});

// ============================================
// PRODUCTO_FARMACEUTICO - PROMOCION (1:N)
// ============================================
ProductoFarmaceutico.hasMany(Promocion, {
  foreignKey: 'producto_id',
  as: 'promociones'
});
Promocion.belongsTo(ProductoFarmaceutico, {
  foreignKey: 'producto_id',
  as: 'producto'
});

// ============================================
// PROMOCION - PROMOCION_PACIENTE (1:N)
// ============================================
Promocion.hasMany(PromocionPaciente, {
  foreignKey: 'promocion_id',
  as: 'asignaciones',
  onDelete: 'CASCADE'
});
PromocionPaciente.belongsTo(Promocion, {
  foreignKey: 'promocion_id',
  as: 'promocion'
});

// ============================================
// PACIENTE - PROMOCION_PACIENTE (1:N)
// ============================================
Paciente.hasMany(PromocionPaciente, {
  foreignKey: 'paciente_id',
  as: 'promociones_asignadas',
  onDelete: 'CASCADE'
});
PromocionPaciente.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// RELACIÓN MANY-TO-MANY: PACIENTE <-> PROMOCION
// A través de PROMOCION_PACIENTE
// ============================================
Paciente.belongsToMany(Promocion, {
  through: PromocionPaciente,
  foreignKey: 'paciente_id',
  otherKey: 'promocion_id',
  as: 'promociones'
});
Promocion.belongsToMany(Paciente, {
  through: PromocionPaciente,
  foreignKey: 'promocion_id',
  otherKey: 'paciente_id',
  as: 'pacientes'
});

// ============================================
// PACIENTE - ORDEN_PAGO (1:N)
// ============================================
Paciente.hasMany(OrdenPago, {
  foreignKey: 'paciente_id',
  as: 'ordenes_pago'
});
OrdenPago.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// SUSCRIPCION - ORDEN_PAGO (1:N)
// ============================================
Suscripcion.hasMany(OrdenPago, {
  foreignKey: 'suscripcion_id',
  as: 'pagos'
});
OrdenPago.belongsTo(Suscripcion, {
  foreignKey: 'suscripcion_id',
  as: 'suscripcion'
});

// ============================================
// COMPRA - ORDEN_PAGO (1:N)
// ============================================
Compra.hasMany(OrdenPago, {
  foreignKey: 'compra_id',
  as: 'pagos'
});
OrdenPago.belongsTo(Compra, {
  foreignKey: 'compra_id',
  as: 'compra'
});

// ============================================
// CITA - ORDEN_PAGO (1:N)
// ============================================
Cita.hasMany(OrdenPago, {
  foreignKey: 'cita_id',
  as: 'pagos'
});
OrdenPago.belongsTo(Cita, {
  foreignKey: 'cita_id',
  as: 'cita'
});

// ============================================
// PACIENTE - NOTIFICACION (1:N)
// ============================================
Paciente.hasMany(Notificacion, {
  foreignKey: 'paciente_id',
  as: 'notificaciones',
  onDelete: 'CASCADE'
});
Notificacion.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

// ============================================
// RECETA - NOTIFICACION (1:N)
// ============================================
Receta.hasMany(Notificacion, {
  foreignKey: 'receta_id',
  as: 'notificaciones'
});
Notificacion.belongsTo(Receta, {
  foreignKey: 'receta_id',
  as: 'receta'
});

// ============================================
// CITA - NOTIFICACION (1:N)
// ============================================
Cita.hasMany(Notificacion, {
  foreignKey: 'cita_id',
  as: 'notificaciones'
});
Notificacion.belongsTo(Cita, {
  foreignKey: 'cita_id',
  as: 'cita'
});

// ============================================
// COMPRA - NOTIFICACION (1:N)
// ============================================
Compra.hasMany(Notificacion, {
  foreignKey: 'compra_id',
  as: 'notificaciones'
});
Notificacion.belongsTo(Compra, {
  foreignKey: 'compra_id',
  as: 'compra'
});

// ============================================
// PROMOCION - NOTIFICACION (1:N)
// ============================================
Promocion.hasMany(Notificacion, {
  foreignKey: 'promocion_id',
  as: 'notificaciones'
});
Notificacion.belongsTo(Promocion, {
  foreignKey: 'promocion_id',
  as: 'promocion'
});

// ============================================
// EXPORTAR DB CON TODOS LOS MODELOS
// ============================================
const db = {
  sequelize,
  Sequelize,
  
  // Modelos de usuarios y autenticación
  Usuario,
  Paciente,
  Medico,
  
  // Modelos de solicitudes
  SolicitudRegistro,
  Documento,
  ResultadoValidacion,
  
  // Modelos de dirección
  Direccion,
  
  // Modelos médicos
  DisponibilidadMedico,
  Cita,
  HistorialMedico,
  ResultadoConsulta,
  Receta,
  Examen,
  
  // Modelos de suscripciones
  Plan,
  Suscripcion,
  
  // Modelos de productos
  ProductoFarmaceutico,
  Stock,
  
  // Modelos de compras
  Compra,
  CompraProducto,
  
  // Modelos de calificaciones
  CalificacionMedico,
  CalificacionProducto,
  
  // Modelos de promociones
  Promocion,
  PromocionPaciente,
  
  // Modelos de pagos
  OrdenPago,
  
  // Modelos de notificaciones
  Notificacion,
  
  // Modelo de auditoría
  Auditoria
};

export default db;

export {
  sequelize,
  Sequelize,
  Usuario,
  Paciente,
  Direccion,
  Medico,
  DisponibilidadMedico,
  SolicitudRegistro,
  Documento,
  ResultadoValidacion,
  Cita,
  HistorialMedico,
  ResultadoConsulta,
  Receta,
  Examen,
  Plan,
  Suscripcion,
  ProductoFarmaceutico,
  Stock,
  Compra,
  CompraProducto,
  CalificacionMedico,
  CalificacionProducto,
  Promocion,
  PromocionPaciente,
  OrdenPago,
  Notificacion,
  Auditoria
};
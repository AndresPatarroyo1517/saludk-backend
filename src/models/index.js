import { Sequelize } from 'sequelize';
import { sequelize } from '../database/database.js';

import usuarioModel from './usuario.js';
import pacienteModel from './paciente.js';
import medicoModel from './medico.js';
import solicitudRegistroModel from './solicitud_registro.js';
import resultadoValidacionModel from './resultado_validacion.js';
import suscripcionModel from './suscripcion.js';
import planModel from './plan.js';
import ordenPagoModel from './orden_pago.js';

// Inicializar modelos
const Usuario = usuarioModel(sequelize, Sequelize.DataTypes);
const Paciente = pacienteModel(sequelize, Sequelize.DataTypes);
const Medico = medicoModel(sequelize, Sequelize.DataTypes);
const SolicitudRegistro = solicitudRegistroModel(sequelize, Sequelize.DataTypes);
const ResultadoValidacion = resultadoValidacionModel(sequelize, Sequelize.DataTypes);
const Suscripcion = suscripcionModel(sequelize, Sequelize.DataTypes);
const Plan = planModel(sequelize, Sequelize.DataTypes);
const Orden_Pago = ordenPagoModel(sequelize, Sequelize.DataTypes);

// Definir asociaciones (relaciones entre modelos)
// Usuario - Paciente (uno a uno)
Usuario.hasOne(Paciente, { foreignKey: 'usuario_id', as: 'paciente' });
Paciente.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Usuario - Medico (uno a uno)
Usuario.hasOne(Medico, { foreignKey: 'usuario_id', as: 'medico' });
Medico.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Paciente - SolicitudRegistro (uno a uno)
Paciente.hasOne(SolicitudRegistro, { foreignKey: 'paciente_id', as: 'solicitud' });
SolicitudRegistro.belongsTo(Paciente, { foreignKey: 'paciente_id', as: 'paciente' });

// Usuario (revisor) - SolicitudRegistro (uno a muchos)
Usuario.hasMany(SolicitudRegistro, { foreignKey: 'revisado_por', as: 'solicitudes_revisadas' });
SolicitudRegistro.belongsTo(Usuario, { foreignKey: 'revisado_por', as: 'revisador' });

// SolicitudRegistro - ResultadoValidacion (1—N)

SolicitudRegistro.hasMany(ResultadoValidacion, {
  foreignKey: 'solicitud_id',
  as: 'validaciones',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
ResultadoValidacion.belongsTo(SolicitudRegistro, {
  foreignKey: 'solicitud_id',
  as: 'solicitud',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// Suscripciones, planes y ordenes de pago
Paciente.hasMany(Suscripcion, { foreignKey: 'paciente_id' });
Suscripcion.belongsTo(Paciente, { foreignKey: 'paciente_id' });

Plan.hasMany(Suscripcion, { foreignKey: 'plan_id' });
Suscripcion.belongsTo(Plan, { foreignKey: 'plan_id' });

Paciente.hasMany(Orden_Pago, { foreignKey: 'paciente_id' });
Orden_Pago.belongsTo(Paciente, { foreignKey: 'paciente_id' });

Suscripcion.hasMany(Orden_Pago, { foreignKey: 'suscripcion_id' });
Orden_Pago.belongsTo(Suscripcion, { foreignKey: 'suscripcion_id' });

// Exportar todos los modelos
const db = {
  sequelize,
  Sequelize,
  Usuario,
  Paciente,
  Suscripcion,
  Plan,
  Orden_Pago,
  Medico,
  SolicitudRegistro,
  ResultadoValidacion
};

export default db;

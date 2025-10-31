const { sequelize } = require('../database/database');
const { DataTypes } = require('sequelize');

// Importar todos los modelos
const PacienteModel = require('./paciente');
const SuscripcionModel = require('./suscripcion');
const PlanModel = require('./plan');

// Inicializar modelos
const Paciente = PacienteModel(sequelize, DataTypes);
const Suscripcion = SuscripcionModel(sequelize, DataTypes);
const Plan = PlanModel(sequelize, DataTypes);

// Si tienes más modelos, inicialízalos aquí
// const Usuario = require('./usuario')(sequelize, DataTypes);
// const Cita = require('./cita')(sequelize, DataTypes);

// Un paciente puede tener muchas suscripciones
Paciente.hasMany(Suscripcion, { foreignKey: 'paciente_id' });

// Una suscripción pertenece a un paciente
Suscripcion.belongsTo(Paciente, { foreignKey: 'paciente_id' });

// Un plan puede estar en muchas suscripciones
Plan.hasMany(Suscripcion, { foreignKey: 'plan_id' });

// Una suscripción pertenece a un plan
Suscripcion.belongsTo(Plan, { foreignKey: 'plan_id' });

// Definir asociaciones si las hay
// Paciente.belongsTo(Usuario, { foreignKey: 'usuario_id' });
// Usuario.hasOne(Paciente, { foreignKey: 'usuario_id' });

// Exportar todos los modelos
const db = {
  sequelize,
  Paciente,
  Suscripcion,
  Plan,
  // Usuario,
  // Cita,
};

module.exports = db;
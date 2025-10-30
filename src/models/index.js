const { sequelize } = require('../database/database');
const { DataTypes } = require('sequelize');

// Importar todos los modelos
const PacienteModel = require('./paciente');

// Inicializar modelos
const Paciente = PacienteModel(sequelize, DataTypes);

// Si tienes más modelos, inicialízalos aquí
// const Usuario = require('./usuario')(sequelize, DataTypes);
// const Cita = require('./cita')(sequelize, DataTypes);

// Definir asociaciones si las hay
// Paciente.belongsTo(Usuario, { foreignKey: 'usuario_id' });
// Usuario.hasOne(Paciente, { foreignKey: 'usuario_id' });

// Exportar todos los modelos
const db = {
  sequelize,
  Paciente,
  // Usuario,
  // Cita,
};

module.exports = db;
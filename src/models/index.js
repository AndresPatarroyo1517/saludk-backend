import { Sequelize } from 'sequelize';
import { sequelize } from '../database/database.js';

// Importar todas las definiciones de modelos
import usuarioModel from './usuario.js';
import pacienteModel from './paciente.js';
import medicoModel from './medico.js';
import solicitudRegistroModel from './solicitud_registro.js';
import resultadoValidacionModel from './resultado_validacion.js';

// Inicializar modelos
const Usuario = usuarioModel(sequelize, Sequelize.DataTypes);
const Paciente = pacienteModel(sequelize, Sequelize.DataTypes);
const Medico = medicoModel(sequelize, Sequelize.DataTypes);
const SolicitudRegistro = solicitudRegistroModel(sequelize, Sequelize.DataTypes);
const ResultadoValidacion = resultadoValidacionModel(sequelize, Sequelize.DataTypes)

// Definir asociaciones (relaciones entre modelos)
// Usuario - Paciente (uno a uno)
Usuario.hasOne(Paciente, { 
  foreignKey: 'usuario_id', 
  as: 'paciente' 
});
Paciente.belongsTo(Usuario, { 
  foreignKey: 'usuario_id', 
  as: 'usuario' 
});

// Usuario - Medico (uno a uno)
Usuario.hasOne(Medico, { 
  foreignKey: 'usuario_id', 
  as: 'medico' 
});
Medico.belongsTo(Usuario, { 
  foreignKey: 'usuario_id', 
  as: 'usuario' 
});

// Paciente - SolicitudRegistro (uno a uno)
Paciente.hasOne(SolicitudRegistro, { 
  foreignKey: 'paciente_id', 
  as: 'solicitud' 
});
SolicitudRegistro.belongsTo(Paciente, { 
  foreignKey: 'paciente_id', 
  as: 'paciente' 
});

// Usuario (revisor) - SolicitudRegistro (uno a muchos)
Usuario.hasMany(SolicitudRegistro, { 
  foreignKey: 'revisado_por', 
  as: 'solicitudes_revisadas' 
});
SolicitudRegistro.belongsTo(Usuario, { 
  foreignKey: 'revisado_por', 
  as: 'revisador' 
});

// SolicitudRegistro - ResultadoValidacion (1—N)
SolicitudRegistro.hasMany(ResultadoValidacion, { foreignKey: 'solicitud_id', as: 'validaciones' });
ResultadoValidacion.belongsTo(SolicitudRegistro, { foreignKey: 'solicitud_id', as: 'solicitud' });


// Exportar todos los modelos
const db = {
  sequelize,
  Sequelize,
  Usuario,
  Paciente,
  Medico,
  SolicitudRegistro,
  ResultadoValidacion
};

export default db;
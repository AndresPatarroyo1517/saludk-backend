import { Sequelize } from 'sequelize';
import { sequelize } from '../database/database.js';

<<<<<<< HEAD
// Importar todos los modelos
const PacienteModel = require('./paciente');
const SuscripcionModel = require('./suscripcion');
const PlanModel = require('./plan');
const OrdenPagoModel = require('./orden_pago');

// Inicializar modelos
const Paciente = PacienteModel(sequelize, DataTypes);
const Suscripcion = SuscripcionModel(sequelize, DataTypes);
const Plan = PlanModel(sequelize, DataTypes);
const Orden_Pago = OrdenPagoModel(sequelize, DataTypes);
=======
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
>>>>>>> origin/main

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

<<<<<<< HEAD
// Un paciente puede tener muchas suscripciones
Paciente.hasMany(Suscripcion, { foreignKey: 'paciente_id' });

// Una suscripción pertenece a un paciente
Suscripcion.belongsTo(Paciente, { foreignKey: 'paciente_id' });

// Un plan puede estar en muchas suscripciones
Plan.hasMany(Suscripcion, { foreignKey: 'plan_id' });

// Una suscripción pertenece a un plan
Suscripcion.belongsTo(Plan, { foreignKey: 'plan_id' });

// Un paciente puede tener muchas ordenes de pago
Paciente.hasMany(Orden_Pago, { foreignKey: 'paciente_id' });
Orden_Pago.belongsTo(Paciente, { foreignKey: 'paciente_id' });

// Una suscripción puede tener muchas ordenes de pago (por ejemplo pagos parciales)
Suscripcion.hasMany(Orden_Pago, { foreignKey: 'suscripcion_id' });
Orden_Pago.belongsTo(Suscripcion, { foreignKey: 'suscripcion_id' });

// Definir asociaciones si las hay
// Paciente.belongsTo(Usuario, { foreignKey: 'usuario_id' });
// Usuario.hasOne(Paciente, { foreignKey: 'usuario_id' });
=======
>>>>>>> origin/main

// Exportar todos los modelos
const db = {
  sequelize,
  Sequelize,
  Usuario,
  Paciente,
<<<<<<< HEAD
  Suscripcion,
  Plan,
  Orden_Pago,
  // Usuario,
  // Cita,
=======
  Medico,
  SolicitudRegistro,
  ResultadoValidacion
>>>>>>> origin/main
};

export default db;
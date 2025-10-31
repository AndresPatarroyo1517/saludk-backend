import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('paciente', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'usuario',
        key: 'id'
      },
      unique: "paciente_usuario_id_key"
    },
    numero_identificacion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "paciente_numero_identificacion_key"
    },
    tipo_identificacion:  {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: {
          args: [['CC', 'CAE', 'TIN', 'CE', 'PAS', 'NIE']],
          msg: 'El tipo de identificación debe ser: CC, CAE, TIN, CE, PAS o NIE'
        }
      },
      comment: `
        CC – Cédula de Ciudadanía (para ciudadanos colombianos)
        CAE – Carné de Afiliación EPS (para pacientes afiliados a una EPS)
        TIN – Tarjeta de Identificación Niño (para menores de edad)
        CE – Cédula de Extranjería (para extranjeros residentes en Colombia)
        PAS – Pasaporte (para extranjeros temporales o turistas)
        NIE – Número de Identificación de Extranjeros (para residentes temporales o estatus migratorio específico)
      `,
    }, 
    nombres: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    apellidos: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    tipo_sangre: {
      type: DataTypes.STRING(5),
      allowNull: true,
      validate: {
        isIn: {
          args: [['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']],
          msg: 'El tipo de sangre debe ser válido'
        }
      }
    },
    alergias: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    genero: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'paciente',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_paciente_apellidos",
        fields: [
          { name: "apellidos" },
        ]
      },
      {
        name: "idx_paciente_identificacion",
        fields: [
          { name: "numero_identificacion" },
        ]
      },
      {
        name: "idx_paciente_nombres",
        fields: [
          { name: "nombres" },
        ]
      },
      {
        name: "idx_paciente_usuario",
        fields: [
          { name: "usuario_id" },
        ]
      },
      {
        name: "paciente_numero_identificacion_key",
        unique: true,
        fields: [
          { name: "numero_identificacion" },
        ]
      },
      {
        name: "paciente_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "paciente_usuario_id_key",
        unique: true,
        fields: [
          { name: "usuario_id" },
        ]
      },
    ]
  });
};

import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('medico', {
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
      unique: "medico_usuario_id_key"
    },
    numero_identificacion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "medico_numero_identificacion_key"
    },
    nombres: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    apellidos: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    especialidad: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    registro_medico: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "medico_registro_medico_key"
    },
    calificacion_promedio: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    costo_consulta_presencial: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    costo_consulta_virtual: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    localidad: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    fecha_registro: {
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
    tableName: 'medico',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_medico_disponible",
        fields: [
          { name: "disponible" },
        ]
      },
      {
        name: "idx_medico_especialidad",
        fields: [
          { name: "especialidad" },
        ]
      },
      {
        name: "idx_medico_localidad",
        fields: [
          { name: "localidad" },
        ]
      },
      {
        name: "idx_medico_usuario",
        fields: [
          { name: "usuario_id" },
        ]
      },
      {
        name: "medico_numero_identificacion_key",
        unique: true,
        fields: [
          { name: "numero_identificacion" },
        ]
      },
      {
        name: "medico_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "medico_registro_medico_key",
        unique: true,
        fields: [
          { name: "registro_medico" },
        ]
      },
      {
        name: "medico_usuario_id_key",
        unique: true,
        fields: [
          { name: "usuario_id" },
        ]
      },
    ]
  });
};

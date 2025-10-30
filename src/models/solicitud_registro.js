const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('solicitud_registro', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    paciente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'paciente',
        key: 'id'
      }
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDIENTE"
    },
    motivo_decision: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resultados_bd_externas: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    revisado_por: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuario',
        key: 'id'
      }
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    fecha_validacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'solicitud_registro',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_solicitud_estado",
        fields: [
          { name: "estado" },
        ]
      },
      {
        name: "idx_solicitud_fecha",
        fields: [
          { name: "fecha_creacion" },
        ]
      },
      {
        name: "idx_solicitud_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_solicitud_revisado",
        fields: [
          { name: "revisado_por" },
        ]
      },
      {
        name: "solicitud_registro_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

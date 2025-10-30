const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('cita', {
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
    medico_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'medico',
        key: 'id'
      }
    },
    fecha_hora: {
      type: DataTypes.DATE,
      allowNull: false
    },
    modalidad: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "AGENDADA"
    },
    motivo_consulta: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    enlace_virtual: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notas_consulta: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    costo_pagado: {
      type: DataTypes.DECIMAL,
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
    tableName: 'cita',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "cita_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_cita_estado",
        fields: [
          { name: "estado" },
        ]
      },
      {
        name: "idx_cita_fecha",
        fields: [
          { name: "fecha_hora" },
        ]
      },
      {
        name: "idx_cita_medico",
        fields: [
          { name: "medico_id" },
        ]
      },
      {
        name: "idx_cita_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
    ]
  });
};

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('calificacion_medico', {
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
    cita_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cita',
        key: 'id'
      },
      unique: "unique_calificacion_cita"
    },
    puntuacion: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'calificacion_medico',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "calificacion_medico_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_calificacion_medico_medico",
        fields: [
          { name: "medico_id" },
        ]
      },
      {
        name: "idx_calificacion_medico_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "unique_calificacion_cita",
        unique: true,
        fields: [
          { name: "cita_id" },
        ]
      },
    ]
  });
};

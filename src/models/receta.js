const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('receta', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cita_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cita',
        key: 'id'
      }
    },
    historial_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'historial_medico',
        key: 'id'
      }
    },
    medicamento: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    dosis: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    frecuencia: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    duracion_dias: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    indicaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('current_date')
    },
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    renovable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'receta',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_receta_cita",
        fields: [
          { name: "cita_id" },
        ]
      },
      {
        name: "idx_receta_historial",
        fields: [
          { name: "historial_id" },
        ]
      },
      {
        name: "idx_receta_vencimiento",
        fields: [
          { name: "fecha_vencimiento" },
        ]
      },
      {
        name: "receta_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

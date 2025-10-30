const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('resultado_consulta', {
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
      },
      unique: "resultado_consulta_cita_id_key"
    },
    historial_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'historial_medico',
        key: 'id'
      }
    },
    diagnostico: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sintomas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    proximo_control: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'resultado_consulta',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_resultado_cita",
        fields: [
          { name: "cita_id" },
        ]
      },
      {
        name: "idx_resultado_historial",
        fields: [
          { name: "historial_id" },
        ]
      },
      {
        name: "resultado_consulta_cita_id_key",
        unique: true,
        fields: [
          { name: "cita_id" },
        ]
      },
      {
        name: "resultado_consulta_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

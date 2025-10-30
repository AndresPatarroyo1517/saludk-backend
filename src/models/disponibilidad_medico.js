const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('disponibilidad_medico', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    medico_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'medico',
        key: 'id'
      }
    },
    dia_semana: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false
    },
    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false
    },
    modalidad: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'disponibilidad_medico',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "disponibilidad_medico_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_disponibilidad_dia",
        fields: [
          { name: "dia_semana" },
        ]
      },
      {
        name: "idx_disponibilidad_medico",
        fields: [
          { name: "medico_id" },
        ]
      },
    ]
  });
};

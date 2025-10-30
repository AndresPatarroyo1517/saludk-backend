const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('promocion_paciente', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    promocion_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'promocion',
        key: 'id'
      },
      unique: "unique_promocion_paciente"
    },
    paciente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'paciente',
        key: 'id'
      },
      unique: "unique_promocion_paciente"
    },
    veces_usado: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    fecha_asignacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    fecha_ultimo_uso: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'promocion_paciente',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_promocion_paciente_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_promocion_paciente_promocion",
        fields: [
          { name: "promocion_id" },
        ]
      },
      {
        name: "promocion_paciente_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "unique_promocion_paciente",
        unique: true,
        fields: [
          { name: "promocion_id" },
          { name: "paciente_id" },
        ]
      },
    ]
  });
};

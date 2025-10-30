const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('direccion', {
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
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    direccion_completa: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    es_principal: {
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
    tableName: 'direccion',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "direccion_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_direccion_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_direccion_principal",
        fields: [
          { name: "paciente_id" },
          { name: "es_principal" },
        ]
      },
      {
        name: "idx_direccion_tipo",
        fields: [
          { name: "tipo" },
        ]
      },
    ]
  });
};

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('compra', {
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
    numero_orden: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "compra_numero_orden_key"
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    descuento: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    total: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "CARRITO"
    },
    tipo_entrega: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    direccion_entrega_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'direccion',
        key: 'id'
      }
    },
    punto_recogida: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notas_entrega: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    fecha_pago: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_entrega: {
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
    tableName: 'compra',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "compra_numero_orden_key",
        unique: true,
        fields: [
          { name: "numero_orden" },
        ]
      },
      {
        name: "compra_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_compra_estado",
        fields: [
          { name: "estado" },
        ]
      },
      {
        name: "idx_compra_fecha",
        fields: [
          { name: "fecha_creacion" },
        ]
      },
      {
        name: "idx_compra_numero",
        fields: [
          { name: "numero_orden" },
        ]
      },
      {
        name: "idx_compra_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
    ]
  });
};

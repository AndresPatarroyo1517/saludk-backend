import Sequelize from 'sequelize';
export default function(sequelize, DataTypes)  {
  return sequelize.define('compra_producto', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    compra_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'compra',
        key: 'id'
      },
      unique: "unique_producto_compra"
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'producto_farmaceutico',
        key: 'id'
      },
      unique: "unique_producto_compra"
    },
    cantidad: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    precio_unitario: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    descuento_aplicado: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    subtotal: {
      type: DataTypes.DECIMAL,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'compra_producto',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "compra_producto_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_compra_producto_compra",
        fields: [
          { name: "compra_id" },
        ]
      },
      {
        name: "idx_compra_producto_producto",
        fields: [
          { name: "producto_id" },
        ]
      },
      {
        name: "unique_producto_compra",
        unique: true,
        fields: [
          { name: "compra_id" },
          { name: "producto_id" },
        ]
      },
    ]
  });
};

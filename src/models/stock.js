import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('stock', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'producto_farmaceutico',
        key: 'id'
      },
      unique: "stock_producto_id_key"
    },
    cantidad_disponible: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    cantidad_minima: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 10
    },
    cantidad_maxima: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 1000
    },
    ubicacion: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'stock',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_stock_bajo",
        fields: [
          { name: "cantidad_disponible" },
        ]
      },
      {
        name: "idx_stock_producto",
        fields: [
          { name: "producto_id" },
        ]
      },
      {
        name: "stock_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "stock_producto_id_key",
        unique: true,
        fields: [
          { name: "producto_id" },
        ]
      },
    ]
  });
};

const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('promocion', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "promocion_codigo_key"
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tipo_promocion: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tipo_descuento: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    valor_descuento: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    producto_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'producto_farmaceutico',
        key: 'id'
      }
    },
    categoria_producto: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    uso_maximo_por_usuario: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 1
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'promocion',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_promocion_activa",
        fields: [
          { name: "activo" },
          { name: "fecha_inicio" },
          { name: "fecha_fin" },
        ]
      },
      {
        name: "idx_promocion_codigo",
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "idx_promocion_tipo",
        fields: [
          { name: "tipo_promocion" },
        ]
      },
      {
        name: "promocion_codigo_key",
        unique: true,
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "promocion_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

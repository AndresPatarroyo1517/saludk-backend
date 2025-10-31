import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('producto_farmaceutico', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    codigo_producto: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "producto_farmaceutico_codigo_producto_key"
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    precio: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    categoria: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    marca: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ingredientes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    efectos_secundarios: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    contraindicaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requiere_receta: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    calificacion_promedio: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
    },
    cantidad_calificaciones: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    imagen_url: {
      type: DataTypes.TEXT,
      allowNull: true
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
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'producto_farmaceutico',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_producto_activo",
        fields: [
          { name: "activo" },
        ]
      },
      {
        name: "idx_producto_categoria",
        fields: [
          { name: "categoria" },
        ]
      },
      {
        name: "idx_producto_codigo",
        fields: [
          { name: "codigo_producto" },
        ]
      },
      {
        name: "idx_producto_nombre_gin",
        fields: [
        ]
      },
      {
        name: "producto_farmaceutico_codigo_producto_key",
        unique: true,
        fields: [
          { name: "codigo_producto" },
        ]
      },
      {
        name: "producto_farmaceutico_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

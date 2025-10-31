import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('plan', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "plan_nombre_key"
    },
    codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: "plan_codigo_key"
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    precio_mensual: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    duracion_meses: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    beneficios: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    consultas_virtuales_incluidas: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    consultas_presenciales_incluidas: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    descuento_productos: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.00
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
    tableName: 'plan',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_plan_activo",
        fields: [
          { name: "activo" },
        ]
      },
      {
        name: "idx_plan_codigo",
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "plan_codigo_key",
        unique: true,
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "plan_nombre_key",
        unique: true,
        fields: [
          { name: "nombre" },
        ]
      },
      {
        name: "plan_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

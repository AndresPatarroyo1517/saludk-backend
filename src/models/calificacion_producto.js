import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('calificacion_producto', {
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
    producto_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'producto_farmaceutico',
        key: 'id'
      },
      unique: "unique_calificacion_compra_producto"
    },
    compra_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'compra',
        key: 'id'
      },
      unique: "unique_calificacion_compra_producto"
    },
    puntuacion: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'calificacion_producto',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "calificacion_producto_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_calificacion_producto_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_calificacion_producto_producto",
        fields: [
          { name: "producto_id" },
        ]
      },
      {
        name: "unique_calificacion_compra_producto",
        unique: true,
        fields: [
          { name: "compra_id" },
          { name: "producto_id" },
        ]
      },
    ]
  });
};

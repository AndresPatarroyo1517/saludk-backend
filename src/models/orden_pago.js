const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('orden_pago', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tipo_orden: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    paciente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'paciente',
        key: 'id'
      }
    },
    suscripcion_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'suscripcion',
        key: 'id'
      }
    },
    compra_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'compra',
        key: 'id'
      }
    },
    cita_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'cita',
        key: 'id'
      }
    },
    monto: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    metodo_pago: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDIENTE"
    },
    referencia_transaccion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    datos_transaccion: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    comprobante_url: {
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
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'orden_pago',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_orden_cita",
        fields: [
          { name: "cita_id" },
        ]
      },
      {
        name: "idx_orden_compra",
        fields: [
          { name: "compra_id" },
        ]
      },
      {
        name: "idx_orden_estado",
        fields: [
          { name: "estado" },
        ]
      },
      {
        name: "idx_orden_fecha",
        fields: [
          { name: "fecha_creacion" },
        ]
      },
      {
        name: "idx_orden_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_orden_suscripcion",
        fields: [
          { name: "suscripcion_id" },
        ]
      },
      {
        name: "orden_pago_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

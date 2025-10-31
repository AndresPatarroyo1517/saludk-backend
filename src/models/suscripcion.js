import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('suscripcion', {
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
      },
      unique: "idx_suscripcion_unica_activa"
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'plan',
        key: 'id'
      }
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDIENTE_PAGO",
      unique: "idx_suscripcion_unica_activa"
    },
    auto_renovable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    consultas_virtuales_usadas: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
    },
    consultas_presenciales_usadas: {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: 0
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
    tableName: 'suscripcion',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_suscripcion_estado",
        fields: [
          { name: "estado" },
        ]
      },
      {
        name: "idx_suscripcion_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_suscripcion_unica_activa",
        unique: true,
        fields: [
          { name: "paciente_id" },
          { name: "estado" },
        ]
      },
      {
        name: "idx_suscripcion_vencimiento",
        fields: [
          { name: "fecha_vencimiento" },
        ]
      },
      {
        name: "suscripcion_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('resultado_validacion', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    solicitud_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'solicitud_registro',
        key: 'id'
      }
    },
    tipo_validacion: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    resultado: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    detalles: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    motivo_rechazo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    validado_por: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuario',
        key: 'id'
      }
    },
    fecha_validacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'resultado_validacion',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_validacion_solicitud",
        fields: [
          { name: "solicitud_id" },
        ]
      },
      {
        name: "idx_validacion_tipo",
        fields: [
          { name: "tipo_validacion" },
        ]
      },
      {
        name: "resultado_validacion_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

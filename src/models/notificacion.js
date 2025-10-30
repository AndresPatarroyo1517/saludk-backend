const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('notificacion', {
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
    tipo_notificacion: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    asunto: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    contenido: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    canal: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    receta_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'receta',
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
    compra_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'compra',
        key: 'id'
      }
    },
    promocion_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'promocion',
        key: 'id'
      }
    },
    enviado: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    fecha_programada: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_envio: {
      type: DataTypes.DATE,
      allowNull: true
    },
    fecha_lectura: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_envio: {
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
    tableName: 'notificacion',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "idx_notificacion_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_notificacion_pendiente",
        fields: [
          { name: "enviado" },
          { name: "fecha_programada" },
        ]
      },
      {
        name: "idx_notificacion_tipo",
        fields: [
          { name: "tipo_notificacion" },
        ]
      },
      {
        name: "notificacion_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};

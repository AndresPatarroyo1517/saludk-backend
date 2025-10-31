import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('auditoria', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tabla: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    registro_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'usuario',
        key: 'id'
      }
    },
    accion: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    datos_anteriores: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    datos_nuevos: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ip_origen: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_accion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'auditoria',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "auditoria_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_auditoria_accion",
        fields: [
          { name: "accion" },
        ]
      },
      {
        name: "idx_auditoria_fecha",
        fields: [
          { name: "fecha_accion" },
        ]
      },
      {
        name: "idx_auditoria_tabla",
        fields: [
          { name: "tabla" },
          { name: "registro_id" },
        ]
      },
      {
        name: "idx_auditoria_usuario",
        fields: [
          { name: "usuario_id" },
        ]
      },
    ]
  });
};

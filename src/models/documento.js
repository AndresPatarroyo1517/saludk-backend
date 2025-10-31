import Sequelize from 'sequelize';
export default function(sequelize, DataTypes)  {
  return sequelize.define('documento', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    solicitud_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'solicitud_registro',
        key: 'id'
      }
    },
    paciente_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'paciente',
        key: 'id'
      }
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ruta_storj: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipo_archivo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    tamano_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    hash_sha256: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "PENDIENTE"
    },
    fecha_carga: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'documento',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "documento_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_documento_hash",
        fields: [
          { name: "hash_sha256" },
        ]
      },
      {
        name: "idx_documento_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "idx_documento_solicitud",
        fields: [
          { name: "solicitud_id" },
        ]
      },
    ]
  });
};

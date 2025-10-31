import Sequelize from 'sequelize';
export default function(sequelize, DataTypes) {
  return sequelize.define('historial_medico', {
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
      unique: "historial_medico_paciente_id_key"
    },
    enfermedades_cronicas: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    cirugias_previas: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    medicamentos_actuales: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
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
    tableName: 'historial_medico',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "historial_medico_paciente_id_key",
        unique: true,
        fields: [
          { name: "paciente_id" },
        ]
      },
      {
        name: "historial_medico_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_historial_paciente",
        fields: [
          { name: "paciente_id" },
        ]
      },
    ]
  });
};

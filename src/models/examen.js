const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('examen', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    historial_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'historial_medico',
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
    tipo_examen: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resultado: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ruta_archivo_storj: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    interpretacion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fecha_realizacion: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    }
  }, {
    sequelize,
    tableName: 'examen',
    schema: 'public',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        name: "examen_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_examen_fecha",
        fields: [
          { name: "fecha_realizacion" },
        ]
      },
      {
        name: "idx_examen_historial",
        fields: [
          { name: "historial_id" },
        ]
      },
      {
        name: "idx_examen_tipo",
        fields: [
          { name: "tipo_examen" },
        ]
      },
    ]
  });
};

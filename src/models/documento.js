const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const documento = sequelize.define('Documento', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    solicitudId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'solicitud_id',
      references: {
        model: 'solicitud_registro',
        key: 'id',
      },
    },
    pacienteId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'paciente_id',
      references: {
        model: 'paciente',
        key: 'id',
      },
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    rutaStorj: { // CAMBIADO: ruta_r2 -> rutaStorj
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'ruta_storj',
    },
    tipoArchivo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'tipo_archivo',
      validate: {
        isIn: [['PDF', 'JPG', 'PNG', 'JPEG', 'DICOM']],
      },
    },
    tamanioBytes: {
      type: DataTypes.BIGINT,
      field: 'tamanio_bytes',
    },
    hashSha256: {
      type: DataTypes.STRING(64),
      field: 'hash_sha256',
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDIENTE',
      validate: {
        isIn: [['PENDIENTE', 'VALIDADO', 'RECHAZADO']],
      },
    },
    fechaCarga: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'fecha_carga',
    },
  }, {
    tableName: 'documento',
    timestamps: false,
  });

  return documento;
};
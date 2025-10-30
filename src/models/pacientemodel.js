
const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/database");

const Paciente = sequelize.define(
  "Paciente",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombres: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apellidos: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numero_identificacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipo_sangre: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alergias: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    antecedentes_medicos: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documentos: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    estado: {
      type: DataTypes.ENUM("Pendiente", "Aprobado", "Rechazado"),
      defaultValue: "Pendiente",
    },
  },
  {
    tableName: "pacientes",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Paciente;

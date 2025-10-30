
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const logger = require("../utils/logger");

const endpoint = process.env.STORJ_ENDPOINT;
const bucket = process.env.STORJ_BUCKET_NAME;

const s3 = new S3Client({
  endpoint,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.STORJ_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

exports.subirArchivo = async (archivo) => {
  if (!archivo) throw new Error("Archivo inválido");
  const fileStream = fs.createReadStream(archivo.path);
  const key = `${Date.now()}_${archivo.originalname.replace(/\s+/g, "_")}`;
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: archivo.mimetype,
  };

  try {
    await s3.send(new PutObjectCommand(params));
    // eliminar archivo temporal
    try { fs.unlinkSync(archivo.path); } catch (e) { logger.warn("No se pudo borrar archivo local:", e.message); }
    const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
    return { nombre: archivo.originalname, key, url };
  } catch (error) {
    logger.error("Error subida Storj:", error);
    throw new Error("Error al subir archivo");
  }
};

import fs from "fs";
import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import logger from "../utils/logger.js";

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

// Mapeo de mimetypes permitidos
const ALLOWED_MIMETYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/png': 'PNG'
};

/**
 * Subir archivo a Storj con validaciones
 */
export const subirArchivo = async (archivo) => {
  // 1. Validar que el archivo existe
  if (!archivo || !archivo.path) {
    throw new Error("Archivo inválido: no se encontró el path");
  }

  // 2. Validar mimetype
  if (!ALLOWED_MIMETYPES[archivo.mimetype]) {
    throw new Error(
      `Tipo de archivo no permitido: ${archivo.mimetype}. ` +
      `Solo se permiten: ${Object.keys(ALLOWED_MIMETYPES).join(', ')}`
    );
  }

  // 3. Validar tamaño (máximo 10MB)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (archivo.size > MAX_SIZE) {
    throw new Error(`Archivo demasiado grande. Máximo: ${MAX_SIZE / 1024 / 1024}MB`);
  }

  try {
    // 4. Leer archivo y calcular hash
    const fileBuffer = fs.readFileSync(archivo.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 5. Generar key único para Storj
    const extension = archivo.originalname.split('.').pop();
    const timestamp = Date.now();
    const key = `documentos/${timestamp}_${hash.substring(0, 8)}.${extension}`;

    // 6. Crear stream y subir
    const fileStream = fs.createReadStream(archivo.path);
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: archivo.mimetype,
      Metadata: {
        'original-name': archivo.originalname,
        'upload-timestamp': timestamp.toString(),
        'sha256': hash
      }
    };

    await s3.send(new PutObjectCommand(params));
    
    // 7. Eliminar archivo temporal
    try { 
      fs.unlinkSync(archivo.path); 
    } catch (e) { 
      logger.warn("No se pudo borrar archivo local:", e.message); 
    }

    // 8. Construir URL de acceso
    const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
    
    logger.info(`Archivo subido a Storj: ${key}`);

    return { 
      nombre: archivo.originalname,
      key,
      url,
      hash,
      tamano: archivo.size,
      tipo: ALLOWED_MIMETYPES[archivo.mimetype]
    };
  } catch (error) {
    // Limpiar archivo temporal en caso de error
    try {
      if (archivo.path && fs.existsSync(archivo.path)) {
        fs.unlinkSync(archivo.path);
      }
    } catch (cleanupError) {
      logger.warn("No se pudo limpiar archivo temporal:", cleanupError.message);
    }

    logger.error("Error subida Storj:", error);
    throw new Error(`Error al subir archivo a Storj: ${error.message}`);
  }
};

/**
 * Eliminar archivo de Storj
 */
export const eliminarArchivo = async (key) => {
  try {
    const params = {
      Bucket: bucket,
      Key: key
    };

    await s3.send(new DeleteObjectCommand(params));
    logger.info(`Archivo eliminado de Storj: ${key}`);
    
    return true;
  } catch (error) {
    logger.error("Error al eliminar archivo de Storj:", error);
    throw new Error(`Error al eliminar archivo: ${error.message}`);
  }
};

/**
 * Extraer key de la URL completa de Storj
 */
export const extraerKeyDeURL = (url) => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    // Formato: /bucket/documentos/timestamp_hash.ext
    const parts = path.split('/');
    // Retornar "documentos/timestamp_hash.ext"
    return parts.slice(2).join('/');
  } catch (error) {
    logger.error("Error al extraer key de URL:", error);
    return null;
  }
};
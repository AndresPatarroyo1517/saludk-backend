import fs from "fs";
import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "../utils/logger.js";

const endpoint = process.env.STORJ_ENDPOINT;
const bucket = process.env.STORJ_BUCKET_NAME;

// Validar configuración al cargar
if (!endpoint || !bucket) {
  logger.error('❌ Configuración Storj incompleta:', { endpoint, bucket });
  throw new Error('STORJ_ENDPOINT y STORJ_BUCKET_NAME son requeridos');
}

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
  logger.info('🔵 Iniciando subida a Storj:', {
    originalname: archivo?.originalname,
    mimetype: archivo?.mimetype,
    size: archivo?.size,
    path: archivo?.path
  });

  // 1. Validar que el archivo existe
  if (!archivo || !archivo.path) {
    logger.error('❌ Archivo inválido: no se encontró el path');
    throw new Error("Archivo inválido: no se encontró el path");
  }

  // Verificar que el archivo existe físicamente
  if (!fs.existsSync(archivo.path)) {
    logger.error('❌ El archivo no existe en el path:', archivo.path);
    throw new Error(`Archivo no encontrado en: ${archivo.path}`);
  }

  // 2. Validar mimetype
  if (!ALLOWED_MIMETYPES[archivo.mimetype]) {
    logger.error('❌ Mimetype no permitido:', archivo.mimetype);
    throw new Error(
      `Tipo de archivo no permitido: ${archivo.mimetype}. ` +
      `Solo se permiten: ${Object.keys(ALLOWED_MIMETYPES).join(', ')}`
    );
  }

  // 3. Validar tamaño (máximo 10MB)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (archivo.size > MAX_SIZE) {
    logger.error('❌ Archivo demasiado grande:', archivo.size);
    throw new Error(`Archivo demasiado grande. Máximo: ${MAX_SIZE / 1024 / 1024}MB`);
  }

  try {
    // 4. Leer archivo y calcular hash
    logger.info('📖 Leyendo archivo...');
    const fileBuffer = fs.readFileSync(archivo.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    logger.info('✅ Hash calculado:', hash.substring(0, 16) + '...');

    // 5. Generar key único para Storj
    const extension = archivo.originalname.split('.').pop();
    const timestamp = Date.now();
    const key = `documentos/${timestamp}_${hash.substring(0, 8)}.${extension}`;
    
    logger.info('🔑 Key generada:', key);

    // 6. Preparar params para S3
    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileBuffer, // Usar buffer directamente
      ContentType: archivo.mimetype,
      Metadata: {
        'original-name': archivo.originalname,
        'upload-timestamp': timestamp.toString(),
        'sha256': hash
      }
    };

    logger.info('📤 Enviando a Storj...', {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType,
      size: fileBuffer.length
    });

    // 7. Subir a Storj
    const command = new PutObjectCommand(params);
    const response = await s3.send(command);
    
    logger.info('✅ Archivo subido exitosamente a Storj:', {
      key,
      etag: response.ETag,
      versionId: response.VersionId
    });

    // 8. Eliminar archivo temporal
    try { 
      fs.unlinkSync(archivo.path);
      logger.info('🗑️ Archivo temporal eliminado:', archivo.path);
    } catch (e) { 
      logger.warn("⚠️ No se pudo borrar archivo local:", e.message); 
    }

    // 9. Construir URL de acceso
    // Formato: https://gateway.storjshare.io/bucket/key
    const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
    
    logger.info('🌐 URL generada:', url);

    const resultado = { 
      nombre: archivo.originalname,
      key,
      url,
      hash,
      tamano: archivo.size,
      tipo: ALLOWED_MIMETYPES[archivo.mimetype]
    };

    logger.info('✅ Resultado final:', resultado);

    return resultado;

  } catch (error) {
    logger.error('❌ Error durante la subida a Storj:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });

    // Limpiar archivo temporal en caso de error
    try {
      if (archivo.path && fs.existsSync(archivo.path)) {
        fs.unlinkSync(archivo.path);
        logger.info('🗑️ Archivo temporal limpiado después del error');
      }
    } catch (cleanupError) {
      logger.warn("⚠️ No se pudo limpiar archivo temporal:", cleanupError.message);
    }

    throw new Error(`Error al subir archivo a Storj: ${error.message}`);
  }
};

/**
 * Eliminar archivo de Storj
 */
export const eliminarArchivo = async (key) => {
  try {
    logger.info('🗑️ Eliminando archivo de Storj:', key);
    
    const params = {
      Bucket: bucket,
      Key: key
    };

    await s3.send(new DeleteObjectCommand(params));
    logger.info('✅ Archivo eliminado de Storj:', key);
    
    return true;
  } catch (error) {
    logger.error('❌ Error al eliminar archivo de Storj:', {
      key,
      error: error.message
    });
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
    const key = parts.slice(2).join('/');
    logger.info('🔑 Key extraída de URL:', key);
    return key;
  } catch (error) {
    logger.error('❌ Error al extraer key de URL:', error);
    return null;
  }
};

/**
 * Generar URL pre-firmada a partir de la ruta almacenada en la BD.
 * Reemplaza una URL pública que NO funciona por una pre-signed válida.
 */
export const generarUrlFirmada = async (rutaStorj) => {
  try {
    // rutaStorj viene así:
    // https://gateway.storjshare.io/saludk/documentos/xxx.pdf

    const partes = rutaStorj.split("/");

    const bucketName = partes[3]; // "saludk"
    const key = partes.slice(4).join("/"); // "documentos/xxx.pdf"

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return signedUrl;

  } catch (err) {
    logger.error("Error generando URL firmada:", err.message);
    return rutaStorj; // fallback: devolvemos la original
  }
};

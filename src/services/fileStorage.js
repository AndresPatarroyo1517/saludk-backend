import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storjClient, bucketName } from '../config/storj.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import path from 'path';

  
  class FileStorageService {
    /**
     * Subir archivo a Storj
     * @param {Buffer} fileBuffer - Contenido del archivo
     * @param {Object} metadata - Metadatos del archivo
     * @returns {Promise<Object>} - URL y metadata del archivo
     */
    async uploadFile(fileBuffer, metadata) {
      try {
        const { 
          originalName, 
          mimeType, 
          folder = 'documents', 
          userId 
        } = metadata;
  
        const fileHash = crypto
          .createHash('sha256')
          .update(fileBuffer)
          .digest('hex');
  
        const extension = path.extname(originalName);
        const timestamp = Date.now();
        
        const key = `${folder}/${userId}/${timestamp}-${fileHash.substring(0, 16)}${extension}`;
  
        const uploadParams = {
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: {
            originalName: originalName,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            hash: fileHash, 
          },
        };
  
        await storjClient.send(new PutObjectCommand(uploadParams));
  
        logger.info(`File uploaded to Storj: ${key}`);
  
        return {
          success: true,
          key: key,
          bucket: bucketName,
          hash: fileHash,
          size: fileBuffer.length,
          url: `storj://${bucketName}/${key}`, // URL interna
        };
      } catch (error) {
        logger.error('Error uploading file to Storj:', error);
        throw new Error(`File upload failed: ${error.message}`);
      }
    }
  
    /**
     * Generar URL firmada temporal (RNF001 - Acceso seguro)
     * @param {String} key - Clave del archivo en Storj
     * @param {Number} expiresIn - Tiempo de expiración en segundos (default: 1 hora)
     * @returns {Promise<String>} - URL firmada temporal
     */
    async getSignedDownloadUrl(key, expiresIn = 3600) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
  
        const signedUrl = await getSignedUrl(storjClient, command, { 
          expiresIn 
        });
  
        return signedUrl;
      } catch (error) {
        logger.error('Error generating signed URL:', error);
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }
    }
  
    /**
     * Descargar archivo desde Storj
     * @param {String} key - Clave del archivo
     * @returns {Promise<Buffer>} - Contenido del archivo
     */
    async downloadFile(key) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
  
        const response = await storjClient.send(command);
        
        // Convertir stream a buffer
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
      } catch (error) {
        logger.error('Error downloading file from Storj:', error);
        throw new Error(`File download failed: ${error.message}`);
      }
    }
  
    /**
     * Eliminar archivo de Storj
     * @param {String} key - Clave del archivo
     * @returns {Promise<Boolean>}
     */
    async deleteFile(key) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
  
        await storjClient.send(command);
        logger.info(`File deleted from Storj: ${key}`);
        return true;
      } catch (error) {
        logger.error('Error deleting file from Storj:', error);
        throw new Error(`File deletion failed: ${error.message}`);
      }
    }
  
    /**
     * Verificar si un archivo existe
     * @param {String} key - Clave del archivo
     * @returns {Promise<Boolean>}
     */
    async fileExists(key) {
      try {
        const command = new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
  
        await storjClient.send(command);
        return true;
      } catch (error) {
        if (error.name === 'NotFound') {
          return false;
        }
        throw error;
      }
    }
  
    /**
     * Verificar integridad del archivo (RNF005)
     * @param {String} key - Clave del archivo
     * @param {String} expectedHash - Hash SHA-256 esperado
     * @returns {Promise<Boolean>}
     */
    async verifyFileIntegrity(key, expectedHash) {
      try {
        const fileBuffer = await this.downloadFile(key);
        const actualHash = crypto
          .createHash('sha256')
          .update(fileBuffer)
          .digest('hex');
  
        return actualHash === expectedHash;
      } catch (error) {
        logger.error('Error verifying file integrity:', error);
        return false;
      }
    }
  
    /**
     * Listar archivos en una carpeta
     * @param {String} prefix - Prefijo de búsqueda (ej: 'documents/user123/')
     * @returns {Promise<Array>}
     */
    async listFiles(prefix) {
      try {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          MaxKeys: 1000,
        });
  
        const response = await storjClient.send(command);
        return response.Contents || [];
      } catch (error) {
        logger.error('Error listing files:', error);
        throw new Error(`Failed to list files: ${error.message}`);
      }
    }
  
    /**
     * Obtener metadata de un archivo
     * @param {String} key - Clave del archivo
     * @returns {Promise<Object>}
     */
    async getFileMetadata(key) {
      try {
        const command = new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        });
  
        const response = await storjClient.send(command);
        
        return {
          size: response.ContentLength,
          contentType: response.ContentType,
          lastModified: response.LastModified,
          metadata: response.Metadata,
          etag: response.ETag,
        };
      } catch (error) {
        logger.error('Error getting file metadata:', error);
        throw new Error(`Failed to get metadata: ${error.message}`);
      }
    }
  }
  
export default new FileStorageService();
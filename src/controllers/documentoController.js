import fileStorageService from '../services/fileStorage.js';
import { Documento } from '../models/documento.js';
import logger from '../utils/logger.js';

class DocumentoController {
  async uploadDocumento(req, res) {
    try {
      const { pacienteId, solicitudId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
        });
      }

      const uploadResult = await fileStorageService.uploadFile(file.buffer, {
        originalName: file.originalname,
        mimeType: file.mimetype,
        folder: 'documents',
        userId: pacienteId,
      });

      const documento = await Documento.create({
        solicitudId: solicitudId || null,
        pacienteId: pacienteId || null,
        nombre: file.originalname,
        rutaStorj: uploadResult.key, 
        tipoArchivo: file.mimetype,
        tamanioBytes: uploadResult.size,
        hashSha256: uploadResult.hash,
        estado: 'PENDIENTE',
      });

      logger.info(`Documento subido: ${documento.id}`);

      res.status(201).json({
        success: true,
        data: {
          documentoId: documento.id,
          nombre: documento.nombre,
          tamanio: documento.tamanioBytes,
        },
      });
    } catch (error) {
      logger.error('Error al subir documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al subir el archivo',
      });
    }
  }

  async getDocumentoUrl(req, res) {
    try {
      const { id } = req.params;

      const documento = await Documento.findByPk(id);

      if (!documento) {
        return res.status(404).json({
          success: false,
          error: 'Documento no encontrado',
        });
      }

      const signedUrl = await fileStorageService.getSignedDownloadUrl(
        documento.rutaStorj,
        3600
      );

      res.json({
        success: true,
        data: {
          url: signedUrl,
          expiresIn: 3600,
          nombre: documento.nombre,
        },
      });
    } catch (error) {
      logger.error('Error al obtener URL del documento:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar URL de descarga',
      });
    }
  }
}
export default new DocumentoController();
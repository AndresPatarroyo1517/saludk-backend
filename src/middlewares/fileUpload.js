const multer = require('multer');
const crypto = require('crypto');

const storage = multer.memoryStorage();


const fileFilter = (req, file, cb) => {

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/dicom', 
    'application/x-dicom',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};


const limits = {
  fileSize: 10 * 1024 * 1024, 
  files: 5, 
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'El archivo excede el tamaño máximo permitido (10 MB)',
          });
        }
        return res.status(400).json({
          success: false,
          error: `Error de carga: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }
      next();
    });
  };
};

const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'Uno o más archivos exceden el tamaño máximo (10 MB)',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: `Máximo ${maxCount} archivos permitidos`,
          });
        }
        return res.status(400).json({
          success: false,
          error: `Error de carga: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple,
};
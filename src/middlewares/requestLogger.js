const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  req.id = uuidv4();
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
    };
    
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
};
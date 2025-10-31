import { S3Client } from '@aws-sdk/client-s3';
import logger from '../utils/logger.js';

const storjConfig = {
  region: 'auto',
  endpoint: process.env.STORJ_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORJ_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORJ_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  signatureVersion: 'v4',
};

const validateStorjConfig = () => {
  const required = [
    'STORJ_ENDPOINT',
    'STORJ_ACCESS_KEY_ID',
    'STORJ_SECRET_ACCESS_KEY',
    'STORJ_BUCKET_NAME',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing Storj configuration: ${missing.join(', ')}\n`
    );
  }
};

if (process.env.NODE_ENV !== 'test') {
  try {
    validateStorjConfig();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

const storjClient = new S3Client(storjConfig);

const testStorjConnection = async () => {
  const { ListBucketsCommand } = require('@aws-sdk/client-s3');
  
  try {
    await storjClient.send(new ListBucketsCommand({}));
    logger.info('Storj conectada correctamente');
    return true;
  } catch (error) {
    logger.error('Storj no conectada:', error.message);
    return false;
  }
};

module.exports = { 
  storjClient, 
  testStorjConnection,
  bucketName: process.env.STORJ_BUCKET_NAME 
};
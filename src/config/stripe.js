import Stripe from 'stripe';
import logger from '../utils/logger.js';

// Verificar que la clave existe
if (!process.env.STRIPE_SECRET_KEY) {
  logger.error('❌ STRIPE_SECRET_KEY no está definida en .env');
  throw new Error('STRIPE_SECRET_KEY es requerida');
}

// Inicializar cliente de Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
});

logger.info('✅ Cliente de Stripe inicializado correctamente');
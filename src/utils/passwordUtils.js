import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Genera un salt aleatorio
 * @returns {string} Salt en formato hexadecimal
 */
export const generateSalt = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hashea una contraseña con bcrypt
 * @param {string} password - Contraseña en texto plano
 * @param {number} rounds - Número de rondas de bcrypt (default: 12)
 * @returns {Promise<string>} Hash de la contraseña
 */
export const hashPassword = async (password, rounds = 12) => {
  return await bcrypt.hash(password, rounds);
};

/**
 * Compara una contraseña con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} True si coinciden
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Valida la fortaleza de una contraseña
 * @param {string} password - Contraseña a validar
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  generateSalt,
  hashPassword,
  comparePassword,
  validatePasswordStrength
};
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class NotificationService {
  constructor() {
    // Configuración del transportador de correo (puedes moverlo a .env)
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // o 'smtp-mail.outlook.com', según el caso
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Envía un correo electrónico de notificación
   * @param {Object} options - configuración del mensaje
   * @param {string[]} options.destinatarios - lista de correos
   * @param {string} options.asunto - asunto del correo
   * @param {string} options.mensaje - cuerpo del mensaje (texto plano o HTML)
   */
  async enviarEmail({ destinatarios, asunto, mensaje }) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: destinatarios.join(', '),
        subject: asunto,
        text: mensaje,
      };

      await this.transporter.sendMail(mailOptions);

      logger.info(`📧 Correo enviado a: ${destinatarios.join(', ')}`);
      return { success: true };
    } catch (err) {
      logger.error(`Error al enviar correo: ${err.message}`);
      throw new Error('No se pudo enviar la notificación por correo.');
    }
  }
}

export default new NotificationService();

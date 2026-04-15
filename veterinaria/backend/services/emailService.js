// backend/services/emailService.js
const Mailjet = require('node-mailjet');

/**
 * Función para enviar un email genérico
 */
const enviarEmail = async (toEmail, subject, text, html = null) => {
  try {
    // Verificamos que existan las variables
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      throw new Error('Faltan las credenciales de Mailjet en el .env');
    }

    // Creamos la conexión AQUÍ
    const mailjet = new Mailjet({
      apiKey: process.env.MJ_APIKEY_PUBLIC,
      apiSecret: process.env.MJ_APIKEY_PRIVATE
    });

    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: {
            Email: 'lucianadanizapaz@hotmail.com',
            Name: 'Veterinaria Malfi'
          },
          To: [{
            Email: toEmail,
            Name: 'Empleado'
          }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html || text
        }]
      });

    const result = await request;
    console.log('✅ Email enviado con éxito a:', toEmail);
    return result.body;
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    throw error;
  }
};

module.exports = { enviarEmail };
const nodemailer = require('nodemailer');

// Configuración de Nodemailer (usa tu Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'danizapaz50@gmail.com',
    pass: 'rjjzfiitebglsazt'   // ← CAMBIA POR TU NUEVA CONTRASEÑA DE APLICACIÓN SI LA GENERASTE
  }
});

// Función para enviar el email de recuperación
const enviarEmailRecuperacion = async (emailDestino, token, nombreUsuario) => {
  const resetLink = `http://localhost:5173/reset-password?token=${token}&email=${encodeURIComponent(emailDestino)}`;

  const mailOptions = {
    from: '"Malfi Veterinaria" <danizapaz50@gmail.com>',
    to: emailDestino,
    subject: 'Recuperar contraseña - Malfi Veterinaria',
    html: `
      <h2>Hola ${nombreUsuario || 'Dueña/o'},</h2>
      <p>Recibimos una solicitud para recuperar tu acceso en Malfi Veterinaria.</p>
      <p>Hacé clic en este botón para resetear tu contraseña (el link expira en 1 hora):</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background:#663399; color:white; padding:15px 30px; border-radius:10px; text-decoration:none; font-weight:bold; font-size:16px;">
          Resetear mi contraseña
        </a>
      </p>
      <p>Si no fuiste vos quien pidió esto, ignorá este email. Tu cuenta está segura.</p>
      <p>Saludos,<br>Equipo Malfi Veterinaria 🐶</p>
      <small>Este es un mensaje automático. No respondas aquí.</small>
    `
  };

  try {
    console.log('Intentando enviar email a:', emailDestino);
    await transporter.sendMail(mailOptions);
    console.log('Email enviado correctamente a:', emailDestino);
    return true;
  } catch (err) {
    console.error('Error al enviar email:', err.message);
    console.error('Detalles del error:', err);
    return false;
  }
};

module.exports = { enviarEmailRecuperacion };
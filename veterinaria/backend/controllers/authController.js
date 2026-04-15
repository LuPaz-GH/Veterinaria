// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const { enviarEmail } = require('../services/emailService');

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔍 1. Verificamos si el email tiene formato válido
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Ingresa un email válido.' });
    }

    // ️ 2. Por seguridad, SIEMPRE respondemos OK incluso si el email no existe
    // (para que nadie pueda saber qué correos están registrados)
    
    // 🔑 3. Creamos un token temporal que dura 15 minutos
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // 🔗 4. Armamos el enlace que le enviaremos al usuario
    // (Asumimos que tu frontend corre en puerto 5173 con Vite)
    const resetLink = `http://localhost:5173/recuperar-contrasena?token=${resetToken}`;

    // 📧 5. Enviamos el correo con Mailjet
    await enviarEmail(
      email,
      '🔑 Recuperación de contraseña - Veterinaria Malfi',
      `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}\n\nEste enlace expira en 15 minutos.`,
      `<h3>Recuperación de contraseña</h3>
       <p>Haz clic en el botón para restablecer tu contraseña:</p>
       <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a>
       <p>Este enlace expira en 15 minutos.</p>`
    );

    return res.json({ message: 'Si el email existe, te enviamos un enlace de recuperación.' });

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
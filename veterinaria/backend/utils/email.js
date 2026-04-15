const Mailjet = require('node-mailjet');

const enviarEmailRecuperacion = async (emailDestino, token, nombreUsuario) => {
  // ✅ CORREGIDO: Link LIMPIO - solo con el token (esto es lo que estaba fallando)
  const resetLink = `http://localhost:5173/reset-password?token=${token}`;
  
  try {
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      console.error('❌ Faltan credenciales de Mailjet en .env');
      return false;
    }

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
            Name: 'Malfi Veterinaria'
          },
          To: [{
            Email: emailDestino,
            Name: nombreUsuario || 'Empleado'
          }],
          Subject: `Recuperar acceso - Malfi Veterinaria`,
          
          TextPart: `Hola ${nombreUsuario || 'Equipo'},\n\n` +
                   `Recibimos tu solicitud para recuperar el acceso.\n\n` +
                   `Usá este enlace para cambiar tu contraseña y usuario (válido por 1 hora):\n${resetLink}\n\n` +
                   `Si no fuiste vos, podés ignorar este mensaje.\n\n` +
                   `Saludos,\nEquipo Malfi Veterinaria 🐾`,

          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #663399;">Hola ${nombreUsuario || 'Equipo'},</h2>
              <p>Recibimos una solicitud para recuperar tu acceso en Malfi Veterinaria.</p>
              <p style="margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background:#663399; color:white; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
                  Cambiar mi contraseña y usuario
                </a>
              </p>
              <p>El enlace expira en 1 hora.</p>
              <p>Si no pediste esto, simplemente ignorá este email. Tu cuenta está protegida.</p>
              <p style="margin-top:40px; color:#666; font-size:13px;">
                Saludos,<br>
                Equipo Malfi Veterinaria 🐾<br>
                <small>Este es un mensaje automático.</small>
              </p>
            </div>
          `,

          SandboxMode: false
        }]
      });

    await request;
    console.log('✅ Email de recuperación enviado con Mailjet a:', emailDestino);
    return true;

  } catch (err) {
    console.error('❌ Error completo al enviar con Mailjet:', err.message);
    if (err.response) console.error('Detalles Mailjet:', err.response);
    return false;
  }
};

module.exports = { enviarEmailRecuperacion };
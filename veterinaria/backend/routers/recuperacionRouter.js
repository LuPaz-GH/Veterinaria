const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { enviarEmailRecuperacion } = require('../utils/email');
const fetch = require('node-fetch');

// =====================================================
// POST /api/recuperacion - Solicitud manual (público)
// =====================================================
router.post('/', async (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'El nombre completo es obligatorio'
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO solicitudes_recuperacion 
       (nombre, email, mensaje, estado) 
       VALUES (?, ?, ?, 'pendiente')`,
      [
        nombre.trim(),
        email ? email.trim() : null,
        mensaje ? mensaje.trim() : null
      ]
    );

    const insertId = result.insertId;

    const textoWhatsApp = encodeURIComponent(
      `🚨 NUEVA SOLICITUD DE RECUPERACIÓN 🚨\n\n` +
      `Nombre: ${nombre}\n` +
      `Email: ${email || 'No especificado'}\n` +
      `Mensaje: ${mensaje || 'Sin mensaje adicional'}\n` +
      `Fecha: ${new Date().toLocaleString('es-AR')}\n\n` +
      `ID solicitud: ${insertId}\n` +
      `Entrá al panel: http://localhost:5173/empleados\n\n` +
      `¡Gracias! 🐶`
    );

    const tuNumero = '5493815192208';
    const apiKey = 'TU_API_KEY_AQUI'; // ← CAMBIAR POR TU API KEY REAL

    try {
      const notifResponse = await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${tuNumero}&text=${textoWhatsApp}&apikey=${apiKey}`
      );

      if (!notifResponse.ok) {
        console.warn('No se pudo enviar WhatsApp:', await notifResponse.text());
      } else {
        console.log('WhatsApp enviado correctamente');
      }
    } catch (error) {
      console.warn('Error al intentar enviar WhatsApp:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Solicitud registrada correctamente',
      id: insertId
    });

  } catch (error) {
    console.error('[ERROR] al guardar solicitud o enviar WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno al registrar la solicitud'
    });
  }
});

// =====================================================
// GET /api/recuperacion - Listar solicitudes
// =====================================================
router.get('/', async (req, res) => {
  try {
    // Verificamos si la tabla existe antes de consultar
    const [tableCheck] = await pool.query(
      `SELECT COUNT(*) as existe 
       FROM information_schema.tables 
       WHERE table_schema = 'malfi_vet' 
       AND table_name = 'solicitudes_recuperacion'`
    );

    if (tableCheck[0].existe === 0) {
      console.warn('⚠️ Tabla solicitudes_recuperacion no existe aún');
      return res.json([]); // Devolvemos array vacío en vez de romper
    }

    const [rows] = await pool.query(
      'SELECT id, nombre, email, mensaje, fecha, estado FROM solicitudes_recuperacion ORDER BY fecha DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar solicitudes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cargar solicitudes',
      detalle: error.message 
    });
  }
});

// =====================================================
// PUT /api/recuperacion/:id - Actualizar estado
// =====================================================
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado || !['pendiente', 'atendida', 'cancelada'].includes(estado)) {
    return res.status(400).json({
      success: false,
      message: 'Estado inválido'
    });
  }

  try {
    const [result] = await pool.query(
      'UPDATE solicitudes_recuperacion SET estado = ? WHERE id = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    res.json({
      success: true,
      message: `Solicitud actualizada a ${estado}`
    });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// =====================================================
// POST /api/recuperacion/forgot-password
// =====================================================
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  console.log('[FORGOT-PASSWORD] Recibido email:', email);

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.log('[FORGOT-PASSWORD] Email inválido');
    return res.status(400).json({ success: false, message: 'Email válido requerido' });
  }

  const emailLimpio = email.trim().toLowerCase();
  console.log('[FORGOT-PASSWORD] Email limpio para búsqueda:', emailLimpio);

  try {
    console.log('[FORGOT-PASSWORD] Ejecutando query en empleados...');

    const [users] = await pool.query(
      'SELECT id, nombre, rol FROM empleados WHERE email = ? AND activo = 1',
      [emailLimpio]
    );

    console.log('[FORGOT-PASSWORD] Filas encontradas:', users.length);
    if (users.length > 0) {
      console.log('[FORGOT-PASSWORD] Primer usuario encontrado:', users[0]);
    }

    if (users.length === 0) {
      console.log('[FORGOT-PASSWORD] No se encontró usuario activo con ese email → devolvemos mensaje genérico');
      return res.json({ success: true, message: 'Si el email está registrado, recibirás un link de recuperación' });
    }

    const user = users[0];
    console.log('[FORGOT-PASSWORD] Rol del usuario:', user.rol);

    if (user.rol !== 'admin') {
      console.log('[FORGOT-PASSWORD] El rol no es admin → no enviamos email');
      return res.json({ success: true, message: 'Contactá a la dueña para recuperación' });
    }

    console.log('[FORGOT-PASSWORD] Es admin → generando token seguro');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    console.log('[FORGOT-PASSWORD] Token generado:', token.substring(0, 10) + '...');
    console.log('[FORGOT-PASSWORD] Fecha de expiración:', expires);

    await pool.query(
      'UPDATE empleados SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [token, expires, user.id]
    );

    console.log('[FORGOT-PASSWORD] Token y expiración guardados en BD. Llamando a enviarEmailRecuperacion...');

    const emailEnviado = await enviarEmailRecuperacion(emailLimpio, token, user.nombre);

    console.log('[FORGOT-PASSWORD] Resultado del envío:', emailEnviado ? 'ÉXITO' : 'FALLÓ');

    if (!emailEnviado) {
      console.log('[FORGOT-PASSWORD] Falló el envío del email → devolvemos error 500');
      return res.status(500).json({ success: false, message: 'Error al enviar el email de recuperación' });
    }

    console.log('[FORGOT-PASSWORD] Todo OK → email enviado');
    res.json({ success: true, message: 'Email de recuperación enviado correctamente' });
  } catch (err) {
    console.error('[FORGOT-PASSWORD] Error crítico en el proceso:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// =====================================================
// POST /api/recuperacion/forgot-password/reset-password
// =====================================================
router.post('/forgot-password/reset-password', async (req, res) => {
  const { token, email, newPassword, newUsuario } = req.body;

  console.log('[RESET-PASSWORD] Recibida solicitud de reset');
  console.log('[RESET-PASSWORD] Token recibido:', token ? token.substring(0, 10) + '...' : 'NO TOKEN');
  console.log('[RESET-PASSWORD] Email recibido:', email);
  console.log('[RESET-PASSWORD] Nuevo usuario recibido:', newUsuario || 'NO ENVIADO');

  if (!token || !email || !newPassword || newPassword.length < 6) {
    console.log('[RESET-PASSWORD] Datos inválidos');
    return res.status(400).json({ success: false, message: 'Datos inválidos o contraseña muy corta (mínimo 6 caracteres)' });
  }

  try {
    console.log('[RESET-PASSWORD] Buscando usuario con token válido...');

    const [users] = await pool.query(
      'SELECT id FROM empleados WHERE email = ? AND reset_token = ? AND reset_expires > NOW()',
      [email, token]
    );

    console.log('[RESET-PASSWORD] Usuarios encontrados con token válido:', users.length);

    if (users.length === 0) {
      console.log('[RESET-PASSWORD] Token inválido o expirado');
      return res.status(400).json({ success: false, message: 'Token inválido, expirado o email incorrecto' });
    }

    const userId = users[0].id;
    console.log('[RESET-PASSWORD] Usuario encontrado - ID:', userId);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('[RESET-PASSWORD] Contraseña hasheada correctamente');

    // Preparamos la query dinámica
    let updateQuery = 'UPDATE empleados SET password = ?, reset_token = NULL, reset_expires = NULL';
    let params = [hashedPassword];

    if (newUsuario && newUsuario.trim()) {
      console.log('[RESET-PASSWORD] Actualizando usuario a:', newUsuario.trim());
      updateQuery += ', usuario = ?';
      params.push(newUsuario.trim());
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await pool.query(updateQuery, params);

    console.log('[RESET-PASSWORD] Cuenta actualizada con éxito');

    res.json({ success: true, message: 'Cuenta actualizada correctamente. Ya podés iniciar sesión con tus nuevos datos.' });
  } catch (err) {
    console.error('[RESET-PASSWORD] Error al procesar reset:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar la cuenta' });
  }
});

module.exports = router;
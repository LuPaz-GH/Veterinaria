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
    const [tableCheck] = await pool.query(
      `SELECT COUNT(*) as existe 
       FROM information_schema.tables 
       WHERE table_schema = 'malfi_vet' 
       AND table_name = 'solicitudes_recuperacion'`
    );

    if (tableCheck[0].existe === 0) {
      console.warn('⚠️ Tabla solicitudes_recuperacion no existe aún');
      return res.json([]);
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
// POST /api/recuperacion/forgot-password-email   ← NUEVO (el que vas a usar)
// =====================================================
router.post('/forgot-password-email', async (req, res) => {
  const { email } = req.body;

  console.log('[FORGOT-PASSWORD-EMAIL] Recibido email:', email);

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Email válido requerido' });
  }

  const emailLimpio = email.trim().toLowerCase();

  try {
    const [users] = await pool.query(
      'SELECT id, nombre FROM empleados WHERE LOWER(email) = ? AND activo = 1',
      [emailLimpio]
    );

    if (users.length === 0) {
      console.log('[FORGOT-PASSWORD-EMAIL] No se encontró usuario → respuesta genérica');
      return res.json({ success: true, message: 'Si el email está registrado, recibirás un link de recuperación' });
    }

    const user = users[0];

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.query(
      'UPDATE empleados SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [token, expires, user.id]
    );

    const emailEnviado = await enviarEmailRecuperacion(emailLimpio, token, user.nombre);

    if (!emailEnviado) {
      return res.status(500).json({ success: false, message: 'Error al enviar el email de recuperación' });
    }

    res.json({ success: true, message: 'Link de recuperación enviado correctamente' });

  } catch (err) {
    console.error('[FORGOT-PASSWORD-EMAIL] Error crítico:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// =====================================================
// POST /api/recuperacion/forgot-password/reset-password  ← ACTUALIZADO
// =====================================================
router.post('/forgot-password/reset-password', async (req, res) => {
  const { token, newPassword, newUsuario } = req.body;

  console.log('[RESET-PASSWORD] Recibida solicitud de reset');

  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Token y nueva contraseña son obligatorios (mínimo 6 caracteres)' });
  }

  try {
    const [users] = await pool.query(
      'SELECT id FROM empleados WHERE reset_token = ? AND reset_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }

    const userId = users[0].id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let updateQuery = `
      UPDATE empleados 
      SET password = ?, 
          reset_token = NULL, 
          reset_expires = NULL
    `;
    let params = [hashedPassword];

    if (newUsuario && newUsuario.trim()) {
      console.log('[RESET-PASSWORD] Actualizando usuario a:', newUsuario.trim());
      updateQuery += ', usuario = ?';
      params.push(newUsuario.trim().toLowerCase());
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await pool.query(updateQuery, params);

    console.log('[RESET-PASSWORD] Cuenta actualizada con éxito');

    res.json({ 
      success: true, 
      message: 'Contraseña y usuario actualizados correctamente. Ya podés iniciar sesión.' 
    });
  } catch (err) {
    console.error('[RESET-PASSWORD] Error al procesar reset:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar la cuenta' });
  }
});

module.exports = router;
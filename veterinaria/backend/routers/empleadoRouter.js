const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt'); // ← NUEVO: para hashear contraseñas

const SALT_ROUNDS = 10; // Puedes subirlo a 12 o 14 en producción

// GET - Listar empleados activos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, usuario, rol, activo, fecha_creacion FROM empleados WHERE activo = 1 ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener empleados:', err);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// POST - Crear nuevo empleado (CORREGIDO + CONTRASEÑA HASHEADA)
router.post('/', async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;

  // Log para debug: Ver qué llega exactamente al servidor
  console.log('Datos recibidos en el servidor:', req.body);

  if (!nombre || !usuario || !password || !rol) {
    return res.status(400).json({ 
      error: 'Faltan datos requeridos', 
      recibido: { nombre, usuario, password: !!password, rol } 
    });
  }

  try {
    // 1. Verificar si el usuario ya existe
    const [existing] = await pool.query('SELECT id FROM empleados WHERE usuario = ?', [usuario]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    // 2. Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Insertar en la base de datos (ahora con contraseña hasheada)
    const [result] = await pool.query(
      'INSERT INTO empleados (nombre, usuario, password, rol, activo) VALUES (?, ?, ?, ?, 1)',
      [nombre, usuario, hashedPassword, rol]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      usuario,
      rol,
      activo: 1
      // Nota: NO devolvemos la contraseña ni el hash por seguridad
    });
  } catch (err) {
    console.error('Error en el INSERT:', err);
    res.status(500).json({ error: 'Error interno al crear empleado' });
  }
});

// PUT - Actualizar empleado (ahora también hashea si viene nueva contraseña)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, password, rol } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM empleados WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    let query = 'UPDATE empleados SET ';
    const params = [];
    const updates = [];

    if (nombre) { 
      updates.push('nombre = ?'); 
      params.push(nombre); 
    }

    if (usuario) {
      const [duplicado] = await pool.query(
        'SELECT id FROM empleados WHERE usuario = ? AND id != ?',
        [usuario, id]
      );
      if (duplicado.length > 0) {
        return res.status(400).json({ error: 'Usuario ya en uso' });
      }
      updates.push('usuario = ?'); 
      params.push(usuario);
    }

    // Si viene contraseña nueva → hashearla
    if (password) { 
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push('password = ?'); 
      params.push(hashedPassword);
    }

    if (rol) { 
      updates.push('rol = ?'); 
      params.push(rol); 
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Sin cambios' });

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ message: 'Actualizado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE - Borrado lógico (sin cambios)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE empleados SET activo = 0 WHERE id = ?', [id]);
    res.json({ message: 'Desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
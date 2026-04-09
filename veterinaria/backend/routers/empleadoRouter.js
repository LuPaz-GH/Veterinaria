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

// NUEVO: GET - Listar empleados en la papelera (activos = 0)
router.get('/papelera', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, usuario, rol, activo, fecha_creacion FROM empleados WHERE activo = 0 ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener papelera de empleados:', err);
    res.status(500).json({ error: 'Error al obtener la papelera' });
  }
});

// POST - Crear nuevo empleado (CORREGIDO + CONTRASEÑA HASHEADA + AUDITORÍA)
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

    // REGISTRO EN AUDITORÍA
    await pool.query(
      `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
       VALUES (NOW(), ?, 'Creado', 'Sistema', 'empleados', ?, 0)`,
      [`Empleado: ${nombre}`, result.insertId]
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

// PUT - Actualizar empleado (CON AUDITORÍA INTEGRADA ✅)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, password, rol, activo } = req.body;

  try {
    // 1. Verificar que el empleado existe y obtener su nombre original
    const [existing] = await pool.query('SELECT id, nombre FROM empleados WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const nombreOriginal = existing[0].nombre;

    // 2. Preparar la consulta de actualización
    let query = 'UPDATE empleados SET ';
    const params = [];
    const updates = [];
    const cambios = []; // Para registrar qué campos se modificaron

    if (nombre) { 
      updates.push('nombre = ?'); 
      params.push(nombre);
      cambios.push(`Nombre: ${nombreOriginal} → ${nombre}`);
    }

    if (usuario) {
      // Verificar que el nuevo usuario no esté en uso por otro empleado
      const [duplicado] = await pool.query(
        'SELECT id FROM empleados WHERE usuario = ? AND id != ?',
        [usuario, id]
      );
      if (duplicado.length > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
      updates.push('usuario = ?'); 
      params.push(usuario);
      cambios.push('Usuario actualizado');
    }

    // Si viene contraseña nueva → hashearla antes de guardar
    if (password && password.trim() !== '') { 
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updates.push('password = ?'); 
      params.push(hashedPassword);
      cambios.push('Contraseña actualizada');
    }

    if (rol) { 
      updates.push('rol = ?'); 
      params.push(rol);
      cambios.push(`Rol: ${rol}`);
    }

    // Permitir cambiar el estado (activo/inactivo) mediante esta ruta
    if (activo !== undefined) {
      updates.push('activo = ?');
      params.push(activo);
      cambios.push(`Estado: ${activo ? 'Activo' : 'Inactivo'}`);
    }

    // Si no hay nada para actualizar, retornar error
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron cambios para actualizar' });
    }

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    // 3. Ejecutar la actualización en la base de datos
    await pool.query(query, params);

    // 4. ✅ REGISTRAR EN AUDITORÍA
    // Intentamos obtener el usuario responsable desde el token (si existe)
    let responsable = 'Sistema';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_default');
        responsable = decoded.nombre || decoded.usuario || responsable;
      } catch (e) {
        // Si no se puede decodificar el token, queda 'Sistema'
        console.log('No se pudo decodificar el token para auditoría:', e.message);
      }
    }

    await pool.query(
      `INSERT INTO auditoria 
       (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
       VALUES (NOW(), ?, 'Editado', ?, 'empleados', ?, 0)`,
      [`Empleado: ${nombre || nombreOriginal} | Cambios: ${cambios.join('; ')}`, responsable, id]
    );

    res.json({ message: 'Empleado actualizado con éxito' });

  } catch (err) {
    console.error('❌ Error al actualizar empleado:', err);
    res.status(500).json({ error: 'Error interno al actualizar empleado' });
  }
});

// NUEVO: PUT - Restaurar empleado de la papelera
router.put('/restaurar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE empleados SET activo = 1 WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Auditoría de restauración
    await pool.query(
      `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
       VALUES (NOW(), (SELECT CONCAT('Empleado: ', nombre) FROM empleados WHERE id = ?), 'Restaurado', 'Sistema', 'empleados', ?, 0)`,
      [id, id]
    );

    res.json({ message: 'Empleado restaurado con éxito' });
  } catch (err) {
    console.error('Error al restaurar empleado:', err);
    res.status(500).json({ error: 'Error al restaurar' });
  }
});

// DELETE - Borrado lógico (Ahora con Auditoría)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Primero obtenemos el nombre para la auditoría
    const [emp] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [id]);
    
    await pool.query('UPDATE empleados SET activo = 0 WHERE id = ?', [id]);

    if (emp[0]) {
      await pool.query(
        `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
         VALUES (NOW(), ?, 'Eliminado (Lógico)', 'Sistema', 'empleados', ?, 1)`,
        [`Empleado: ${emp[0].nombre}`, id]
      );
    }

    res.json({ message: 'Desactivado' });
  } catch (err) {
    console.error('Error al desactivar empleado:', err);
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// NUEVO: DELETE - Borrado Físico (Eliminar permanentemente de la papelera)
router.delete('/permanente/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM empleados WHERE id = ? AND activo = 0', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado en papelera' });
    }
    res.json({ message: 'Eliminado permanentemente' });
  } catch (err) {
    console.error('Error al eliminar permanente:', err);
    res.status(500).json({ error: 'Error al eliminar permanentemente' });
  }
});

module.exports = router;
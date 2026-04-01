const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET - Obtener todos los servicios (Activos e Inactivos para la gestión del dueño)
router.get('/', async (req, res) => {
    try {
        // Traemos todos para que la papelera del frontend pueda filtrar los inactivos
        const [rows] = await pool.query('SELECT * FROM servicios ORDER BY categoria, nombre');
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener servicios:", err);
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

// PUT - Actualizar precio o estado (activo/inactivo) de un servicio
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { precio, nombre, activo } = req.body; 
    
    try {
        // 1. Buscamos el servicio actual para saber qué estamos cambiando
        const [existing] = await pool.query('SELECT * FROM servicios WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        let query = 'UPDATE servicios SET ';
        const params = [];
        const updates = [];

        // Si viene el precio lo agregamos a la actualización
        if (precio !== undefined) { 
            updates.push('precio = ?'); 
            params.push(precio); 
        }

        // Si viene el estado de activación (basurero/restaurar)
        if (activo !== undefined) { 
            updates.push('activo = ?'); 
            params.push(activo); 
        }

        // Si viene el nombre
        if (nombre) { 
            updates.push('nombre = ?'); 
            params.push(nombre); 
        }

        // Si no mandaron nada para actualizar, salimos
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Sin datos para actualizar' });
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);
        
        // 2. DETERMINAR ACCIÓN PARA LA AUDITORÍA
        let accionAuditoria = 'Editado';
        let fueEliminado = 0;

        if (activo === 0) {
            accionAuditoria = 'Eliminado (Lógico)';
            fueEliminado = 1;
        } else if (activo === 1 && existing[0].activo === 0) {
            accionAuditoria = 'Restaurado';
            fueEliminado = 0;
        }
        
        // 3. REGISTRO EN AUDITORÍA
        await pool.query(
            `INSERT INTO auditoria (fecha, producto, categoria, accion, responsable, modulo, precio_venta, id_referencia, eliminado) 
             VALUES (NOW(), ?, 'servicio', ?, 'Admin', 'otros', ?, ?, ?)`,
            [
                `Servicio: ${nombre || existing[0].nombre}`, 
                accionAuditoria, 
                precio !== undefined ? precio : existing[0].precio, 
                id, 
                fueEliminado
            ]
        );

        res.json({ success: true, message: 'Actualizado correctamente' });
    } catch (err) {
        console.error("Error al actualizar servicio:", err);
        res.status(500).json({ error: 'Error al actualizar servicio' });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 1. Obtener historial con filtros y paginación (VERSIÓN CORREGIDA)
router.get('/historial', async (req, res) => {
    try {
        const { 
            pagina = 1, 
            limite = 25, 
            buscar, 
            categoria,     
            accion, 
            fechaDesde, 
            fechaHasta, 
            orden = 'fecha', 
            direccion = 'DESC',
            mostrarEliminados = 'false',
            modulo        
        } = req.query;

        const pageNum = parseInt(pagina) || 1;
        const limitNum = parseInt(limite) || 25;
        const offset = (pageNum - 1) * limitNum;

        // ✅ CORRECCIÓN: Usar 'modulo' si existe, sino 'categoria' (del frontend)
        const moduloFiltro = modulo || categoria;

        let query = `SELECT * FROM auditoria WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM auditoria WHERE 1=1`;
        const params = [];
        const countParams = [];

        // Filtro eliminados
        if (mostrarEliminados !== 'true' && mostrarEliminados !== true) {
            query += ` AND eliminado = 0`;
            countQuery += ` AND eliminado = 0`;
        }

        // ✅ CORRECCIÓN: Filtro por módulo (clientes, mascotas, caja, turnos, etc.)
        if (moduloFiltro && moduloFiltro !== 'todos' && moduloFiltro !== '') {
            query += ` AND modulo = ?`;
            countQuery += ` AND modulo = ?`;
            params.push(moduloFiltro);
            countParams.push(moduloFiltro);
            console.log('🔍 [Auditoría] Filtrando por módulo:', moduloFiltro);
        }

        // Búsqueda
        if (buscar && buscar.trim() !== '') {
            const searchVal = `%${buscar.trim()}%`;
            const searchSql = ` AND (producto LIKE ? OR responsable LIKE ? OR mascota LIKE ? OR servicio LIKE ?)`;
            query += searchSql;
            countQuery += searchSql;
            params.push(searchVal, searchVal, searchVal, searchVal);
            countParams.push(searchVal, searchVal, searchVal, searchVal);
        }

        // Acción
        if (accion && accion !== '') {
            query += ` AND accion = ?`;
            countQuery += ` AND accion = ?`;
            params.push(accion);
            countParams.push(accion);
        }

        // Fechas
        if (fechaDesde && fechaHasta) {
            query += ` AND fecha BETWEEN ? AND ?`;
            countQuery += ` AND fecha BETWEEN ? AND ?`;
            params.push(`${fechaDesde} 00:00:00`, `${fechaHasta} 23:59:59`);
            countParams.push(`${fechaDesde} 00:00:00`, `${fechaHasta} 23:59:59`);
        }

        // Orden
        const validColumns = ['fecha', 'producto', 'accion', 'responsable', 'modulo'];
        const sortCol = validColumns.includes(orden) ? orden : 'fecha';
        const sortDir = direccion.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

        // EJECUCIÓN
        const [rows] = await pool.query(query, params);
        const [totalRows] = await pool.query(countQuery, countParams);

        console.log('✅ [Auditoría] Encontrados', rows.length, 'registros de', totalRows[0]?.total || 0);

        res.json({
            success: true,
            datos: rows,
            total: totalRows[0]?.total || 0
        });
    } catch (error) {
        console.error('❌ ERROR CRÍTICO en GET /auditoria/historial:', error.message);

        // Si es error de tabla no existe, devolvemos array vacío
        if (error.message.includes("doesn't exist")) {
            console.warn('⚠️ Tabla auditoria no encontrada. Devolviendo datos vacíos.');
            return res.json({
                success: true,
                datos: [],
                total: 0
            });
        }
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el historial',
            error: error.message  
        });
    }
});

// Rutas POST, PATCH y PUT (sin cambios)
router.post('/', async (req, res) => {
    try {
        const { producto, mascota, categoria, servicio, accion, responsable, modulo, fecha, id_referencia } = req.body;

        const query = `
            INSERT INTO auditoria (producto, mascota, categoria, servicio, accion, responsable, modulo, fecha, id_referencia, eliminado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const [result] = await pool.query(query, [
            producto || null, 
            mascota || null, 
            categoria || null, 
            servicio || null, 
            accion, 
            responsable, 
            modulo || 'productos', 
            fecha || new Date(),
            id_referencia || null
        ]);

        res.status(201).json({ 
            success: true, 
            message: 'Registro de auditoría creado', 
            id: result.insertId  
        });
    } catch (error) {
        console.error('Error en POST /auditoria:', error);
        res.status(500).json({ success: false, message: 'Error al crear auditoría' });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { eliminado, usuario_eliminacion } = req.body;

        const query = `
            UPDATE auditoria 
            SET eliminado = ?, 
                usuario_modificacion = ?, 
                fecha_modificacion = NOW() 
            WHERE id = ?
        `;

        await pool.query(query, [eliminado ? 1 : 0, usuario_eliminacion, id]);
        res.json({ 
            success: true, 
            message: eliminado ? 'Registro marcado como eliminado' : 'Registro restaurado' 
        });
    } catch (error) {
        console.error('Error en PATCH /auditoria:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { producto, mascota, categoria, servicio, precio_venta, stock, usuario_modificacion } = req.body;

        const query = `
            UPDATE auditoria 
            SET producto = ?, 
                mascota = ?,
                categoria = ?, 
                servicio = ?,
                precio_venta = ?, 
                stock = ?, 
                usuario_modificacion = ?, 
                fecha_modificacion = NOW(),
                accion = 'Editado'
            WHERE id = ?
        `;
        await pool.query(query, [
            producto || null, 
            mascota || null, 
            categoria || null, 
            servicio || null, 
            precio_venta || null, 
            stock || null, 
            usuario_modificacion, 
            id
        ]);
        res.json({ success: true, message: 'Registro actualizado correctamente' });
    } catch (error) {
        console.error('Error en PUT /auditoria:', error);
        res.status(500).json({ success: false, message: 'Error al editar el registro' });
    }
});

module.exports = router;
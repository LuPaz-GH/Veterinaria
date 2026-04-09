const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// 1. Obtener historial con filtros y paginación
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

        const moduloFiltro = modulo || categoria;

        let query = `SELECT * FROM auditoria WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM auditoria WHERE 1=1`;
        const params = [];
        const countParams = [];

        if (moduloFiltro && moduloFiltro !== 'todos' && moduloFiltro !== '') {
            query += ` AND modulo = ?`;
            countQuery += ` AND modulo = ?`;
            params.push(moduloFiltro);
            countParams.push(moduloFiltro);
            console.log('🔍 [Auditoría] Filtrando por módulo:', moduloFiltro);
        }

        if (buscar && buscar.trim() !== '') {
            const searchVal = `%${buscar.trim()}%`;
            const searchSql = ` AND (producto LIKE ? OR responsable LIKE ? OR mascota LIKE ? OR servicio LIKE ?)`;
            query += searchSql;
            countQuery += searchSql;
            params.push(searchVal, searchVal, searchVal, searchVal);
            countParams.push(searchVal, searchVal, searchVal, searchVal);
        }

        if (accion && accion !== '') {
            query += ` AND accion = ?`;
            countQuery += ` AND accion = ?`;
            params.push(accion);
            countParams.push(accion);
        }

        if (fechaDesde && fechaHasta) {
            query += ` AND fecha BETWEEN ? AND ?`;
            countQuery += ` AND fecha BETWEEN ? AND ?`;
            params.push(`${fechaDesde} 00:00:00`, `${fechaHasta} 23:59:59`);
            countParams.push(`${fechaDesde} 00:00:00`, `${fechaHasta} 23:59:59`);
        }

        const validColumns = ['fecha', 'producto', 'accion', 'responsable', 'modulo'];
        const sortCol = validColumns.includes(orden) ? orden : 'fecha';
        const sortDir = direccion.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

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

// ==================== PAPELERA GENERAL DE AUDITORÍA ====================
router.get('/papelera', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.*,
                DATE_FORMAT(a.fecha, '%d/%m/%Y %H:%i') as fecha_formateada,
                DATE_FORMAT(a.fecha, '%d/%m/%Y %H:%i') as fecha_eliminacion_formateada,
                COALESCE(a.responsable, 'Sistema') as responsable_borrado
            FROM auditoria a
            WHERE a.eliminado = 1
            ORDER BY a.fecha DESC
            LIMIT 200
        `);

        console.log(`✅ [Papelera] Se encontraron ${rows.length} registros eliminados`);

        res.json(rows);
    } catch (error) {
        console.error('❌ Error al obtener papelera general:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cargar la papelera',
            error: error.message 
        });
    }
});

// ==================== RUTAS PROTEGIDAS CON AUTH ====================

// Rutas POST, PATCH y PUT (mantengo sin auth por ahora, ya que antes funcionaban)
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

// ==================== BORRADO PERMANENTE (CORREGIDO) ====================
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') {
            console.warn(`⚠️ Intento de borrado permanente sin permisos por usuario: ${req.user?.nombre || 'desconocido'}`);
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para realizar esta acción' 
            });
        }

        const { id } = req.params;
        console.log(`🗑️ [Borrado Permanente] Usuario ${req.user.nombre} solicita eliminar ID: ${id}`);

        const [rows] = await pool.query(
            'SELECT id, producto, modulo, accion, responsable FROM auditoria WHERE id = ? AND eliminado = 1', 
            [id]
        );

        if (rows.length === 0) {
            console.warn(`⚠️ Registro ID ${id} no encontrado o no está en papelera`);
            return res.status(404).json({ 
                success: false, 
                message: 'Registro no encontrado o no está en la papelera' 
            });
        }

        const registro = rows[0];
        console.log(`📋 [Borrado Permanente] Registro a eliminar:`, {
            id: registro.id,
            producto: registro.producto,
            modulo: registro.modulo,
            accion: registro.accion
        });

        console.log(`🔒 [LOG SEGURO] Usuario "${req.user.nombre}" eliminó PERMANENTEMENTE el registro de auditoría ID=${id} | Módulo: ${registro.modulo} | Acción original: ${registro.accion} | Elemento: ${registro.producto}`);

        const [result] = await pool.query('DELETE FROM auditoria WHERE id = ?', [id]);

        if (result.affectedRows > 0) {
            console.log(`✅ [Borrado Permanente] Registro ID ${id} eliminado exitosamente de la BD`);
            res.json({ 
                success: true, 
                message: 'Registro eliminado permanentemente',
                detalles: {
                    id_eliminado: id,
                    elemento: registro.producto,
                    modulo: registro.modulo,
                    fecha_borrado: new Date().toISOString()
                }
            });
        } else {
            console.error(`❌ [Borrado Permanente] No se pudo eliminar el registro ID ${id}`);
            res.status(500).json({ 
                success: false, 
                message: 'No se pudo completar la eliminación' 
            });
        }
    } catch (error) {
        console.error('❌ ERROR CRÍTICO en DELETE /auditoria/:id:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno al eliminar permanentemente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==================== VACIAR PAPELERA COMPLETA ====================
router.delete('/papelera/vaciar', authMiddleware, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para vaciar la papelera' 
            });
        }

        console.log(`🗑️ [Vaciar Papelera] Usuario ${req.user.nombre} solicita vaciar TODA la papelera de auditoría`);

        const [countRows] = await pool.query('SELECT COUNT(*) as total FROM auditoria WHERE eliminado = 1');
        const totalAEliminar = countRows[0]?.total || 0;

        if (totalAEliminar === 0) {
            return res.json({ 
                success: true, 
                message: 'La papelera ya está vacía',
                registros_eliminados: 0 
            });
        }

        console.log(`🔒 [LOG SEGURO] Usuario "${req.user.nombre}" vació la papelera de auditoría | Registros eliminados: ${totalAEliminar}`);

        const [result] = await pool.query('DELETE FROM auditoria WHERE eliminado = 1');

        console.log(`✅ [Vaciar Papelera] ${result.affectedRows} registros eliminados permanentemente`);

        res.json({ 
            success: true, 
            message: 'Papelera de auditoría vaciada exitosamente',
            registros_eliminados: result.affectedRows,
            fecha: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ ERROR CRÍTICO en DELETE /auditoria/papelera/vaciar:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error al vaciar la papelera',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
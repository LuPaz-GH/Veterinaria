const pool = require('../config/db');

const productoService = {
    // 1. Obtener productos por categoría (CORREGIDO Y MEJORADO)
    getByCategoria: async (categoria, pagina = 1, limite = 12) => {
        try {
            const offset = (pagina - 1) * limite;
            const catNormalizada = categoria ? categoria.toString().toLowerCase().trim() : '';
            console.log(`🔍 [getByCategoria] Buscando categoría: "${catNormalizada}" | Página: ${pagina} | Límite: ${limite}`);
            
            let query = `
                SELECT p.*, 
                       a.fecha_vencimiento as vencimiento_alimento,
                       m.fecha_vencimiento as vencimiento_med
                FROM productos p
                LEFT JOIN alimentos a ON p.id = a.producto_id
                LEFT JOIN medicamentos m ON p.id = m.producto_id
                WHERE p.activo = 1
            `;
            const params = [];
            
            if (catNormalizada && ['petshop', 'alimentos', 'medicamentos', 'otros'].includes(catNormalizada)) {
                query += ` AND p.categoria = ?`;
                params.push(catNormalizada);
            }
            
            query += `
                ORDER BY p.nombre ASC
                LIMIT ? OFFSET ?
            `;
            params.push(Number(limite), Number(offset));
            
            const [rows] = await pool.query(query, params);
            
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM productos p 
                WHERE p.activo = 1
            `;
            const countParams = [];
            if (catNormalizada && ['petshop', 'alimentos', 'medicamentos', 'otros'].includes(catNormalizada)) {
                countQuery += ` AND p.categoria = ?`;
                countParams.push(catNormalizada);
            }
            
            const [[{ total }]] = await pool.query(countQuery, countParams);
            
            return {
                productos: rows,
                total: Number(total),
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(total / limite)
            };
        } catch (error) {
            console.error("❌ Error SQL en getByCategoria:", error.message);
            throw error;
        }
    },

    create: async (datos, usuarioId) => {
        const { nombre, categoria, precio_compra, precio_venta, stock, stock_minimo, info } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [empleado] = await connection.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            
            const [resProd] = await connection.query(
                'INSERT INTO productos (nombre, categoria, precio_compra, precio_venta, stock, stock_minimo, creado_por, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())',
                [nombre, categoria, precio_compra || 0, precio_venta, stock || 0, stock_minimo || 5, usuarioId]
            );
            
            const prodId = resProd.insertId;
            
            if (categoria === 'alimentos') {
                await connection.query('INSERT INTO alimentos (producto_id, fecha_vencimiento) VALUES (?, ?)', [prodId, info || null]);
            } else if (categoria === 'medicamentos') {
                await connection.query('INSERT INTO medicamentos (producto_id, fecha_vencimiento) VALUES (?, ?)', [prodId, info || null]);
            }
            
            await connection.query(
                `INSERT INTO auditoria (fecha, producto, categoria, accion, responsable, modulo, precio_venta, stock, id_referencia, eliminado) 
                 VALUES (NOW(), ?, ?, 'Creado', ?, 'productos', ?, ?, ?, 0)`,
                [nombre, categoria, responsableNombre, precio_venta, stock, prodId]
            );
            
            await connection.commit();
            return prodId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    update: async (id, datos, usuarioId) => {
        const { nombre, precio_venta, stock, info, categoria } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [empleado] = await connection.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            
            await connection.query(
                'UPDATE productos SET nombre = ?, precio_venta = ?, stock = ?, editado_por = ?, fecha_edicion = NOW() WHERE id = ?',
                [nombre, precio_venta, stock, usuarioId, id]
            );
            
            if (categoria === 'alimentos') {
                await connection.query(
                    `INSERT INTO alimentos (producto_id, fecha_vencimiento) VALUES (?, ?) ON DUPLICATE KEY UPDATE fecha_vencimiento = VALUES(fecha_vencimiento)`,
                    [id, info || null]
                );
            } else if (categoria === 'medicamentos') {
                await connection.query(
                    `INSERT INTO medicamentos (producto_id, fecha_vencimiento) VALUES (?, ?) ON DUPLICATE KEY UPDATE fecha_vencimiento = VALUES(fecha_vencimiento)`,
                    [id, info || null]
                );
            }
            
            await connection.query(
                `INSERT INTO auditoria (fecha, producto, categoria, accion, responsable, modulo, precio_venta, stock, id_referencia, eliminado) 
                 VALUES (NOW(), ?, ?, 'Editado', ?, 'productos', ?, ?, ?, 0)`,
                [nombre, categoria, responsableNombre, precio_venta, stock, id]
            );
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    delete: async (id, usuarioId) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [producto] = await connection.query('SELECT nombre, categoria, precio_venta, stock FROM productos WHERE id = ?', [id]);
            const [empleado] = await connection.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const p = producto[0];
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            
            await connection.query('UPDATE productos SET activo = 0, borrado_por = ?, fecha_borrado = NOW() WHERE id = ?', [usuarioId, id]);
            
            if (p) {
                await connection.query(
                    `INSERT INTO auditoria (fecha, producto, categoria, accion, responsable, modulo, precio_venta, stock, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Eliminado', ?, 'productos', ?, ?, ?, 1)`,
                    [p.nombre, p.categoria, responsableNombre, p.precio_venta, p.stock, id]
                );
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getEliminadosByCategoria: async (categoria) => {
        const [rows] = await pool.query(`
            SELECT p.*, e.nombre as responsable_borrado
            FROM productos p
            LEFT JOIN empleados e ON p.borrado_por = e.id
            WHERE p.activo = 0 AND p.categoria = ?
            ORDER BY p.fecha_borrado DESC
        `, [categoria]);
        return rows;
    },

    restaurar: async (id) => {
        const [result] = await pool.query(
            'UPDATE productos SET activo = 1, borrado_por = NULL, fecha_borrado = NULL WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    },

    // FUNCIÓN PARA ELIMINAR FÍSICAMENTE EL PRODUCTO
    eliminarPermanente: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            // Borrar primero de tablas relacionadas (Foreign Keys)
            await connection.query('DELETE FROM alimentos WHERE producto_id = ?', [id]);
            await connection.query('DELETE FROM medicamentos WHERE producto_id = ?', [id]);
            // Borrar el producto base
            const [result] = await connection.query('DELETE FROM productos WHERE id = ?', [id]);
            
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getHistorialMovimientos: async (filtros = {}) => {
        const { buscar, fechaDesde, fechaHasta, categoria, accion, responsable, orden, direccion, pagina, limite, mostrarEliminados } = filtros;
        const offset = (pagina - 1) * limite;
        const params = [];
        let baseQuery = `SELECT * FROM auditoria WHERE 1=1`;
        
        if (buscar) {
            baseQuery += ` AND (
                producto LIKE ? 
                OR mascota LIKE ? 
                OR responsable LIKE ? 
                OR servicio LIKE ?
                OR DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') LIKE ?
            )`;
            const searchVal = `%${buscar}%`;
            params.push(searchVal, searchVal, searchVal, searchVal, searchVal);
        }
        
        if (categoria && categoria !== '') {
            baseQuery += ` AND modulo = ?`;
            params.push(categoria);
        }
        
        if (accion && accion !== '') {
            baseQuery += ` AND accion = ?`;
            params.push(accion);
        }
        
        if (mostrarEliminados !== 'true') {
            baseQuery += ` AND eliminado = 0`;
        }
        
        if (fechaDesde) { baseQuery += ` AND fecha >= ?`; params.push(`${fechaDesde} 00:00:00`); }
        if (fechaHasta) { baseQuery += ` AND fecha <= ?`; params.push(`${fechaHasta} 23:59:59`); }
        
        const [countRes] = await pool.query(`SELECT COUNT(*) as total FROM (${baseQuery}) as t`, params);
        const total = countRes[0].total;
        
        const validCols = ['producto', 'categoria', 'responsable', 'fecha', 'precio_venta', 'stock', 'accion', 'modulo'];
        const sortCol = validCols.includes(orden) ? orden : 'fecha';
        const sortDir = String(direccion).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        baseQuery += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
        params.push(Number(limite), Number(offset));
        
        const [rows] = await pool.query(baseQuery, params);
        
        return {
            datos: rows,
            total,
            pagina: Number(pagina),
            limite: Number(limite),
            totalPaginas: Math.ceil(total / limite)
        };
    },

    buscarParaCaja: async (termino) => {
        let query = `SELECT id, nombre, precio_venta, stock, categoria FROM productos WHERE activo = 1`;
        const params = [];
        
        if (termino && termino.trim() !== "") {
            query += ` AND nombre LIKE ?`;
            params.push(`%${termino}%`);
        }
        
        query += ` ORDER BY nombre ASC LIMIT 30`;
        const [rows] = await pool.query(query, params);
        return rows;
    },

    actualizarStock: async (id, cantidad) => {
        const [result] = await pool.query('UPDATE productos SET stock = GREATEST(stock + ?, 0) WHERE id = ? AND activo = 1', [cantidad, id]);
        return result.affectedRows > 0;
    }
};

module.exports = productoService;
const pool = require('../config/db');

const productoService = {
    // Obtener productos por categoría
    getByCategoria: async (categoria) => {
        let query = `
            SELECT p.*, a.fecha_vencimiento as vencimiento_alimento,
                   m.fecha_vencimiento as vencimiento_med
            FROM productos p
            LEFT JOIN alimentos a ON p.id = a.producto_id
            LEFT JOIN medicamentos m ON p.id = m.producto_id
            WHERE p.categoria = ? AND p.activo = 1
            ORDER BY p.nombre ASC
        `;
        const [rows] = await pool.query(query, [categoria]);
        return rows;
    },

    create: async (datos) => {
        const { nombre, categoria, precio_compra, precio_venta, stock, stock_minimo, info } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [resProd] = await connection.query(
                'INSERT INTO productos (nombre, categoria, precio_compra, precio_venta, stock, stock_minimo) VALUES (?, ?, ?, ?, ?, ?)',
                [nombre, categoria, precio_compra || 0, precio_venta, stock || 0, stock_minimo || 5]
            );
            const prodId = resProd.insertId;
            if (categoria === 'alimentos') {
                await connection.query('INSERT INTO alimentos (producto_id, fecha_vencimiento) VALUES (?, ?)', [prodId, info || null]);
            } else if (categoria === 'medicamentos') {
                await connection.query('INSERT INTO medicamentos (producto_id, fecha_vencimiento) VALUES (?, ?)', [prodId, info || null]);
            }
            await connection.commit();
            return prodId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    update: async (id, datos) => {
        const { nombre, precio_venta, stock, info, categoria } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Actualizar datos generales
            await connection.query(
                'UPDATE productos SET nombre = ?, precio_venta = ?, stock = ? WHERE id = ?',
                [nombre, precio_venta, stock, id]
            );

            // 2. Actualización de fecha (CORREGIDO con ON DUPLICATE KEY UPDATE)
            // Esto asegura que si por alguna razón no existe el registro en la tabla hija, lo cree.
            if (categoria === 'alimentos') {
                await connection.query(`
                    INSERT INTO alimentos (producto_id, fecha_vencimiento) 
                    VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE fecha_vencimiento = VALUES(fecha_vencimiento)`, 
                    [id, info || null]
                );
            } else if (categoria === 'medicamentos') {
                await connection.query(`
                    INSERT INTO medicamentos (producto_id, fecha_vencimiento) 
                    VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE fecha_vencimiento = VALUES(fecha_vencimiento)`, 
                    [id, info || null]
                );
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error("Error en update:", error);
            throw error;
        } finally {
            connection.release();
        }
    },

    delete: async (id) => {
        const [result] = await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    // Búsqueda para la Caja
    buscarParaCaja: async (termino) => {
        let query = `SELECT id, nombre, precio_venta, stock, stock_minimo, categoria FROM productos WHERE activo = 1`;
        const params = [];
        if (termino && termino.trim() !== "") {
            query += ` AND nombre LIKE ?`;
            params.push(`%${termino}%`);
        }
        query += ` ORDER BY nombre ASC LIMIT 30`;
        const [rows] = await pool.query(query, params);
        return rows;
    }
};

module.exports = productoService;
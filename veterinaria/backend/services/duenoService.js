const pool = require('../config/db');

const duenoService = {
    // 1. Obtener todos los dueños activos
    getAll: async () => {
        const [rows] = await pool.query(
            'SELECT * FROM duenos WHERE activo = 1 ORDER BY nombre ASC'
        );
        return rows;
    },

    // 2. Obtener dueños eliminados (Papelera) con info de quién lo borró
    getEliminados: async () => {
        const [rows] = await pool.query(`
            SELECT d.*, e.nombre as responsable_borrado 
            FROM duenos d 
            LEFT JOIN empleados e ON d.borrado_por = e.id 
            WHERE d.activo = 0 
            ORDER BY d.fecha_borrado DESC
        `);
        return rows;
    },

    // 3. Buscar por DNI (Solo activos)
    getByDni: async (dni) => {
        const [rows] = await pool.query('SELECT * FROM duenos WHERE dni = ? AND activo = 1', [dni]);
        return rows[0] || null;
    },

    // 4. Crear nuevo dueño
    create: async (datos) => {
        const { nombre, dni, telefono, email, direccion } = datos;
        const [result] = await pool.query(
            'INSERT INTO duenos (nombre, dni, telefono, email, direccion, activo) VALUES (?, ?, ?, ?, ?, 1)',
            [nombre, dni, telefono || null, email || null, direccion || null]
        );
        return result.insertId;
    },

    // 5. Actualizar dueño
    update: async (id, datos) => {
        const { nombre, dni, telefono, email, direccion } = datos;
        const [result] = await pool.query(
            'UPDATE duenos SET nombre = ?, dni = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?',
            [nombre, dni, telefono || null, email || null, direccion || null, id]
        );
        return result.affectedRows > 0;
    },

    // 6. Borrado Lógico (Soft Delete con Auditoría)
    delete: async (id, usuarioId) => {
        const [result] = await pool.query(
            'UPDATE duenos SET activo = 0, borrado_por = ?, fecha_borrado = NOW() WHERE id = ?', 
            [usuarioId, id]
        );
        return result.affectedRows > 0;
    },

    // 7. Restaurar dueño
    restore: async (id) => {
        const [result] = await pool.query(
            'UPDATE duenos SET activo = 1, borrado_por = NULL, fecha_borrado = NULL WHERE id = ?', 
            [id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = duenoService;
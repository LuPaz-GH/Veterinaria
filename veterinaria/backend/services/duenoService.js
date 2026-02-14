const pool = require('../config/db');

const duenoService = {
    // 1. Obtener todos los dueños (Sin filtro de 'activo')
    getAll: async () => {
        const [rows] = await pool.query(
            'SELECT * FROM duenos ORDER BY nombre ASC'
        );
        return rows;
    },

    // 2. Buscar por DNI
    getByDni: async (dni) => {
        const [rows] = await pool.query('SELECT * FROM duenos WHERE dni = ?', [dni]);
        return rows[0] || null;
    },

    // 3. Crear nuevo dueño (Sin la columna 'activo')
    create: async (datos) => {
        const { nombre, dni, telefono, email, direccion } = datos;

        const [result] = await pool.query(
            'INSERT INTO duenos (nombre, dni, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
            [
                nombre,
                dni,
                telefono || null,
                email || null,
                direccion || null
            ]
        );

        return result.insertId;
    },

    // 4. Actualizar dueño
    update: async (id, datos) => {
        const { nombre, dni, telefono, email, direccion } = datos;

        const [result] = await pool.query(
            'UPDATE duenos SET nombre = ?, dni = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?',
            [nombre, dni, telefono || null, email || null, direccion || null, id]
        );

        return result.affectedRows > 0;
    },

    // 5. Borrado Físico (Elimina el registro permanentemente de la tabla)
    delete: async (id) => {
        const [result] = await pool.query('DELETE FROM duenos WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = duenoService;
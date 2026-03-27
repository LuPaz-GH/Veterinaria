const duenoService = require('../services/duenoService');
const pool = require('../config/db'); // Necesario para buscar el nombre del empleado

const duenoController = {
    // 1. Obtener todos los dueños activos
    getDuenos: async (req, res) => {
        try {
            const data = await duenoService.getAll();
            res.json(data);
        } catch (err) {
            console.error('Error al obtener dueños:', err);
            res.status(500).json({ error: 'Error al obtener la lista' });
        }
    },

    // 2. Obtener la Papelera (Clientes con activo = 0)
    getPapelera: async (req, res) => {
        try {
            const data = await duenoService.getEliminados();
            res.json(data);
        } catch (err) {
            console.error('Error al obtener papelera:', err);
            res.status(500).json({ error: 'Error al cargar la papelera' });
        }
    },

    // 3. Crear un nuevo dueño (MODIFICADO CON AUDITORÍA)
    createDueno: async (req, res) => {
        try {
            const { dni, nombre } = req.body;
            const usuarioId = req.user ? req.user.id : null;

            if (dni) {
                const existe = await duenoService.getByDni(dni);
                if (existe) return res.status(409).json({ error: 'DNI ya registrado' });
            }
            
            const id = await duenoService.create(req.body);

            // REGISTRO EN AUDITORÍA
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Creado', ?, 'clientes', ?, 0)`,
                    [`Cliente: ${nombre}`, responsableNombre, id]
                );
            }

            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al crear dueño' });
        }
    },

    // 4. Actualizar
    updateDueno: async (req, res) => {
        try {
            const actualizado = await duenoService.update(req.params.id, req.body);
            if (!actualizado) return res.status(404).json({ error: 'No encontrado' });
            res.json({ success: true, message: 'Actualizado' });
        } catch (err) {
            res.status(500).json({ error: 'Error al actualizar' });
        }
    },

    // 5. Borrado Lógico (Soft Delete con Auditoría)
    deleteDueno: async (req, res) => {
        try {
            const usuarioId = req.user ? req.user.id : null; 
            
            // Obtener nombre del dueño para la auditoría antes de borrar
            const [dueno] = await pool.query('SELECT nombre FROM duenos WHERE id = ?', [req.params.id]);
            
            const eliminado = await duenoService.delete(req.params.id, usuarioId); 
            if (!eliminado) return res.status(404).json({ error: 'Dueño no encontrado' });
            
            // REGISTRO EN AUDITORÍA
            if (usuarioId && dueno[0]) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Eliminado', ?, 'clientes', ?, 1)`,
                    [`Cliente: ${dueno[0].nombre}`, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true, message: 'Registro movido a la papelera' });
        } catch (err) {
            console.error('Error al eliminar:', err);
            res.status(500).json({ error: 'Error al borrar' });
        }
    },

    // 6. Restaurar
    restaurarDueno: async (req, res) => {
        try {
            const restaurado = await duenoService.restore(req.params.id);
            if (!restaurado) return res.status(404).json({ error: 'No se encontró el registro' });
            res.json({ success: true, message: 'Restaurado con éxito' });
        } catch (err) {
            res.status(500).json({ error: 'Error al restaurar' });
        }
    }
};

module.exports = duenoController;
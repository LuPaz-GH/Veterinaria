const duenoService = require('../services/duenoService');
const pool = require('../config/db');

const duenoController = {
    getDuenos: async (req, res) => {
        try {
            const data = await duenoService.getAll();
            res.json(data);
        } catch (err) {
            console.error('Error al obtener dueños:', err);
            res.status(500).json({ error: 'Error al obtener la lista' });
        }
    },

    getPapelera: async (req, res) => {
        try {
            const data = await duenoService.getEliminados();
            res.json(data);
        } catch (err) {
            console.error('Error al obtener papelera:', err);
            res.status(500).json({ error: 'Error al cargar la papelera' });
        }
    },

    createDueno: async (req, res) => {
        try {
            const { dni, nombre, mascotas } = req.body;
            const usuarioId = req.user ? req.user.id : null;

            if (dni) {
                const existe = await duenoService.getByDni(dni);
                if (existe) return res.status(409).json({ error: 'DNI ya registrado' });
            }
            
            const id = await duenoService.create(req.body);

            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';

                let nombreMascota = null;
                if (mascotas && Array.isArray(mascotas) && mascotas.length > 0) {
                    nombreMascota = mascotas[0].nombre || null;
                }

                await pool.query(
                    `INSERT INTO auditoria 
                     (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Creado', ?, 'clientes', ?, 0)`,
                    [`Cliente: ${nombre}`, nombreMascota, responsableNombre, id]
                );
            }

            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al crear dueño' });
        }
    },

    updateDueno: async (req, res) => {
        try {
            const actualizado = await duenoService.update(req.params.id, req.body);
            if (!actualizado) return res.status(404).json({ error: 'No encontrado' });
            
            const usuarioId = req.user ? req.user.id : null;
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                const { nombre } = req.body;

                let nombreMascota = null;
                if (req.body.mascotas && Array.isArray(req.body.mascotas) && req.body.mascotas.length > 0) {
                    nombreMascota = req.body.mascotas[0].nombre || null;
                } else {
                    const [mascotaRow] = await pool.query('SELECT nombre FROM mascotas WHERE dueno_id = ? LIMIT 1', [req.params.id]);
                    nombreMascota = mascotaRow[0]?.nombre || null;
                }

                await pool.query(
                    `INSERT INTO auditoria 
                     (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Editado', ?, 'clientes', ?, 0)`,
                    [`Cliente: ${nombre || 'Cliente'}`, nombreMascota, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true, message: 'Actualizado' });
        } catch (err) {
            console.error('Error al actualizar:', err);
            res.status(500).json({ error: 'Error al actualizar' });
        }
    },

    // ==================== BORRADO LÓGICO - VERSIÓN CORREGIDA ====================
    deleteDueno: async (req, res) => {
        try {
            console.log('🔥 deleteDueno llamado - ID:', req.params.id);
            console.log('🔑 req.user:', req.user);

            const usuarioId = req.user ? req.user.id : null; 
            
            if (!usuarioId) {
                console.log('⚠️ No hay usuarioId (authMiddleware falló?)');
            }

            // 1. OBTENER DATOS ANTES DEL BORRADO
            // Consultamos antes porque después del soft-delete el SELECT podría no encontrarlo
            const [duenoRows] = await pool.query('SELECT nombre FROM duenos WHERE id = ?', [req.params.id]);
            const duenoEncontrado = duenoRows[0];
            
            console.log('👤 Dueño encontrado en BD:', duenoEncontrado ? duenoEncontrado.nombre : 'NO ENCONTRADO');

            if (!duenoEncontrado) {
                console.log('❌ No se puede borrar un dueño que no existe');
                return res.status(404).json({ error: 'Dueño no encontrado' });
            }

            // 2. EJECUTAR EL BORRADO LÓGICO
            const eliminado = await duenoService.delete(req.params.id, usuarioId); 
            console.log('🗑️ Resultado de soft delete:', eliminado);

            if (!eliminado) {
                console.log('❌ duenoService.delete devolvió false');
                return res.status(404).json({ error: 'Dueño no encontrado al intentar borrar' });
            }
            
            // 3. REGISTRAR EN AUDITORÍA (Usando los datos que guardamos en el paso 1)
            if (usuarioId && duenoEncontrado) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                console.log('👷 Responsable:', responsableNombre);

                const [mascotaRow] = await pool.query(
                    'SELECT nombre FROM mascotas WHERE dueno_id = ? LIMIT 1', 
                    [req.params.id]
                );
                const nombreMascota = mascotaRow[0]?.nombre || null;
                console.log('🐶 Mascota encontrada:', nombreMascota);

                await pool.query(
                    `INSERT INTO auditoria 
                     (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Eliminado', ?, 'clientes', ?, 1)`,
                    [`Cliente: ${duenoEncontrado.nombre}`, nombreMascota, responsableNombre, req.params.id]
                );

                console.log(`✅ [Auditoría] Cliente ELIMINADO → ${duenoEncontrado.nombre} | Mascota: ${nombreMascota || 'ninguna'}`);
            } else {
                console.log('⚠️ No se registró en auditoría (falta usuarioId o datos del dueño)');
            }
            
            res.json({ success: true, message: 'Registro movido a la papelera' });
        } catch (err) {
            console.error('❌ Error grave en deleteDueno:', err);
            res.status(500).json({ error: 'Error al borrar' });
        }
    },

    restaurarDueno: async (req, res) => {
        try {
            // 1. OBTENER DATOS ANTES DE RESTAURAR
            const [duenoRows] = await pool.query('SELECT nombre FROM duenos WHERE id = ?', [req.params.id]);
            const duenoData = duenoRows[0];

            const restaurado = await duenoService.restore(req.params.id);
            if (!restaurado) return res.status(404).json({ error: 'No se encontró el registro para restaurar' });
            
            const usuarioId = req.user ? req.user.id : null;
            if (usuarioId && duenoData) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';

                const [mascotaRow] = await pool.query('SELECT nombre FROM mascotas WHERE dueno_id = ? LIMIT 1', [req.params.id]);
                const nombreMascota = mascotaRow[0]?.nombre || null;

                await pool.query(
                    `INSERT INTO auditoria 
                     (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Restaurado', ?, 'clientes', ?, 0)`,
                    [`Cliente: ${duenoData.nombre}`, nombreMascota, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true, message: 'Restaurado con éxito' });
        } catch (err) {
            console.error('Error al restaurar:', err);
            res.status(500).json({ error: 'Error al restaurar' });
        }
    }
};

module.exports = duenoController;
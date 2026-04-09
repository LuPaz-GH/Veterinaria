const operacionService = require('../services/operacionService');
const pool = require('../config/db');

const operacionController = {

    // MASCOTAS
    getMascotas: async (req, res) => {
        try {
            const mascotas = await operacionService.getMascotas();
            res.json(mascotas);
        } catch (err) {
            console.error('Error al obtener mascotas:', err);
            res.status(500).json({ error: 'Error al obtener mascotas' });
        }
    },

    getPapeleraMascotas: async (req, res) => {
        try {
            const mascotas = await operacionService.getMascotasEliminadas();
            res.json(mascotas);
        } catch (err) {
            console.error('Error al obtener papelera de mascotas:', err);
            res.status(500).json({ error: 'Error al obtener papelera' });
        }
    },

    restaurarMascota: async (req, res) => {
        try {
            await operacionService.restaurarMascota(req.params.id);
            res.json({ success: true, message: 'Mascota restaurada' });
        } catch (err) {
            console.error('Error al restaurar mascota:', err);
            res.status(500).json({ error: 'Error al restaurar mascota' });
        }
    },

    crearMascota: async (req, res) => {
        try {
            const id = await operacionService.crearMascota(req.body);
            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al crear mascota:', err);
            res.status(500).json({ error: 'Error al crear mascota' });
        }
    },

    actualizarMascota: async (req, res) => {
        try {
            await operacionService.actualizarMascota(req.params.id, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar mascota:', err);
            res.status(500).json({ error: 'Error al actualizar mascota' });
        }
    },

    eliminarMascota: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            await operacionService.eliminarMascota(req.params.id, usuarioId);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar mascota:', err);
            res.status(500).json({ error: 'Error al eliminar mascota' });
        }
    },

    eliminarMascotaPermanente: async (req, res) => {
        try {
            if (!req.user || req.user.rol !== 'admin') {
                return res.status(403).json({ error: 'Solo administradores pueden borrar permanentemente' });
            }
            const { id } = req.params;
            await pool.query('DELETE FROM historial_clinico WHERE mascota_id = ?', [id]);
            await pool.query('DELETE FROM mascotas WHERE id = ?', [id]);
            res.json({ success: true, message: 'Mascota eliminada definitivamente' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al eliminar mascota permanentemente' });
        }
    },

    // ESTÉTICA
    getEstetica: async (req, res) => {
        try {
            const resultado = await operacionService.getEstetica(req.query);
            res.json(resultado);
        } catch (err) {
            console.error('Error al obtener estética:', err);
            res.status(500).json({ error: 'Error al obtener turnos de estética' });
        }
    },

    crearEstetica: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            const id = await operacionService.crearEstetica(req.body, usuarioId);
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                const descripcion = `Estética: ${req.body.tipo_servicio || 'Turno nuevo'}`;
                
                let nombreMascota = null;
                if (req.body.mascota_id) {
                    const [mRow] = await pool.query('SELECT nombre FROM mascotas WHERE id = ?', [req.body.mascota_id]);
                    nombreMascota = mRow[0]?.nombre;
                }

                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado, mascota) 
                     VALUES (NOW(), ?, 'Creado', ?, 'estetica', ?, 0, ?)`,
                    [descripcion, responsableNombre, id, nombreMascota]
                );
            }
            
            res.status(201).json({ success: true, id, message: 'Turno de estética creado correctamente' });
        } catch (err) {
            console.error('❌ Error al crear turno de estética:', err);
            if (err.message === 'HORARIO_OCUPADO') {
                return res.status(409).json({
                    success: false,
                    message: 'El horario seleccionado ya está ocupado. Por favor, elegí otro.'
                });
            }
            res.status(500).json({
                success: false,
                error: 'Error al crear turno de estética',
                detalle: err.message
            });
        }
    },

    actualizarEstetica: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            await operacionService.actualizarEstetica(req.params.id, req.body, usuarioId);
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Editado', ?, 'estetica', ?, 0)`,
                    [`Turno Estética ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true, message: 'Turno actualizado correctamente' });
        } catch (err) {
            console.error('Error al actualizar estética:', err);
            if (err.message === 'HORARIO_OCUPADO') {
                return res.status(409).json({
                    success: false,
                    message: 'El horario seleccionado ya está ocupado.'
                });
            }
            res.status(500).json({ error: 'Error al actualizar turno', detalle: err.message });
        }
    },

    eliminarEstetica: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            await operacionService.eliminarEstetica(req.params.id, usuarioId);
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Eliminado', ?, 'estetica', ?, 1)`,
                    [`Turno Estética ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar estética:', err);
            res.status(500).json({ error: 'Error al eliminar turno' });
        }
    },

    // TURNOS GENERALES
    getTurnos: async (req, res) => {
        try {
            const resultado = await operacionService.getTurnos(req.query);
            res.json(resultado);
        } catch (err) {
            console.error('Error al obtener turnos:', err);
            res.status(500).json({ error: 'Error al obtener turnos' });
        }
    },

    crearTurnoGeneral: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;

            const id = await operacionService.crearTurnoGeneral({
                ...req.body,
                usuario_id: usuarioId
            });

            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al crear turno:', err);
            if (err.message === 'HORARIO_OCUPADO') {
                return res.status(409).json({
                    success: false,
                    message: 'El horario seleccionado ya está ocupado.'
                });
            }
            res.status(500).json({ error: 'Error al crear turno', detalle: err.message });
        }
    },

    actualizarTurno: async (req, res) => {
        try {
            await operacionService.actualizarTurno(req.params.id, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar turno:', err);
            res.status(500).json({ error: 'Error al actualizar turno' });
        }
    },

    eliminarTurno: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            const [turno] = await pool.query(`
                SELECT t.tipo, m.nombre as mascota_nombre 
                FROM turnos t 
                LEFT JOIN mascotas m ON t.mascota_id = m.id 
                WHERE t.id = ?`, [req.params.id]);

            await operacionService.eliminarTurno(req.params.id, usuarioId);

            if (usuarioId && turno[0]) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Eliminado', ?, 'turnos', ?, 1)`,
                    [`Turno: ${turno[0].tipo}`, turno[0].mascota_nombre, responsableNombre, req.params.id]
                );
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar turno:', err);
            res.status(500).json({ error: 'Error al eliminar turno' });
        }
    },

    getTurnosPapelera: async (req, res) => {
        try {
            const turnos = await operacionService.getTurnosEliminados();
            res.json(turnos);
        } catch (err) {
            console.error('Error al obtener papelera de turnos:', err);
            res.status(500).json({ error: 'Error al cargar la papelera' });
        }
    },

    restaurarTurno: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            const [turno] = await pool.query(`
                SELECT t.tipo, m.nombre as mascota_nombre 
                FROM turnos t 
                LEFT JOIN mascotas m ON t.mascota_id = m.id 
                WHERE t.id = ?`, [req.params.id]);

            await operacionService.restaurarTurno(req.params.id);

            if (usuarioId && turno[0]) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Restaurado', ?, 'turnos', ?, 0)`,
                    [`Turno: ${turno[0].tipo}`, turno[0].mascota_nombre, responsableNombre, req.params.id]
                );
            }

            res.json({ success: true, message: 'Turno restaurado correctamente' });
        } catch (err) {
            console.error('Error al restaurar turno:', err);
            res.status(500).json({ error: 'Error al restaurar turno' });
        }
    },

    eliminarTurnoPermanente: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            const [turno] = await pool.query(`
                SELECT t.tipo, m.nombre as mascota_nombre 
                FROM turnos t 
                LEFT JOIN mascotas m ON t.mascota_id = m.id 
                WHERE t.id = ?`, [req.params.id]);

            await operacionService.eliminarTurnoPermanente(req.params.id);

            if (usuarioId && turno[0]) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Borrado Permanente', ?, 'turnos', ?, 1)`,
                    [`Turno: ${turno[0].tipo}`, turno[0].mascota_nombre, responsableNombre, req.params.id]
                );
            }

            res.json({ success: true, message: 'Turno eliminado permanentemente' });
        } catch (err) {
            console.error('Error al eliminar turno permanentemente:', err);
            res.status(500).json({ error: 'Error al eliminar registro' });
        }
    },

    // HISTORIAL CLÍNICO - CORREGIDO
    getHistorial: async (req, res) => {
        try {
            const { mascotaId } = req.params;
            const historial = await operacionService.getHistorial(mascotaId);
            res.json(historial);
        } catch (err) {
            console.error('Error al obtener historial:', err);
            res.status(500).json({ error: 'Error al obtener historial' });
        }
    },

    getPapeleraHistorial: async (req, res) => {
        try {
            const { mascotaId } = req.params;
            const historial = await operacionService.getHistorialEliminado(mascotaId);
            res.json(historial);
        } catch (err) {
            console.error('Error al obtener papelera de historial:', err);
            res.status(500).json({ error: 'Error al obtener papelera' });
        }
    },

    restaurarHistorial: async (req, res) => {
        try {
            await operacionService.restaurarHistorial(req.params.id);
            res.json({ success: true, message: 'Registro restaurado' });
        } catch (err) {
            console.error('Error al restaurar historial:', err);
            res.status(500).json({ error: 'Error al restaurar historial' });
        }
    },

    crearHistorial: async (req, res) => {
        try {
            const { diagnostico, tratamiento, peso, mascota_id } = req.body;
            const veterinario_id = req.user?.id || req.body.veterinario_id;

            if (!diagnostico || !mascota_id) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Faltan campos requeridos: diagnóstico y mascota son obligatorios" 
                });
            }

            const id = await operacionService.crearHistorial({
                diagnostico, 
                tratamiento: tratamiento || '', 
                peso: peso || 0, 
                veterinario_id, 
                mascota_id
            });

            // AUDITORÍA
            if (req.user?.id) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [req.user.id]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                
                let nombreMascota = 'Sin nombre';
                const [mRow] = await pool.query('SELECT nombre FROM mascotas WHERE id = ?', [mascota_id]);
                if (mRow.length > 0) nombreMascota = mRow[0].nombre;

                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado, mascota) 
                     VALUES (NOW(), ?, 'Creado', ?, 'historial', ?, 0, ?)`,
                    [`Historial clínico`, responsableNombre, id, nombreMascota]
                );
            }
            
            res.status(201).json({ success: true, id, message: 'Historial guardado correctamente' });
        } catch (err) {
            console.error('❌ Error al crear historial:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Error al guardar el historial', 
                detalle: err.message 
            });
        }
    },

    actualizarHistorial: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            await operacionService.actualizarHistorial(req.params.id, req.body);
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Editado', ?, 'historial', ?, 0)`,
                    [`Historial ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar historial:', err);
            res.status(500).json({ error: 'Error al actualizar historial' });
        }
    },

    eliminarHistorial: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            await operacionService.eliminarHistorial(req.params.id, usuarioId);
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Eliminado', ?, 'historial', ?, 1)`,
                    [`Historial ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }
            
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar historial:', err);
            res.status(500).json({ error: 'Error al eliminar historial' });
        }
    },

    eliminarHistorialPermanente: async (req, res) => {
        try {
            if (!req.user || req.user.rol !== 'admin') {
                return res.status(403).json({ error: 'Acceso denegado' });
            }
            const { id } = req.params;
            await pool.query('DELETE FROM historial_clinico WHERE id = ?', [id]);
            res.json({ success: true, message: 'Registro clínico borrado' });
        } catch (err) {
            res.status(500).json({ error: 'Error al eliminar registro' });
        }
    },

    // CAJA - AUDITORÍA INTEGRADA
    getMovimientosCaja: async (req, res) => {
        try {
            const movimientos = await operacionService.getMovimientosCaja();
            res.json(movimientos);
        } catch (err) {
            console.error('Error al obtener caja:', err);
            res.status(500).json({ error: 'Error al obtener movimientos' });
        }
    },

    getPapeleraCaja: async (req, res) => {
        try {
            const borrados = await operacionService.getMovimientosCajaBorrados();
            res.json(borrados);
        } catch (err) {
            console.error('Error al obtener papelera de caja:', err);
            res.status(500).json({ error: 'Error al obtener papelera' });
        }
    },

    registrarMovimiento: async (req, res) => {
        try {
            const id = await operacionService.registrarMovimiento(req.body);
            const usuarioId = req.user?.id || req.body.usuario_id;
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                const resumen = `Venta Caja: ${req.body.descripcion?.substring(0, 100) || 'Sin detalle'}`;
                
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Creado', ?, 'caja', ?, 0)`,
                    [resumen, responsableNombre, id]
                );
            }

            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al registrar movimiento:', err);
            res.status(500).json({ error: 'Error al registrar movimiento' });
        }
    },

    actualizarMovimiento: async (req, res) => {
        try {
            await operacionService.actualizarMovimiento(req.params.id, req.body);
            const usuarioId = req.user?.id || null;

            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Editado', ?, 'caja', ?, 0)`,
                    [`Venta Editada ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar movimiento:', err);
            res.status(500).json({ error: 'Error al actualizar movimiento' });
        }
    },

    eliminarMovimiento: async (req, res) => {
        try {
            const usuarioId = req.user?.id || null;
            await operacionService.eliminarMovimiento(req.params.id, usuarioId);
            
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Eliminado', ?, 'caja', ?, 1)`,
                    [`Venta Anulada ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar movimiento:', err);
            res.status(500).json({ error: 'Error al eliminar movimiento' });
        }
    },

    restaurarMovimientoCaja: async (req, res) => {
        try {
            await operacionService.restaurarMovimientoCaja(req.params.id);
            const usuarioId = req.user?.id || null;

            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Restaurado', ?, 'caja', ?, 0)`,
                    [`Venta Restaurada ID: ${req.params.id}`, responsableNombre, req.params.id]
                );
            }

            res.json({ success: true, message: 'Movimiento restaurado' });
        } catch (err) {
            console.error('Error al restaurar movimiento de caja:', err);
            res.status(500).json({ error: 'Error al restaurar' });
        }
    },

    eliminarCobroPermanente: async (req, res) => {
        try {
            if (!req.user || req.user.rol !== 'admin') {
                return res.status(403).json({ error: 'No tienes permisos de administrador' });
            }
            const { id } = req.params;
            const usuarioId = req.user.id;
            const [cobro] = await pool.query('SELECT descripcion FROM caja WHERE id = ?', [id]);
            const desc = cobro[0]?.descripcion?.substring(0, 50) || id;

            await pool.query('DELETE FROM caja WHERE id = ?', [id]);

            const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            await pool.query(
                `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                 VALUES (NOW(), ?, 'Borrado Permanente', ?, 'caja', ?, 1)`,
                [`Cobro: ${desc}`, responsableNombre, id]
            );

            res.json({ success: true, message: 'Cobro eliminado definitivamente' });
        } catch (err) {
            console.error("❌ Error en eliminarCobroPermanente:", err);
            res.status(500).json({ error: 'Error al eliminar permanentemente' });
        }
    },

    // SERVICIOS Y PRODUCTOS
    getServicios: async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT id, nombre, precio, categoria 
                FROM servicios 
                WHERE activo = 1 
                ORDER BY categoria, nombre
            `);
            res.json(rows);
        } catch (err) {
            console.error('Error al obtener servicios:', err);
            res.status(500).json({ error: 'Error al cargar servicios' });
        }
    },

    buscarProductos: async (req, res) => {
        try {
            const { q } = req.query;
            if (!q || q.length < 2) return res.json([]);

            const [rows] = await pool.query(`
                SELECT id, nombre, precio_venta, stock 
                FROM productos 
                WHERE (nombre LIKE ? OR codigo LIKE ?) 
                AND activo = 1 
                LIMIT 15
            `, [`%${q}%`, `%${q}%`]);

            res.json(rows);
        } catch (err) {
            console.error('Error al buscar productos:', err);
            res.status(500).json([]);
        }
    },

    // DASHBOARD
    getReportesDashboard: async (req, res) => {
        try {
            const reportes = await operacionService.getReportesDashboard();
            res.json(reportes);
        } catch (err) {
            console.error('Error al obtener reportes:', err);
            res.status(500).json({ error: 'Error al obtener reportes' });
        }
    },

    atenderConsulta: async (req, res) => {
        try {
            await operacionService.atenderConsulta(req.params.id, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al atender consulta:', err);
            res.status(500).json({ error: 'Error al atender consulta' });
        }
    },

    // GESTIÓN DE EMPLEADOS
    getEmpleados: async (req, res) => {
        try {
            const empleados = await operacionService.getEmpleados();
            res.json(empleados);
        } catch (err) {
            console.error('Error al obtener empleados:', err);
            res.status(500).json({ error: 'Error al obtener empleados' });
        }
    },

    crearEmpleado: async (req, res) => {
        try {
            const id = await operacionService.crearEmpleado(req.body);
            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al crear empleado:', err);
            res.status(500).json({ error: 'Error al crear empleado' });
        }
    },

    actualizarEmpleado: async (req, res) => {
        try {
            await operacionService.actualizarEmpleado(req.params.id, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar empleado:', err);
            res.status(500).json({ error: 'Error al actualizar empleado' });
        }
    },

    eliminarEmpleado: async (req, res) => {
        try {
            await operacionService.eliminarEmpleado(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar empleado:', err);
            res.status(500).json({ error: 'Error al eliminar empleado' });
        }
    },

    restaurarEmpleado: async (req, res) => {
        try {
            await operacionService.restaurarEmpleado(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al restaurar empleado:', err);
            res.status(500).json({ error: 'Error al restaurar empleado' });
        }
    }
};

module.exports = operacionController;
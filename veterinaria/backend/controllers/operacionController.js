const operacionService = require('../services/operacionService');

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
            const id = await operacionService.crearTurnoGeneral(req.body);
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
            await operacionService.eliminarTurno(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar turno:', err);
            res.status(500).json({ error: 'Error al eliminar turno' });
        }
    },

    // HISTORIAL CLÍNICO
    getHistorial: async (req, res) => {
        try {
            const historial = await operacionService.getHistorial(req.params.mascotaId);
            res.json(historial);
        } catch (err) {
            console.error('Error al obtener historial:', err);
            res.status(500).json({ error: 'Error al obtener historial' });
        }
    },

    crearHistorial: async (req, res) => {
        try {
            const id = await operacionService.crearHistorial(req.body);
            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al crear historial:', err);
            res.status(500).json({ error: 'Error al crear historial' });
        }
    },

    actualizarHistorial: async (req, res) => {
        try {
            await operacionService.actualizarHistorial(req.params.id, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar historial:', err);
            res.status(500).json({ error: 'Error al actualizar historial' });
        }
    },

    eliminarHistorial: async (req, res) => {
        try {
            await operacionService.eliminarHistorial(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar historial:', err);
            res.status(500).json({ error: 'Error al eliminar historial' });
        }
    },

    // CAJA
    getMovimientosCaja: async (req, res) => {
        try {
            const movimientos = await operacionService.getMovimientosCaja();
            res.json(movimientos);
        } catch (err) {
            console.error('Error al obtener caja:', err);
            res.status(500).json({ error: 'Error al obtener movimientos' });
        }
    },

    registrarMovimiento: async (req, res) => {
        try {
            const id = await operacionService.registrarMovimiento(req.body);
            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al registrar movimiento:', err);
            res.status(500).json({ error: 'Error al registrar movimiento' });
        }
    },

    actualizarMovimiento: async (req, res) => {
        try {
            await operacionService.actualizarMovimiento(req.params.id, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al actualizar movimiento:', err);
            res.status(500).json({ error: 'Error al actualizar movimiento' });
        }
    },

    eliminarMovimiento: async (req, res) => {
        try {
            await operacionService.eliminarMovimiento(req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error('Error al eliminar movimiento:', err);
            res.status(500).json({ error: 'Error al eliminar movimiento' });
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

    // =============================================
    // GESTIÓN DE EMPLEADOS
    // =============================================

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
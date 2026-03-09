const operacionService = require('../services/operacionService');
const pool = require('../config/db');

const operacionController = {
    getMascotas: async (req, res) => {
        try { res.json(await operacionService.getMascotas()); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    crearMascota: async (req, res) => {
        try { res.status(201).json({ id: await operacionService.crearMascota(req.body) }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    actualizarMascota: async (req, res) => {
        try { await operacionService.actualizarMascota(req.params.id, req.body); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    eliminarMascota: async (req, res) => {
        try { await operacionService.eliminarMascota(req.params.id); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    getEstetica: async (req, res) => {
        try { res.json(await operacionService.getEstetica()); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },

    crearEstetica: async (req, res) => {
        try {
            const { 
                mascota_nombre, dueno_nombre, fecha, hora, servicio, notas,
                es_nueva_mascota, mascota_id, raza 
            } = req.body;

            if (!fecha || !hora) {
                return res.status(400).json({ error: 'Fecha y hora son obligatorias' });
            }

            const fechaHora = `${fecha} ${hora}:00`;

            // ────────────────────────────────────────────────────────────────
            //           CHEQUEO ADICIONAL (por seguridad)
            // ────────────────────────────────────────────────────────────────
            const [existe] = await pool.query(
                `SELECT t.id FROM turnos t 
                 WHERE t.fecha = ? 
                 AND t.tipo = 'estetica' 
                 AND t.estado NOT IN ('cancelado', 'realizado')`,
                [fechaHora]
            );

            if (existe.length > 0) {
                return res.status(409).json({ 
                    error: 'El horario ya está ocupado para estética. Por favor selecciona otro.' 
                });
            }
            // ────────────────────────────────────────────────────────────────

            const turnoData = {
                fecha: fechaHora,
                tipo: 'estetica',
                motivo: servicio || 'Servicio de estética',
                mascota_id: mascota_id || null,
                mascota_nombre: mascota_nombre,
                dueno_nombre: dueno_nombre,
                raza: raza,
                tipo_servicio: servicio,
                es_nueva_mascota: es_nueva_mascota === true || es_nueva_mascota === 'true'
            };

            const turnoId = await operacionService.crearTurnoGeneral(turnoData);

            const [result] = await pool.query(
                'INSERT INTO estetica (turno_id, tipo_servicio, realizado, observaciones) VALUES (?, ?, 0, ?)',
                [turnoId, servicio || 'Servicio general', notas || null]
            );

            res.status(201).json({ success: true, id: result.insertId, turno_id: turnoId });
        } catch (e) {
            console.error('[ERROR] crearEstetica:', e.message);
            if (e.message.includes('HORARIO_OCUPADO')) {
                return res.status(409).json({ 
                    error: 'El horario ya está ocupado para estética. Por favor selecciona otro.' 
                });
            }
            res.status(500).json({ error: e.message });
        }
    },

    actualizarEstetica: async (req, res) => {
        try { await operacionService.actualizarEstetica(req.params.id, req.body); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    eliminarEstetica: async (req, res) => {
        try { await operacionService.eliminarEstetica(req.params.id); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    getTurnos: async (req, res) => {
        try { res.json(await operacionService.getTurnos()); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    crearTurnoGeneral: async (req, res) => {
        try { 
            const id = await operacionService.crearTurnoGeneral(req.body);
            res.status(201).json({ id }); 
        } 
        catch (e) { 
            console.error('[ERROR] crearTurnoGeneral:', e.message);
            if (e.message.includes('HORARIO_OCUPADO')) {
                return res.status(409).json({ 
                    error: 'El horario ya está ocupado para este tipo de turno. Por favor selecciona otro.' 
                });
            }
            res.status(500).json({ error: e.message }); 
        }
    },
    actualizarTurno: async (req, res) => {
        try { await operacionService.actualizarTurno(req.params.id, req.body); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    eliminarTurno: async (req, res) => {
        try { await operacionService.eliminarTurno(req.params.id); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    getHistorial: async (req, res) => {
        try { res.json(await operacionService.getHistorial(req.params.mascotaId)); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    crearHistorial: async (req, res) => {
        try { await operacionService.crearHistorial(req.body); res.status(201).json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    actualizarHistorial: async (req, res) => {
        try { await operacionService.actualizarHistorial(req.params.id, req.body); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    eliminarHistorial: async (req, res) => {
        try { await operacionService.eliminarHistorial(req.params.id); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    getMovimientosCaja: async (req, res) => {
        try { res.json(await operacionService.getMovimientosCaja()); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    registrarMovimiento: async (req, res) => {
        try { res.status(201).json({ id: await operacionService.registrarMovimiento(req.body) }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    actualizarMovimiento: async (req, res) => {
        try { await operacionService.actualizarMovimiento(req.params.id, req.body); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    eliminarMovimiento: async (req, res) => {
        try { await operacionService.eliminarMovimiento(req.params.id); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    getReportesDashboard: async (req, res) => {
        try { res.json(await operacionService.getReportesDashboard()); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    atenderConsulta: async (req, res) => {
        try { await operacionService.atenderConsulta(req.params.id, req.body); res.json({ message: 'OK' }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = operacionController;
const operacionService = require('../services/operacionService');

const operacionController = {
    getMascotas: async (req, res) => {
        try { res.json(await operacionService.getMascotas()); } 
        catch (e) { res.status(500).json({ error: e.message }); }
    },
    crearMascota: async (req, res) => {
        try { const id = await operacionService.crearMascota(req.body); res.status(201).json({ id }); } 
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
        try { const id = await operacionService.crearTurnoGeneral(req.body); res.status(201).json({ id }); } 
        catch (e) { res.status(500).json({ error: e.message }); }
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
        try { const id = await operacionService.registrarMovimiento(req.body); res.status(201).json({ id }); } 
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
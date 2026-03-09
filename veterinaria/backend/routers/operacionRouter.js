const express = require('express');
const router = express.Router();
const operacionController = require('../controllers/operacionController');

// REPORTES DASHBOARD
router.get('/dashboard-reportes', operacionController.getReportesDashboard);

// MASCOTAS
router.get('/mascotas', operacionController.getMascotas);
router.post('/mascotas', operacionController.crearMascota);
router.put('/mascotas/:id', operacionController.actualizarMascota);
router.delete('/mascotas/:id', operacionController.eliminarMascota);

// ESTÉTICA
router.get('/estetica', operacionController.getEstetica);
router.post('/estetica', operacionController.crearEstetica);          // ← AGREGADO: para crear nuevos turnos de estética
router.put('/estetica/:id', operacionController.actualizarEstetica);
router.put('/estetica/:id/estado', operacionController.actualizarEstetica); // Para botones Iniciar/Finalizar
router.delete('/estetica/:id', operacionController.eliminarEstetica);

// TURNOS GENERALES
router.get('/turnos', operacionController.getTurnos);
router.post('/turnos', operacionController.crearTurnoGeneral);
router.put('/turnos/:id', operacionController.actualizarTurno); 
router.delete('/turnos/:id', operacionController.eliminarTurno);
router.post('/turnos/:id/atender', operacionController.atenderConsulta);

// HISTORIAL CLÍNICO
router.get('/historial/:mascotaId', operacionController.getHistorial);
router.post('/historial', operacionController.crearHistorial);
router.put('/historial/:id', operacionController.actualizarHistorial);
router.delete('/historial/:id', operacionController.eliminarHistorial);

// CAJA
router.get('/caja', operacionController.getMovimientosCaja);
router.post('/caja', operacionController.registrarMovimiento);
router.put('/caja/:id', operacionController.actualizarMovimiento); 
router.delete('/caja/:id', operacionController.eliminarMovimiento);

module.exports = router;
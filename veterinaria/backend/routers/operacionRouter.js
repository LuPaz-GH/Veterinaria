const express = require('express');
const router = express.Router();
const operacionController = require('../controllers/operacionController');
const authMiddleware = require('../middleware/auth');

// REPORTES DASHBOARD
router.get('/dashboard-reportes', operacionController.getReportesDashboard);

// MASCOTAS
router.get('/mascotas/papelera', authMiddleware, operacionController.getPapeleraMascotas);
router.put('/mascotas/restaurar/:id', authMiddleware, operacionController.restaurarMascota);
router.get('/mascotas', operacionController.getMascotas);
router.post('/mascotas', authMiddleware, operacionController.crearMascota);
router.put('/mascotas/:id', authMiddleware, operacionController.actualizarMascota);
router.delete('/mascotas/:id', authMiddleware, operacionController.eliminarMascota);
router.delete('/mascotas/papelera/:id', authMiddleware, operacionController.eliminarMascotaPermanente);

// ESTÉTICA
router.get('/estetica', operacionController.getEstetica);
router.post('/estetica', authMiddleware, operacionController.crearEstetica);
router.put('/estetica/:id', authMiddleware, operacionController.actualizarEstetica);
router.put('/estetica/:id/estado', authMiddleware, operacionController.actualizarEstetica);
router.delete('/estetica/:id', authMiddleware, operacionController.eliminarEstetica);

// TURNOS GENERALES
router.get('/turnos', operacionController.getTurnos);
router.post('/turnos', authMiddleware, operacionController.crearTurnoGeneral);
router.put('/turnos/:id', authMiddleware, operacionController.actualizarTurno); 
router.delete('/turnos/:id', authMiddleware, operacionController.eliminarTurno);
router.post('/turnos/:id/atender', authMiddleware, operacionController.atenderConsulta);

// TURNOS ELIMINADOS (PAPELERA)
router.get('/turnos/papelera', authMiddleware, operacionController.getTurnosPapelera);
router.put('/turnos/restaurar/:id', authMiddleware, operacionController.restaurarTurno);
router.delete('/turnos/papelera/:id', authMiddleware, operacionController.eliminarTurnoPermanente); 

// HISTORIAL CLÍNICO
router.get('/historial/papelera/:mascotaId', authMiddleware, operacionController.getPapeleraHistorial);
router.put('/historial/restaurar/:id', authMiddleware, operacionController.restaurarHistorial);
router.get('/historial/:mascotaId', operacionController.getHistorial);
router.post('/historial', authMiddleware, operacionController.crearHistorial);
router.put('/historial/:id', authMiddleware, operacionController.actualizarHistorial);
router.delete('/historial/:id', authMiddleware, operacionController.eliminarHistorial);
router.delete('/historial/papelera/:id', authMiddleware, operacionController.eliminarHistorialPermanente);

// CAJA
router.get('/caja', operacionController.getMovimientosCaja);
router.post('/caja', authMiddleware, operacionController.registrarMovimiento);
router.put('/caja/:id', authMiddleware, operacionController.actualizarMovimiento); 
router.delete('/caja/:id', authMiddleware, operacionController.eliminarMovimiento);

// PAPELERA DE CAJA Y ELIMINACIÓN PERMANENTE
router.get('/caja-papelera', authMiddleware, operacionController.getPapeleraCaja);
router.put('/caja/restaurar/:id', authMiddleware, operacionController.restaurarMovimientoCaja);
router.delete('/caja/papelera/:id', authMiddleware, operacionController.eliminarCobroPermanente);

// === NUEVAS RUTAS PARA CAJA ===
router.get('/servicios', operacionController.getServicios);
router.get('/productos/buscar', operacionController.buscarProductos);

module.exports = router;
const express = require('express');
const router = express.Router();
const operacionController = require('../controllers/operacionController');
const authMiddleware = require('../middleware/auth');

// REPORTES DASHBOARD
router.get('/dashboard-reportes', operacionController.getReportesDashboard);

// MASCOTAS (PAPELERA Y RESTAURAR AGREGADOS)
router.get('/mascotas/papelera', authMiddleware, operacionController.getPapeleraMascotas);
router.put('/mascotas/restaurar/:id', authMiddleware, operacionController.restaurarMascota);
router.get('/mascotas', operacionController.getMascotas);
router.post('/mascotas', authMiddleware, operacionController.crearMascota);
router.put('/mascotas/:id', authMiddleware, operacionController.actualizarMascota);
router.delete('/mascotas/:id', authMiddleware, operacionController.eliminarMascota);

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

// =============================================
// NUEVAS RUTAS PARA TURNO ELIMINADOS (PAPELERA)
// =============================================
router.get('/turnos/papelera', authMiddleware, operacionController.getTurnosPapelera);
router.put('/turnos/restaurar/:id', authMiddleware, operacionController.restaurarTurno);

// HISTORIAL CLÍNICO
router.get('/historial/:mascotaId', operacionController.getHistorial);
router.post('/historial', authMiddleware, operacionController.crearHistorial);
router.put('/historial/:id', authMiddleware, operacionController.actualizarHistorial);
router.delete('/historial/:id', authMiddleware, operacionController.eliminarHistorial);

// CAJA
router.get('/caja', operacionController.getMovimientosCaja);
router.post('/caja', authMiddleware, operacionController.registrarMovimiento);
router.put('/caja/:id', authMiddleware, operacionController.actualizarMovimiento); 
router.delete('/caja/:id', authMiddleware, operacionController.eliminarMovimiento);

// NUEVAS RUTAS PARA PAPELERA DE CAJA (CORREGIDO)
router.get('/caja-papelera', authMiddleware, operacionController.getPapeleraCaja);
router.put('/caja/restaurar/:id', authMiddleware, operacionController.restaurarMovimientoCaja);

module.exports = router;
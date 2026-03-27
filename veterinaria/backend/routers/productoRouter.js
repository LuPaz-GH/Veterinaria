const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const productoService = require('../services/productoService');
const authMiddleware = require('../middleware/auth');

// 1. RUTA DE AUDITORÍA
router.get('/auditoria/historial', authMiddleware, productoController.getAuditoria);

// 2. NUEVA RUTA DE BÚSQUEDA
router.get('/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        console.log('[DEBUG] /productos/buscar → Término recibido:', q || '(vacío)');
        const productos = await productoService.buscarParaCaja(q);
        res.json(productos);
    } catch (err) {
        console.error('[ERROR] /productos/buscar falló:', err.message);
        res.status(500).json({ 
            error: 'Error al buscar productos', 
            detalle: err.message 
        });
    }
});

// 3. RUTAS CON PARÁMETROS DINÁMICOS
router.get('/:categoria', productoController.getPorCategoria);

// 4. RUTAS DE CREACIÓN Y EDICIÓN
router.post('/', authMiddleware, productoController.crearProducto);
router.put('/:id', authMiddleware, productoController.actualizarProducto); 
router.delete('/:id', authMiddleware, productoController.eliminarProducto);

// 5. ACTUALIZAR STOCK
router.put('/:id/stock', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;
        await productoService.actualizarStock(id, cantidad);
        res.json({ success: true, message: 'Stock actualizado correctamente' });
    } catch (err) {
        console.error('[ERROR] Falló actualización de stock:', err.message);
        res.status(500).json({ 
            error: 'Error al actualizar stock', 
            detalle: err.message 
        });
    }
});

module.exports = router;
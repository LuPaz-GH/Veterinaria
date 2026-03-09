const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const productoService = require('../services/productoService');

// NUEVA RUTA DE BÚSQUEDA (Debe ir ANTES de la ruta de :categoria)
router.get('/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        console.log('[DEBUG] /productos/buscar → Término recibido:', q || '(vacío)');
        console.log('[DEBUG] Iniciando búsqueda...');

        const productos = await productoService.buscarParaCaja(q);
        
        console.log('[DEBUG] Búsqueda exitosa →', productos.length, 'productos encontrados');
        res.json(productos);
    } catch (err) {
        console.error('[ERROR] /productos/buscar falló:');
        console.error('Mensaje:', err.message);
        console.error('Stack:', err.stack);
        res.status(500).json({ 
            error: 'Error al buscar productos', 
            detalle: err.message 
        });
    }
});

router.get('/:categoria', productoController.getPorCategoria);
router.post('/', productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto); 
router.delete('/:id', productoController.eliminarProducto);

// NUEVA RUTA PARA ACTUALIZAR STOCK (RESTAR AL VENDER)
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body; // cantidad negativa para restar

        console.log(`[DEBUG] Actualizando stock producto ${id}: cantidad ${cantidad}`);

        await productoService.actualizarStock(id, cantidad);
        
        res.json({ success: true, message: 'Stock actualizado correctamente' });
    } catch (err) {
        console.error('[ERROR] Falló actualización de stock:');
        console.error('Mensaje:', err.message);
        console.error('Stack:', err.stack);
        res.status(500).json({ 
            error: 'Error al actualizar stock', 
            detalle: err.message 
        });
    }
});

module.exports = router;
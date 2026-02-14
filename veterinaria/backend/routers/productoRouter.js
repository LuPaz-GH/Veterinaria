const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const productoService = require('../services/productoService'); // Importamos el service directamente para la búsqueda

// NUEVA RUTA DE BÚSQUEDA (Debe ir ANTES de la ruta de :categoria)
router.get('/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        const productos = await productoService.buscarParaCaja(q);
        res.json(productos);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar productos' });
    }
});

router.get('/:categoria', productoController.getPorCategoria);
router.post('/', productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto); 
router.delete('/:id', productoController.eliminarProducto);

module.exports = router;
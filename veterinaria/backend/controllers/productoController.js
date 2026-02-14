const productoService = require('../services/productoService');

const productoController = {
    getPorCategoria: async (req, res) => {
        try {
            const { categoria } = req.params;
            const productos = await productoService.getByCategoria(categoria);
            res.json(productos);
        } catch (err) {
            res.status(500).json({ error: 'Error al obtener productos' });
        }
    },

    crearProducto: async (req, res) => {
        try {
            const id = await productoService.create(req.body);
            res.status(201).json({ success: true, id });
        } catch (err) {
            res.status(500).json({ error: 'Error al crear producto' });
        }
    },

    // NUEVO: Método para editar
    actualizarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            await productoService.update(id, req.body);
            res.json({ success: true, message: 'Producto actualizado' });
        } catch (err) {
            res.status(500).json({ error: 'Error al actualizar' });
        }
    },

    eliminarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            await productoService.delete(id);
            res.json({ success: true, message: 'Producto desactivado' });
        } catch (err) {
            res.status(500).json({ error: 'Error al eliminar' });
        }
    }
};

module.exports = productoController;
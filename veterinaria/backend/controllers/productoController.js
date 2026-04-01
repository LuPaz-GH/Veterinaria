const productoService = require('../services/productoService');

const productoController = {
    // 1. Obtener productos por categoría
    getPorCategoria: async (req, res) => {
        try {
            const { categoria } = req.params;
            const pagina = parseInt(req.query.pagina) || 1;
            const limite = parseInt(req.query.limite) || 12;
            
            console.log(`📥 [Controller] getPorCategoria - Categoría recibida: "${categoria}" | Página: ${pagina}`);
            
            const resultado = await productoService.getByCategoria(categoria, pagina, limite);
            
            res.json(resultado);
        } catch (err) {
            console.error("❌ Error en getPorCategoria (Controller):", err.message);
            if (err.sql) console.error("SQL que falló:", err.sql);
            
            res.status(500).json({
                error: 'Error al obtener productos',
                detalle: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        }
    },

    // 2. CREAR: Aquí se asegura de capturar el nombre del usuario responsable
    crearProducto: async (req, res) => {
        try {
            const usuarioId = req.user ? req.user.id : null;
            
            if (!usuarioId) {
                return res.status(401).json({ error: 'Sesión expirada. Por favor, vuelve a iniciar sesión.' });
            }
            
            const id = await productoService.create(req.body, usuarioId);
            res.status(201).json({ success: true, id, message: 'Producto creado y registrado en auditoría' });
        } catch (err) {
            console.error("❌ Error en crearProducto:", err);
            res.status(500).json({ error: 'Error al crear producto', detalle: err.message });
        }
    },

    // 3. EDITAR: Registra quién hizo la modificación
    actualizarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            const usuarioId = req.user ? req.user.id : null;
            
            if (!usuarioId) {
                return res.status(401).json({ error: 'Sesión expirada. Por favor, vuelve a iniciar sesión.' });
            }
            
            await productoService.update(id, req.body, usuarioId);
            res.json({ success: true, message: 'Edición registrada correctamente' });
        } catch (err) {
            console.error("❌ Error en actualizarProducto:", err);
            res.status(500).json({ error: 'Error al actualizar producto', detalle: err.message });
        }
    },

    // 4. ELIMINAR: Registra el borrado lógico en la auditoría
    eliminarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            const usuarioId = req.user ? req.user.id : null;
            
            if (!usuarioId) {
                return res.status(401).json({ error: 'Acción no permitida sin login' });
            }
            
            await productoService.delete(id, usuarioId);
            res.json({ success: true, message: 'Producto eliminado y auditado' });
        } catch (err) {
            console.error("❌ Error en eliminarProducto:", err);
            res.status(500).json({ error: 'Error al eliminar producto', detalle: err.message });
        }
    },

    // NUEVO: Obtener productos de la papelera por categoría (Ej: Petshop)
    getPapeleraPorCategoria: async (req, res) => {
        try {
            const { categoria } = req.params;
            const productos = await productoService.getEliminadosByCategoria(categoria);
            res.json(productos);
        } catch (err) {
            console.error("❌ Error en getPapeleraPorCategoria:", err);
            res.status(500).json({ error: 'Error al obtener papelera', detalle: err.message });
        }
    },

    // NUEVO: Restaurar producto de la papelera
    restaurarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            await productoService.restaurar(id);
            res.json({ success: true, message: 'Producto restaurado correctamente' });
        } catch (err) {
            console.error("❌ Error en restaurarProducto:", err);
            res.status(500).json({ error: 'Error al restaurar producto', detalle: err.message });
        }
    },

    // 5. El Historial de auditoría
    getAuditoria: async (req, res) => {
        try {
            const filtros = {
                buscar: req.query.buscar || '',
                fechaDesde: req.query.fechaDesde || '',
                fechaHasta: req.query.fechaHasta || '',
                categoria: req.query.categoria || '',
                accion: req.query.accion || '',
                responsable: req.query.responsable || '',
                orden: req.query.orden || 'fecha',
                direccion: req.query.direccion || 'DESC',
                pagina: parseInt(req.query.pagina) || 1,
                limite: parseInt(req.query.limite) || 25
            };
            
            const resultado = await productoService.getHistorialMovimientos(filtros);
            res.json(resultado);
        } catch (err) {
            console.error("[AUDITORIA] ERROR:", err);
            res.status(500).json({
                error: 'Error al obtener historial',
                detalle: err.message
            });
        }
    }
};

module.exports = productoController;
const productoService = require('../services/productoService');
const pool = require('../config/db'); // ← AGREGADO

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

    // 2. CREAR: Ahora también registra en auditoría (por si el service no lo hace)
    crearProducto: async (req, res) => {
        try {
            const usuarioId = req.user ? req.user.id : null;
            
            if (!usuarioId) {
                return res.status(401).json({ error: 'Sesión expirada. Por favor, vuelve a iniciar sesión.' });
            }
            
            const id = await productoService.create(req.body, usuarioId);
            
            // === AUDITORÍA – NUEVO PRODUCTO ===
            const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            await pool.query(
                `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                 VALUES (NOW(), ?, 'Creado', ?, 'productos', ?, 0)`,
                [`Producto: ${req.body.nombre || 'Nuevo producto'}`, responsableNombre, id]
            );
            
            res.status(201).json({ success: true, id, message: 'Producto creado y registrado en auditoría' });
        } catch (err) {
            console.error("❌ Error en crearProducto:", err);
            res.status(500).json({ error: 'Error al crear producto', detalle: err.message });
        }
    },

    // 3. EDITAR
    actualizarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            const usuarioId = req.user ? req.user.id : null;
            
            if (!usuarioId) {
                return res.status(401).json({ error: 'Sesión expirada. Por favor, vuelve a iniciar sesión.' });
            }
            
            await productoService.update(id, req.body, usuarioId);
            
            // === AUDITORÍA – EDICIÓN PRODUCTO ===
            const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            await pool.query(
                `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                 VALUES (NOW(), ?, 'Editado', ?, 'productos', ?, 0)`,
                [`Producto ID: ${id}`, responsableNombre, id]
            );
            
            res.json({ success: true, message: 'Edición registrada correctamente' });
        } catch (err) {
            console.error("❌ Error en actualizarProducto:", err);
            res.status(500).json({ error: 'Error al actualizar producto', detalle: err.message });
        }
    },

    // 4. ELIMINAR (Mover a papelera)
    eliminarProducto: async (req, res) => {
        try {
            const { id } = req.params;
            const usuarioId = req.user ? req.user.id : null;
            
            if (!usuarioId) {
                return res.status(401).json({ error: 'Acción no permitida sin login' });
            }
            
            await productoService.delete(id, usuarioId);
            
            // === AUDITORÍA – ELIMINACIÓN PRODUCTO ===
            const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            await pool.query(
                `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                 VALUES (NOW(), ?, 'Eliminado', ?, 'productos', ?, 1)`,
                [`Producto ID: ${id}`, responsableNombre, id]
            );
            
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
            const usuarioId = req.user ? req.user.id : null;

            await productoService.restaurar(id);

            // === AUDITORÍA – RESTAURACIÓN PRODUCTO ===
            if (usuarioId) {
                const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsableNombre = empleado[0]?.nombre || 'Sistema';
                await pool.query(
                    `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, 'Restaurado', ?, 'productos', ?, 0)`,
                    [`Producto ID: ${id}`, responsableNombre, id]
                );
            }

            res.json({ success: true, message: 'Producto restaurado correctamente' });
        } catch (err) {
            console.error("❌ Error en restaurarProducto:", err);
            res.status(500).json({ error: 'Error al restaurar producto', detalle: err.message });
        }
    },

    // NUEVO: Borrado permanente de la DB
    eliminarProductoPermanente: async (req, res) => {
        try {
            if (!req.user || req.user.rol !== 'admin') {
                return res.status(403).json({ error: 'No tienes permisos de administrador' });
            }
            const { id } = req.params;
            const usuarioId = req.user.id;

            // Obtener info para auditoría antes de borrar
            const [producto] = await pool.query('SELECT nombre FROM productos WHERE id = ?', [id]);
            const nombreProd = producto[0]?.nombre || id;

            await productoService.eliminarPermanente(id);

            // === AUDITORÍA – BORRADO DEFINITIVO ===
            const [empleado] = await pool.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
            const responsableNombre = empleado[0]?.nombre || 'Sistema';
            await pool.query(
                `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                 VALUES (NOW(), ?, 'Borrado Permanente', ?, 'productos', ?, 1)`,
                [`Producto: ${nombreProd}`, responsableNombre, id]
            );

            res.json({ success: true, message: 'Producto borrado definitivamente' });
        } catch (err) {
            console.error("❌ Error en eliminarProductoPermanente:", err);
            res.status(500).json({ error: 'Error al eliminar permanentemente' });
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
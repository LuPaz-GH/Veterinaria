const express = require('express');
const router = express.Router();
const duenoController = require('../controllers/duenoController');
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db'); // ← Necesario para el borrado permanente

// Ruta para ver los borrados (Papelera)
router.get('/papelera', authMiddleware, duenoController.getPapelera);

// Ruta para restaurar un cliente
router.put('/restaurar/:id', authMiddleware, duenoController.restaurarDueno);

// Rutas normales
router.get('/', duenoController.getDuenos);
router.post('/', authMiddleware, duenoController.createDueno);
router.put('/:id', authMiddleware, duenoController.updateDueno);
router.delete('/:id', authMiddleware, duenoController.deleteDueno);

// ==================== BORRADO PERMANENTE ====================
router.delete('/:id/permanente', authMiddleware, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para realizar esta acción' 
            });
        }

        const { id } = req.params;
        console.log(`🗑️ [Borrado Permanente Dueño] Usuario ${req.user.nombre} solicita eliminar ID: ${id}`);

        const [dueno] = await pool.query('SELECT nombre FROM duenos WHERE id = ?', [id]);
        
        if (dueno.length === 0) {
            return res.status(404).json({ success: false, message: 'Dueño no encontrado' });
        }

        const [result] = await pool.query('DELETE FROM duenos WHERE id = ?', [id]);

        if (result.affectedRows > 0) {
            console.log(`✅ Dueño ID ${id} eliminado permanentemente`);
            res.json({ 
                success: true, 
                message: 'Dueño eliminado permanentemente',
                nombre: dueno[0].nombre 
            });
        } else {
            res.status(500).json({ success: false, message: 'No se pudo eliminar' });
        }
    } catch (error) {
        console.error('❌ Error en borrado permanente de dueño:', error);
        res.status(500).json({ success: false, message: 'Error interno al eliminar permanentemente' });
    }
});

module.exports = router;
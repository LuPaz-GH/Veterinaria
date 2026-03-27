const express = require('express');
const router = express.Router();
const duenoController = require('../controllers/duenoController');
const authMiddleware = require('../middleware/auth'); // Importante para saber quién borra

// Ruta para ver los borrados (Papelera)
router.get('/papelera', authMiddleware, duenoController.getPapelera);

// Ruta para restaurar un cliente
router.put('/restaurar/:id', authMiddleware, duenoController.restaurarDueno);

// Rutas normales
router.get('/', duenoController.getDuenos);
router.post('/', duenoController.createDueno);
router.put('/:id', duenoController.updateDueno);
router.delete('/:id', authMiddleware, duenoController.deleteDueno); // Ahora usa auth para la auditoría

module.exports = router;
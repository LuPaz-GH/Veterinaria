const express = require('express');
const router = express.Router();
const duenoController = require('../controllers/duenoController');

router.get('/', duenoController.getDuenos);
router.post('/', duenoController.createDueno);
router.put('/:id', duenoController.updateDueno);
router.delete('/:id', duenoController.deleteDueno);

module.exports = router;
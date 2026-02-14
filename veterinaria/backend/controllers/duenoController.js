const duenoService = require('../services/duenoService');

const duenoController = {
    // 1. Obtener todos los dueños
    getDuenos: async (req, res) => {
        try {
            const data = await duenoService.getAll();
            res.json(data);
        } catch (err) {
            console.error('Error al obtener dueños:', err);
            res.status(500).json({ error: 'Error al obtener la lista de dueños' });
        }
    },

    // 2. Crear un nuevo dueño
    createDueno: async (req, res) => {
        try {
            const { dni } = req.body;

            // Validación de DNI duplicado
            const existe = await duenoService.getByDni(dni);
            if (existe) {
                return res.status(409).json({
                    error: 'Ya existe un dueño registrado con ese DNI'
                });
            }

            const id = await duenoService.create(req.body);
            res.status(201).json({ success: true, id });
        } catch (err) {
            console.error('Error al crear dueño:', err);
            res.status(500).json({ error: 'Error interno al crear el dueño' });
        }
    },

    // 3. Actualizar datos de un dueño
    updateDueno: async (req, res) => {
        try {
            const actualizado = await duenoService.update(req.params.id, req.body);
            if (!actualizado) {
                return res.status(404).json({ error: 'Dueño no encontrado' });
            }
            res.json({ success: true, message: 'Dueño actualizado correctamente' });
        } catch (err) {
            console.error('Error al actualizar dueño:', err);
            res.status(500).json({ error: 'Error al actualizar el dueño' });
        }
    },

    // 4. Eliminar dueño (Borrado Físico según Opción 2)
    deleteDueno: async (req, res) => {
        try {
            // Llamamos a la función delete del service que borra de la tabla
            const eliminado = await duenoService.delete(req.params.id); 
            
            if (!eliminado) {
                return res.status(404).json({ error: 'Dueño no encontrado' });
            }
            res.json({ success: true, message: 'Dueño eliminado permanentemente' });
        } catch (err) {
            console.error('Error al eliminar dueño:', err);
            res.status(500).json({ error: 'Error al intentar eliminar el registro' });
        }
    }
};

module.exports = duenoController;
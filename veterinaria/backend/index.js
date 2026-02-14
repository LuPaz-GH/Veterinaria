require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

// IMPORTACIÓN DE ROUTERS
const empleadoRouter = require('./routers/empleadoRouter');
const duenoRouter = require('./routers/duenoRouter'); 
const productoRouter = require('./routers/productoRouter'); 
// --- AGREGADO: Importamos el router de operaciones ---
const operacionRouter = require('./routers/operacionRouter'); 

const app = express();
const port = process.env.PORT || 3001;

// --- Middlewares ---
// CORRECCIÓN DE CORS: Ahora permite conexiones desde los puertos 5173 y 5175
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json());

// --- Ruta de Login ---
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT id, nombre, usuario, rol FROM empleados WHERE usuario = ? AND password = ? AND activo = 1',
            [usuario, password]
        );

        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error en el proceso de login:', err);
        res.status(500).json({ success: false, message: 'Error de servidor' });
    }
});

// --- Registro de Rutas ---
app.use('/api/empleados', empleadoRouter);
app.use('/api/duenos', duenoRouter);
app.use('/api/productos', productoRouter);
// --- AGREGADO: Rutas de mascotas, turnos, estetica, historial y caja ---
app.use('/api', operacionRouter); 

// Ruta de prueba inicial
app.get('/', (req, res) => {
    res.json({ message: 'Backend Malfi OK - Puerto 3001 funcionando' });
});

// Inicio del servidor
app.listen(port, () => {
    console.log('==============================================');
    console.log(`🚀 Servidor Malfi corriendo en http://localhost:${port}`);
    console.log(`✅ Permitiendo CORS para puertos 5173 y 5175`);
    console.log('==============================================');
});
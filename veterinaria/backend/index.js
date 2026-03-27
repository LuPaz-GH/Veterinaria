require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('./config/db');

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// IMPORTACIÓN DE ROUTERS
const empleadoRouter = require('./routers/empleadoRouter');
const duenoRouter = require('./routers/duenoRouter'); 
const productoRouter = require('./routers/productoRouter'); 
const operacionRouter = require('./routers/operacionRouter'); 
const recuperacionRouter = require('./routers/recuperacionRouter');
const auditoriaRouter = require('./routers/auditoriaRouter'); // ✅ AGREGADO: Router de auditoría unificada

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json());

// ✅ RUTA DE LOGIN - PÚBLICA (maneja texto plano Y bcrypt)
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;

  console.log('[LOGIN] Intento con usuario:', usuario);

  if (!usuario || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, usuario, rol, password, activo FROM empleados WHERE usuario = ? AND activo = 1',
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const user = rows[0];
    let match = false;

    // Si la contraseña en BD es un hash bcrypt (empieza con $2b$)
    if (user.password.startsWith('$2b$')) {
      console.log('[LOGIN] Detectado hash bcrypt → usando bcrypt.compare');
      match = await bcrypt.compare(password, user.password);
    } else {
      // Si es texto plano (usuarios viejos)
      console.log('[LOGIN] Contraseña en texto plano → comparación directa');
      match = (password === user.password);
    }

    if (!match) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      success: true, 
      token,
      user: { id: user.id, nombre: user.nombre, rol: user.rol }
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// Rutas públicas
app.use('/api/empleados', empleadoRouter);
app.use('/api/duenos', duenoRouter);
app.use('/api/productos', productoRouter);
app.use('/api/recuperacion', recuperacionRouter);
app.use('/api/auditoria', auditoriaRouter); // ✅ AGREGADO: Ruta de auditoría unificada (pública para historial)

// Rutas protegidas
app.use('/api', authMiddleware, operacionRouter);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'Backend Malfi OK - Puerto 3001 funcionando' });
});

app.listen(port, () => {
  console.log('==============================================');
  console.log(`🚀 Servidor Malfi corriendo en http://localhost:${port}`);
  console.log(`✅ Permitiendo CORS para puertos 5173 y 5175`);
  console.log('Login mixto: soporta texto plano + bcrypt');
  console.log('✅ Auditoría unificada: Productos + Estética');
  console.log('==============================================');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ERROR: El puerto ${port} ya está en uso. Intenta con otro puerto o libera el actual.`);
  } else {
    console.error('Error al iniciar el servidor:', err);
  }
  process.exit(1);
});
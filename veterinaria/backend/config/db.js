const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'malfi_vet',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Prueba de conexión (muy útil para debug)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('¡Conexión a MySQL EXITOSA! → Base de datos: malfi_vet');
    connection.release();
  } catch (err) {
    console.error('¡ERROR CRÍTICO! No se pudo conectar a MySQL:');
    console.error(err.message);
    console.error('Verificá: .env, usuario/root, contraseña, base de datos creada, puerto 3306 abierto.');
  }
})();

module.exports = pool;
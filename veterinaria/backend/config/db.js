// config/db.js
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

// Prueba de conexión (opcional, solo para debug)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL exitosa - Veterinaria Malfi');
    connection.release();
  } catch (err) {
    console.error('Error al conectar a MySQL:', err);
  }
})();

module.exports = pool;
// backend/debug.js
console.log('🔍 Iniciando prueba...');
console.log('Cargando dotenv...');
require('dotenv').config();

console.log('API Key Pública:', process.env.MJ_APIKEY_PUBLIC ? '✅ Existe' : '❌ No existe');
console.log('API Key Privada:', process.env.MJ_APIKEY_PRIVATE ? '✅ Existe' : '❌ No existe');

console.log('\nCargando emailService...');
const { enviarEmail } = require('./services/emailService');
console.log('✅ emailService cargado:', typeof enviarEmail);

console.log('\nEjecutando prueba...');
enviarEmail('lucianadanizapaz@hotmail.com', 'Test', 'Hola')
  .then(() => console.log('✅ Éxito'))
  .catch(err => console.error('❌ Error:', err.message));
 backend/debug.js

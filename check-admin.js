require('dotenv').config();
const { initDB, getDB } = require('./models/db');
initDB();
const db = getDB();

console.log('=== USERS NAN DB ===');
const users = db.prepare('SELECT id, nom, email, role FROM users').all();
if (!users.length) {
  console.log('PA GEN OKENN USER! Admin poko kreye.');
} else {
  users.forEach(u => console.log(`  #${u.id} | ${u.email} | role=${u.role}`));
}

console.log('');
console.log('=== MACHiN NAN DB ===');
const cars = db.prepare('SELECT COUNT(*) as n FROM cars').get();
console.log(`  Total: ${cars.n} machin`);

console.log('');
console.log('=== KONFIGURASYON ADMIN ===');
console.log('  ADMIN_EMAIL    :', process.env.ADMIN_EMAIL);
console.log('  ADMIN_PASSWORD :', process.env.ADMIN_PASSWORD);
console.log('  ADMIN_PHONE    :', process.env.ADMIN_PHONE);
console.log('  SECRET_PATH    :', process.env.ADMIN_SECRET_PATH);

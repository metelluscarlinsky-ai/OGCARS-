require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initDB, seedAdmin } = require('./models/db');
const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/cars');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_PATH = process.env.ADMIN_SECRET_PATH || '/panel-admin-x9k2m';

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.BASE_URL || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 300 }));
app.use('/api/auth/login', rateLimit({ windowMs: 60000, max: 10 }));
app.use('/api/auth/register', rateLimit({ windowMs: 60000, max: 10 }));
app.use('/api/auth/admin/login', rateLimit({ windowMs: 60000, max: 10 }));
app.use('/api/payment/', rateLimit({ windowMs: 60000, max: 10 }));

app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p === '/admin' || p === '/admin.html') return res.redirect('/');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.get(ADMIN_SECRET_PATH, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Pa jwenn' });
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERREUR]', err.message);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Erè sèvè.' : err.message });
});

(async () => {
  try {
    initDB();
    await seedAdmin();
    app.listen(PORT, () => {
      console.log('===========================================');
      console.log('  OGCARS ap kouri sou pò ' + PORT);
      console.log('  Sit:   http://localhost:' + PORT);
      console.log('  Admin: ' + ADMIN_SECRET_PATH);
      console.log('===========================================');
    });
  } catch (e) { console.error('Erè:', e); process.exit(1); }
})();

const jwt = require('jsonwebtoken');
const { getDB } = require('../models/db');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback';

function signToken(u) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
}
function extractToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function authenticate(req, res, next) {
  const t = extractToken(req);
  if (!t) return res.status(401).json({ error: 'Ou dwe konekte' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Sesyon envalid' }); }
}
function optionalAuth(req, res, next) {
  const t = extractToken(req);
  if (t) { try { req.user = jwt.verify(t, JWT_SECRET); } catch (e) {} }
  next();
}
function requireAdmin(req, res, next) {
  const t = extractToken(req);
  if (!t) return res.status(401).json({ error: 'Aksè refize' });
  try {
    const p = jwt.verify(t, JWT_SECRET);
    if (p.role !== 'admin') return res.status(403).json({ error: 'Aksè refize' });
    const u = getDB().prepare('SELECT id, email, role FROM users WHERE id = ?').get(p.id);
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Aksè refize' });
    req.user = u; next();
  } catch (e) { return res.status(401).json({ error: 'Sesyon envalid' }); }
}
module.exports = { signToken, authenticate, optionalAuth, requireAdmin };

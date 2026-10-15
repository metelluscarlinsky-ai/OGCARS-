const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { signToken, authenticate } = require('../middleware/auth');
const router = express.Router();

router.post('/register', [
  body('nom').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true, checkFalsy: true }).matches(/^509\d{8}$|^\d{8}$/),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
  const { nom, email, phone, password } = req.body;
  const db = getDB();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'Email deja itilize' });
  const hash = await bcrypt.hash(password, 12);
  const info = db.prepare('INSERT INTO users (nom, email, phone, password, role) VALUES (?, ?, ?, ?, ?)').run(nom, email, phone || null, hash, 'client');
  const user = { id: info.lastInsertRowid, email, role: 'client' };
  res.json({ token: signToken(user), user: { id: user.id, nom, email, phone: phone || null, role: 'client' } });
});

router.post('/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ error: 'Done envalid' });
  const { email, password } = req.body;
  const db = getDB();
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u) return res.status(401).json({ error: 'Email oswa modpas pa bon' });
  const ok = await bcrypt.compare(password, u.password);
  if (!ok) return res.status(401).json({ error: 'Email oswa modpas pa bon' });
  res.json({ token: signToken(u), user: { id: u.id, nom: u.nom, email: u.email, phone: u.phone, role: u.role } });
});

router.post('/admin/login', [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ error: 'Done envalid' });
  const { email, password } = req.body;
  const db = getDB();
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u || u.role !== 'admin') return res.status(401).json({ error: 'Aksè refize' });
  const ok = await bcrypt.compare(password, u.password);
  if (!ok) return res.status(401).json({ error: 'Aksè refize' });
  res.json({ token: signToken(u), user: { id: u.id, nom: u.nom, email: u.email, role: 'admin' } });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDB();
  const u = db.prepare('SELECT id, nom, email, phone, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'Pa jwenn' });
  res.json(u);
});

router.get('/me/orders', authenticate, (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT c.*, ca.mark, ca.modele, ca.ane, ca.foto FROM commandes c LEFT JOIN cars ca ON ca.id=c.car_id WHERE c.buyer_id=? ORDER BY c.created_at DESC').all(req.user.id));
});

module.exports = router;

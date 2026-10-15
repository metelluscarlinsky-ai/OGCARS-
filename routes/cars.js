const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (r, f, cb) => cb(null, UPLOAD_DIR),
    filename: (r, f, cb) => cb(null, 'car_' + Date.now() + '_' + Math.round(Math.random()*1e6) + path.extname(f.originalname).toLowerCase())
  }),
  fileFilter: (r, f, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (ok.includes(f.mimetype)) cb(null, true); else cb(new Error('Sèlman JPG/PNG/WEBP'));
  },
  limits: { fileSize: 5*1024*1024 }
});

router.get('/', (req, res) => {
  const db = getDB();
  const { mark, ane_min, ane_max, pri_max, q, statut } = req.query;
  let sql = 'SELECT * FROM cars WHERE 1=1';
  const p = [];
  if (statut && statut !== 'all') { sql += ' AND statut = ?'; p.push(statut); }
  else if (!statut) { sql += " AND statut='disponib'"; }
  if (mark) { sql += ' AND mark = ?'; p.push(mark); }
  if (ane_min) { sql += ' AND ane >= ?'; p.push(Number(ane_min)); }
  if (ane_max) { sql += ' AND ane <= ?'; p.push(Number(ane_max)); }
  if (pri_max) { sql += ' AND pri <= ?'; p.push(Number(pri_max)); }
  if (q) { sql += ' AND (mark LIKE ? OR modele LIKE ? OR deskripsyon LIKE ?)'; const l='%'+q+'%'; p.push(l,l,l); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  res.json(db.prepare(sql).all(...p));
});

router.get('/:id', (req, res) => {
  const c = getDB().prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Pa jwenn' });
  res.json(c);
});

router.post('/', requireAdmin, upload.single('foto'), [
  body('mark').trim().notEmpty(),
  body('modele').trim().notEmpty(),
  body('pri').isFloat({ min: 0 })
], (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
  const db = getDB();
  const { mark, modele, ane, pri, km, koule, transmisyon, gaz, deskripsyon, statut } = req.body;
  const foto = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare('INSERT INTO cars (mark,modele,ane,pri,km,koule,transmisyon,gaz,deskripsyon,foto,seller_id,statut) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    mark, modele, ane?Number(ane):null, Number(pri), km||null, koule||null, transmisyon||null, gaz||null, deskripsyon||null, foto, req.user.id, statut||'disponib');
  res.status(201).json(db.prepare('SELECT * FROM cars WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', requireAdmin, upload.single('foto'), (req, res) => {
  const db = getDB();
  if (!db.prepare('SELECT id FROM cars WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Pa jwenn' });
  const fields = ['mark','modele','ane','pri','km','koule','transmisyon','gaz','deskripsyon','statut'];
  const u = [], p = [];
  for (const f of fields) {
    if (req.body[f] !== undefined && req.body[f] !== '') {
      u.push(f+' = ?');
      p.push(f==='ane'||f==='pri' ? Number(req.body[f]) : req.body[f]);
    }
  }
  if (req.file) { u.push('foto = ?'); p.push('/uploads/'+req.file.filename); }
  if (!u.length) return res.status(400).json({ error: 'Anyen pou modifye' });
  p.push(req.params.id);
  db.prepare('UPDATE cars SET '+u.join(', ')+' WHERE id=?').run(...p);
  res.json(db.prepare('SELECT * FROM cars WHERE id=?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDB();
  if (!db.prepare('SELECT id FROM cars WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Pa jwenn' });
  db.prepare('DELETE FROM cars WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

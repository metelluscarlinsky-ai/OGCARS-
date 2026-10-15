const express = require('express');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../models/db');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

const MONCASH_MODE = process.env.MONCASH_MODE || 'sandbox';
const MONCASH_API = MONCASH_MODE === 'production'
  ? 'https://moncashbutton.digicelgroup.com/Api'
  : 'https://sandbox.moncashbutton.digicelgroup.com/Api';
const MONCASH_REDIRECT = MONCASH_MODE === 'production'
  ? 'https://moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect'
  : 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect';

async function getMoncashToken() {
  const { MONCASH_CLIENT_ID, MONCASH_CLIENT_SECRET } = process.env;
  if (!MONCASH_CLIENT_ID || !MONCASH_CLIENT_SECRET) throw new Error('Moncash pa konfigire');
  const auth = Buffer.from(MONCASH_CLIENT_ID + ':' + MONCASH_CLIENT_SECRET).toString('base64');
  const r = await axios.post(MONCASH_API + '/oauth/token', 'grant_type=client_credentials&scope=read,write', {
    headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 });
  return r.data.access_token;
}
async function createMoncashPayment({ amount, orderId }) {
  const t = await getMoncashToken();
  const r = await axios.post(MONCASH_API + '/v1/CreatePayment', { amount: Number(amount), orderId: String(orderId) },
    { headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' }, timeout: 15000 });
  const pt = r.data && r.data.payment_token && r.data.payment_token.token;
  if (!pt) throw new Error('payment_token pa jwenn');
  return pt;
}
async function verifyMoncashPayment(tid) {
  const t = await getMoncashToken();
  const r = await axios.post(MONCASH_API + '/v1/RetrieveTransactionPayment', { transactionId: String(tid) },
    { headers: { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' }, timeout: 15000 });
  return r.data;
}
const NATCASH_BASE = process.env.NATCASH_BASE || '';
async function createNatcashPayment({ amount, phone, orderId }) {
  if (!NATCASH_BASE || !process.env.NATCASH_MERCHANT_ID || !process.env.NATCASH_API_KEY) return { manual: true };
  const r = await axios.post(NATCASH_BASE + '/api/v1/payment', {
    merchantId: process.env.NATCASH_MERCHANT_ID, amount: Number(amount), phone, reference: String(orderId) },
    { headers: { 'Authorization': 'Bearer ' + process.env.NATCASH_API_KEY, 'Content-Type': 'application/json' }, timeout: 15000 });
  return r.data;
}
async function verifyNatcashPayment(ref) {
  if (!NATCASH_BASE) return { status: 'unknown', manual: true };
  const r = await axios.get(NATCASH_BASE + '/api/v1/payment/' + ref,
    { headers: { 'Authorization': 'Bearer ' + process.env.NATCASH_API_KEY }, timeout: 15000 });
  return r.data;
}

router.post('/init', optionalAuth, [
  body('car_id').isInt(),
  body('methode').isIn(['moncash','natcash']),
  body('phone').matches(/^509\d{8}$|^\d{8}$/)
], async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
  const { car_id, methode, phone } = req.body;
  const db = getDB();
  const car = db.prepare('SELECT * FROM cars WHERE id=?').get(car_id);
  if (!car) return res.status(404).json({ error: 'Pa jwenn' });
  if (car.statut !== 'disponib') return res.status(400).json({ error: 'Pa disponib' });
  const buyerId = req.user ? req.user.id : null;
  const orderId = 'OGC' + Date.now() + Math.floor(Math.random()*1000);
  const cp = phone.startsWith('509') ? phone : '509'+phone;
  const info = db.prepare("INSERT INTO commandes (car_id,buyer_id,montant,methode,transaction_id,phone_peman,statut) VALUES (?,?,?,?,?,?,'annatant')").run(car.id, buyerId, car.pri, methode, orderId, cp);
  const cmdId = info.lastInsertRowid;
  try {
    if (methode === 'moncash') {
      const pt = await createMoncashPayment({ amount: car.pri, orderId });
      return res.json({ commande_id: cmdId, order_id: orderId, methode: 'moncash', redirect: MONCASH_REDIRECT + '?token=' + pt });
    } else {
      const r = await createNatcashPayment({ amount: car.pri, phone: cp, orderId });
      if (r.manual) return res.json({ commande_id: cmdId, order_id: orderId, methode: 'natcash', manual: true,
        instructions: { phone: process.env.NATCASH_PHONE || '32924776', montant: car.pri, reference: orderId } });
      return res.json({ commande_id: cmdId, order_id: orderId, methode: 'natcash', data: r });
    }
  } catch (e) {
    db.prepare("UPDATE commandes SET statut='echek' WHERE id=?").run(cmdId);
    return res.status(500).json({ error: 'Erè peman: ' + e.message });
  }
});

router.post('/verify', [body('commande_id').isInt()], async (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
  const db = getDB();
  const c = db.prepare('SELECT * FROM commandes WHERE id=?').get(req.body.commande_id);
  if (!c) return res.status(404).json({ error: 'Pa jwenn' });
  if (c.statut === 'konfime') return res.json({ paid: true, already: true });
  try {
    if (c.methode === 'moncash') {
      const r = await verifyMoncashPayment(c.transaction_id);
      const paid = !!(r && r.payment && (r.payment.message === 'successful' || r.payment.message === 'success'));
      if (paid) {
        db.prepare("UPDATE commandes SET statut='konfime' WHERE id=?").run(c.id);
        db.prepare("UPDATE cars SET statut='vandi' WHERE id=?").run(c.car_id);
      }
      return res.json({ paid, result: r });
    } else {
      if (!NATCASH_BASE) return res.json({ paid: false, manual: true });
      const r = await verifyNatcashPayment(c.transaction_id);
      const paid = !!(r && r.status === 'success');
      if (paid) {
        db.prepare("UPDATE commandes SET statut='konfime' WHERE id=?").run(c.id);
        db.prepare("UPDATE cars SET statut='vandi' WHERE id=?").run(c.car_id);
      }
      return res.json({ paid, result: r });
    }
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (r, f, cb) => cb(null, UPLOAD_DIR),
    filename: (r, f, cb) => cb(null, 'proof_' + Date.now() + path.extname(f.originalname).toLowerCase())
  }),
  limits: { fileSize: 5*1024*1024 },
  fileFilter: (r, f, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (ok.includes(f.mimetype)) cb(null, true); else cb(new Error('Sèlman imaj'));
  }
});

router.post('/proof', proofUpload.single('preuve'), [body('commande_id').isInt()], (req, res) => {
  const err = validationResult(req);
  if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
  if (!req.file) return res.status(400).json({ error: 'Pa gen fichye' });
  const db = getDB();
  const c = db.prepare('SELECT id FROM commandes WHERE id=?').get(req.body.commande_id);
  if (!c) return res.status(404).json({ error: 'Pa jwenn' });
  const chemin = '/uploads/' + req.file.filename;
  db.prepare('UPDATE commandes SET preuve=? WHERE id=?').run(chemin, c.id);
  res.json({ ok: true, preuve: chemin });
});

router.get('/order/:id', (req, res) => {
  const db = getDB();
  const c = db.prepare('SELECT c.*, ca.mark, ca.modele, ca.ane, ca.foto FROM commandes c LEFT JOIN cars ca ON ca.id=c.car_id WHERE c.id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Pa jwenn' });
  res.json(c);
});

module.exports = router;

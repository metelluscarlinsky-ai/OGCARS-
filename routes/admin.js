const express = require('express');
const { getDB } = require('../models/db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();
router.use(requireAdmin);

router.get('/stats', (req, res) => {
  const db = getDB();
  res.json({
    totalCars: db.prepare('SELECT COUNT(*) AS n FROM cars').get().n,
    availableCars: db.prepare("SELECT COUNT(*) AS n FROM cars WHERE statut='disponib'").get().n,
    soldCars: db.prepare("SELECT COUNT(*) AS n FROM cars WHERE statut='vandi'").get().n,
    totalOrders: db.prepare('SELECT COUNT(*) AS n FROM commandes').get().n,
    pendingOrders: db.prepare("SELECT COUNT(*) AS n FROM commandes WHERE statut='annatant'").get().n,
    confirmedOrders: db.prepare("SELECT COUNT(*) AS n FROM commandes WHERE statut='konfime'").get().n,
    revenue: db.prepare("SELECT COALESCE(SUM(montant),0) AS s FROM commandes WHERE statut='konfime'").get().s,
    users: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='client'").get().n
  });
});
router.get('/cars', (req, res) => res.json(getDB().prepare('SELECT * FROM cars ORDER BY created_at DESC').all()));
router.get('/orders', (req, res) => res.json(getDB().prepare('SELECT c.*, ca.mark, ca.modele, ca.ane, ca.foto, u.nom AS buyer_nom, u.email AS buyer_email FROM commandes c LEFT JOIN cars ca ON ca.id=c.car_id LEFT JOIN users u ON u.id=c.buyer_id ORDER BY c.created_at DESC').all()));
router.post('/orders/:id/confirm', (req, res) => {
  const db = getDB();
  const c = db.prepare('SELECT * FROM commandes WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Pa jwenn' });
  db.prepare("UPDATE commandes SET statut='konfime' WHERE id=?").run(c.id);
  db.prepare("UPDATE cars SET statut='vandi' WHERE id=?").run(c.car_id);
  res.json({ ok: true });
});
router.post('/orders/:id/fail', (req, res) => {
  const db = getDB();
  const c = db.prepare('SELECT * FROM commandes WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Pa jwenn' });
  db.prepare("UPDATE commandes SET statut='echek' WHERE id=?").run(c.id);
  res.json({ ok: true });
});
router.get('/users', (req, res) => res.json(getDB().prepare('SELECT id, nom, email, phone, role, created_at FROM users ORDER BY created_at DESC').all()));
module.exports = router;

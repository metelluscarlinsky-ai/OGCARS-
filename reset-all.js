require('dotenv').config();
const { initDB, seedAdmin, getDB } = require('./models/db');

(async () => {
  try {
    console.log('[1/3] Inisyalize DB a...');
    initDB();
    
    console.log('[2/3] Kreye kont admin...');
    await seedAdmin();
    
    console.log('[3/3] Ajoute machin default yo...');
    const db = getDB();
    
    const cars = [
      { mark:'Toyota', modele:'Corolla 2020', ane:2020, pri:1450000, km:'45,000 km', koule:'Blan', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Toyota Corolla an bon kondisyon. Antretyen regilye, papye an règ. Enpòte dirèk.', foto:'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800&q=80' },
      { mark:'Honda', modele:'CR-V 2019', ane:2019, pri:1750000, km:'52,000 km', koule:'Nwa', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Honda CR-V SUV. Klimatizasyon pafè, tout fonksyon mache. Bon pou fanmi.', foto:'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800&q=80' },
      { mark:'Toyota', modele:'Hilux 2021', ane:2021, pri:2450000, km:'32,000 km', koule:'Ajàn', transmisyon:'otomatik', gaz:'dizèl', deskripsyon:'Toyota Hilux pikòp 4x4. Bon pou travay ak wout difisil. Mote dizèl solid.', foto:'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80' },
      { mark:'Nissan', modele:'Rogue 2019', ane:2019, pri:1580000, km:'48,000 km', koule:'Wouj', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Nissan Rogue an pafè kondisyon. Ekonomik sou gaz, ideyal pou vil.', foto:'https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800&q=80' },
      { mark:'Hyundai', modele:'Tucson 2020', ane:2020, pri:1680000, km:'41,000 km', koule:'Ble', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Hyundai Tucson modèn ak anpil opsyon. Garanti manifakti toujou valid.', foto:'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800&q=80' },
      { mark:'BMW', modele:'X5 2018', ane:2018, pri:3200000, km:'60,000 km', koule:'Nwa', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'BMW X5 liksye. Enteryè an kwi, sistèm son premium, kamera 360 degre.', foto:'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80' },
      { mark:'Ford', modele:'Ranger 2020', ane:2020, pri:1980000, km:'38,000 km', koule:'Ajàn', transmisyon:'otomatik', gaz:'dizèl', deskripsyon:'Ford Ranger pikòp solid. 4x4, bon pou travay ak ekspedisyon.', foto:'https://images.unsplash.com/photo-1605893477799-b99e3b8b93a5?w=800&q=80' },
      { mark:'Kia', modele:'Sportage 2021', ane:2021, pri:1820000, km:'25,000 km', koule:'Vèt', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Kia Sportage tou nèf. Garanti konplè, teknoloji dènye jenerasyon.', foto:'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?w=800&q=80' },
      { mark:'Mitsubishi', modele:'Outlander 2019', ane:2019, pri:1620000, km:'47,000 km', koule:'Blan', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Mitsubishi Outlander SUV 7 plas. Ideyal pou gwo fanmi.', foto:'https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=800&q=80' },
      { mark:'Mazda', modele:'CX-5 2020', ane:2020, pri:1720000, km:'35,000 km', koule:'Wouj', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Mazda CX-5 style espò. Bon balans ant konfò ak pèfòmans.', foto:'https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?w=800&q=80' },
      { mark:'Toyota', modele:'RAV4 2021', ane:2021, pri:2100000, km:'28,000 km', koule:'Ajàn', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Toyota RAV4 SUV popilè. Sekirize, ekonomik, bon valè revente.', foto:'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=800&q=80' },
      { mark:'Honda', modele:'Civic 2020', ane:2020, pri:1520000, km:'33,000 km', koule:'Ble', transmisyon:'otomatik', gaz:'gasoline', deskripsyon:'Honda Civic sedans espò. Ekonomik, rapid, bon pou jèn.', foto:'https://images.unsplash.com/photo-1590510429993-e5a4d0e17c4c?w=800&q=80' }
    ];
    
    const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
    const sellerId = admin ? admin.id : null;
    let ajoute = 0;
    
    for (const c of cars) {
      const ex = db.prepare('SELECT id FROM cars WHERE mark=? AND modele=?').get(c.mark, c.modele);
      if (ex) { console.log('  Deja egziste: ' + c.mark + ' ' + c.modele); continue; }
      db.prepare('INSERT INTO cars (mark,modele,ane,pri,km,koule,transmisyon,gaz,deskripsyon,foto,seller_id,statut) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(c.mark, c.modele, c.ane, c.pri, c.km, c.koule, c.transmisyon, c.gaz, c.deskripsyon, c.foto, sellerId, 'disponib');
      ajoute++;
    }
    
    console.log('');
    console.log('=== REZILTA ===');
    console.log('[OK] ' + ajoute + ' machin ajoute');
    console.log('[OK] Admin: ' + process.env.ADMIN_EMAIL);
    console.log('[OK] Modpas: ' + process.env.ADMIN_PASSWORD);
    console.log('[OK] Admin URL: http://localhost:3000' + process.env.ADMIN_SECRET_PATH);
    console.log('');
    console.log('Kounye a kouri: npm start');
    process.exit(0);
  } catch (e) {
    console.error('[ERÈ]', e.message);
    process.exit(1);
  }
})();

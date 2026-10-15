const params=new URLSearchParams(location.search);
const carId=params.get('car_id');
const content=document.getElementById('pemanContent');
let selectedMethod='moncash';let currentCar=null;
async function init(){
  if(!carId){content.innerHTML='<div class="empty">Machin pa jwenn.</div>';return}
  try{const r=await fetch('/api/cars/'+carId);if(!r.ok)throw new Error();
  currentCar=await r.json();
  if(currentCar.statut!=='disponib'){content.innerHTML='<div class="empty">Machin sa pa disponib.</div>';return}
  render()}catch(e){content.innerHTML='<div class="empty">Erè chajman.</div>'}}
function render(){
  const user=JSON.parse(localStorage.getItem('user')||'null');
  const imgSrc=currentCar.foto||'';
  content.innerHTML='<div class="car-summary">'+(imgSrc?'<img src="'+imgSrc+'" alt="">':'')+
    '<div><div style="font-weight:700;">'+escapeHTML(currentCar.mark)+' '+escapeHTML(currentCar.modele)+'</div>'+
    '<div style="font-size:13px;color:var(--text-soft);">'+(currentCar.ane||'')+'</div>'+
    '<div style="font-weight:800;color:var(--accent);margin-top:4px;">'+formatPri(currentCar.pri)+'</div></div></div>'+
    '<div style="margin-bottom:10px;font-weight:600;font-size:14px;">Chwazi metòd peman:</div>'+
    '<div class="method-options"><div class="method-opt active" data-m="moncash">Moncash<small>Digicel</small></div>'+
    '<div class="method-opt" data-m="natcash">Natcash<small>Natcom</small></div></div>'+
    '<form id="payForm"><div class="form-group"><label>Nimewo telefòn ou (509XXXXXXXX)</label>'+
    '<input type="tel" name="phone" placeholder="509XXXXXXXX" value="'+(user&&user.phone?escapeHTML(user.phone):'')+'" required></div>'+
    '<button type="submit" class="btn btn-primary btn-block" id="payBtn">Peye '+formatPri(currentCar.pri)+'</button></form>'+
    '<div id="pemanMsg"></div>';
  document.querySelectorAll('.method-opt').forEach(el=>{el.addEventListener('click',()=>{
    document.querySelectorAll('.method-opt').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');selectedMethod=el.dataset.m})});
  document.getElementById('payForm').addEventListener('submit',submitPayment)}
async function submitPayment(e){
  e.preventDefault();const btn=document.getElementById('payBtn');
  const msg=document.getElementById('pemanMsg');
  const phone=e.target.phone.value.trim();
  if(!/^509\d{8}$|^\d{8}$/.test(phone)){msg.innerHTML='<div class="notice error">Nimewo envalid. Fòma: 509XXXXXXXX</div>';return}
  btn.disabled=true;btn.textContent='Ap trete...';msg.innerHTML='';
  const token=localStorage.getItem('token');
  try{const r=await fetch('/api/payment/init',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},
    body:JSON.stringify({car_id:Number(carId),methode:selectedMethod,phone})});
    const j=await r.json();if(!r.ok)throw new Error(j.error||'Erè peman');
    if(j.redirect){window.location.href=j.redirect;return}
    if(j.manual){showManualInstructions(j);return}
    msg.innerHTML='<div class="notice">Peman inisye.</div>';setTimeout(()=>verifyPayment(j.commande_id),3000);
  }catch(err){msg.innerHTML='<div class="notice error">'+escapeHTML(err.message)+'</div>';btn.disabled=false;btn.textContent='Peye '+formatPri(currentCar.pri)}}
function showManualInstructions(j){
  const ins=j.instructions;
  content.innerHTML='<h3 style="margin-bottom:12px;">Enstriksyon Peman Natcash</h3>'+
    '<div class="notice">1. Voye <strong>'+formatPri(ins.montant)+'</strong> nan nimewo Natcash:<br>'+
    '<strong style="font-size:20px;">'+escapeHTML(ins.phone)+'</strong><br><br>'+
    '2. Referans: <strong>'+escapeHTML(ins.reference)+'</strong><br><br>'+
    '3. Screenshot konfimasyon epi telechaje l.</div>'+
    '<form id="proofForm" enctype="multipart/form-data"><input type="hidden" name="commande_id" value="'+j.commande_id+'">'+
    '<div class="form-group"><label>Screenshot konfimasyon</label><input type="file" name="preuve" accept="image/*" required></div>'+
    '<button type="submit" class="btn btn-primary btn-block">Voye Prèv</button></form><div id="proofMsg"></div>';
  document.getElementById('proofForm').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.target);const btn=e.target.querySelector('button');btn.disabled=true;
    try{const r=await fetch('/api/payment/proof',{method:'POST',body:fd});
    const rr=await r.json();if(!r.ok)throw new Error(rr.error||'Erè');
    document.getElementById('proofMsg').innerHTML='<div class="notice ok">Prèv resevwa.</div>';
    }catch(err){document.getElementById('proofMsg').innerHTML='<div class="notice error">'+escapeHTML(err.message)+'</div>';btn.disabled=false}})}
async function verifyPayment(id){
  try{const r=await fetch('/api/payment/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commande_id:id})});
  const j=await r.json();
  if(j.paid){content.innerHTML='<div style="text-align:center;padding:30px 10px;">'+
    '<div style="font-size:60px;color:var(--accent);font-weight:900;">OK</div>'+
    '<h2 style="margin:10px 0;">Peman Konfime</h2>'+
    '<p style="color:var(--text-soft);margin-bottom:20px;">Mèsi. Nou pral kontakte w.</p>'+
    '<a class="btn btn-primary" href="https://wa.me/50932687915" target="_blank">Kontakte nou</a></div>';
  }else{content.innerHTML='<div class="notice">Peman an poko konfime.</div>'}}catch(e){console.error(e)}}
const cmdIdParam=params.get('commande_id');
if(cmdIdParam)verifyPayment(cmdIdParam);else init();

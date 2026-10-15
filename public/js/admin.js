const API='/api';
let authToken=localStorage.getItem('admin_token');
let allCars=[];
function escapeHTML(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function formatPri(p){return new Intl.NumberFormat('fr-HT').format(Number(p)||0)+' HTG'}
function showMsg(id,m,t='error'){const el=document.getElementById(id);if(!el)return;
  el.innerHTML='<div class="alert alert-'+t+'">'+escapeHTML(m)+'</div>';setTimeout(()=>{el.innerHTML=''},5000)}
async function api(path,opt={}){
  const o={...opt,headers:{...(opt.headers||{})}};
  if(authToken)o.headers['Authorization']='Bearer '+authToken;
  if(o.body&&!(o.body instanceof FormData))o.headers['Content-Type']='application/json';
  const r=await fetch(API+path,o);const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||(j.errors&&j.errors[0]&&j.errors[0].msg)||'Erè');
  return j}
const loginView=document.getElementById('loginView');
const adminView=document.getElementById('adminView');
function showLogin(){loginView.style.display='flex';adminView.style.display='none'}
function showAdmin(){loginView.style.display='none';adminView.style.display='grid';
  const u=JSON.parse(localStorage.getItem('admin_user')||'{}');
  document.getElementById('adminInfo').textContent=u.email||'admin';loadDashboard()}
async function checkAdminAuth(){if(!authToken){showLogin();return}
  try{await api('/admin/stats');showAdmin()}catch(e){
    localStorage.removeItem('admin_token');localStorage.removeItem('admin_user');authToken=null;showLogin()}}
document.getElementById('adminLoginForm').addEventListener('submit',async e=>{e.preventDefault();
  const b=Object.fromEntries(new FormData(e.target).entries());
  try{const r=await fetch(API+'/auth/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Erè');
  localStorage.setItem('admin_token',j.token);localStorage.setItem('admin_user',JSON.stringify(j.user));
  authToken=j.token;showAdmin()}catch(err){showMsg('loginMsg',err.message)}});
document.getElementById('adminLogout').addEventListener('click',()=>{
  localStorage.removeItem('admin_token');localStorage.removeItem('admin_user');authToken=null;location.reload()});
document.querySelectorAll('.sidebar-nav a').forEach(a=>{a.addEventListener('click',()=>{
  const v=a.dataset.view;
  document.querySelectorAll('.sidebar-nav a').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  a.classList.add('active');
  const el=document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1));if(el)el.classList.add('active');
  document.getElementById('viewTitle').textContent=a.textContent;
  if(v==='dashboard')loadDashboard();if(v==='cars')loadCars();if(v==='orders')loadOrders();if(v==='users')loadUsers()})});
async function loadDashboard(){
  try{const s=await api('/admin/stats');
    document.getElementById('statsGrid').innerHTML=
      '<div class="stat-card"><div class="stat-label">Total Machin</div><div class="stat-value">'+s.totalCars+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Disponib</div><div class="stat-value accent">'+s.availableCars+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Vandi</div><div class="stat-value">'+s.soldCars+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Kòmand Total</div><div class="stat-value">'+s.totalOrders+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Annatant</div><div class="stat-value accent">'+s.pendingOrders+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Konfime</div><div class="stat-value">'+s.confirmedOrders+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Revni</div><div class="stat-value accent">'+formatPri(s.revenue)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Kliyan</div><div class="stat-value">'+s.users+'</div></div>';
  }catch(e){document.getElementById('statsGrid').innerHTML='<div class="empty">'+escapeHTML(e.message)+'</div>'}}
async function loadCars(){try{allCars=await api('/admin/cars');renderCars(allCars)}
  catch(e){document.getElementById('carsList').innerHTML='<div class="empty">'+escapeHTML(e.message)+'</div>'}}
function renderCars(cars){
  const el=document.getElementById('carsList');
  if(!cars.length){el.innerHTML='<div class="empty">Pa gen machin.</div>';return}
  el.innerHTML='<div style="overflow-x:auto;"><table class="table"><thead><tr><th>Foto</th><th>Mak/Modèl</th><th>Ane</th><th>Pri</th><th>Statut</th><th>Aksyon</th></tr></thead><tbody>'+
    cars.map(c=>{const b=c.statut==='disponib'?'dispo':c.statut==='vandi'?'vandi':'rez';
      return '<tr><td>'+(c.foto?'<img src="'+c.foto+'" class="car-thumb">':'-')+'</td>'+
      '<td><strong>'+escapeHTML(c.mark)+'</strong> '+escapeHTML(c.modele)+'</td>'+
      '<td>'+(c.ane||'-')+'</td><td><strong style="color:var(--accent);">'+formatPri(c.pri)+'</strong></td>'+
      '<td><span class="badge badge-'+b+'">'+escapeHTML(c.statut)+'</span></td>'+
      '<td><button class="btn btn-sm btn-secondary" data-edit="'+c.id+'">Modifye</button> '+
      '<button class="btn btn-sm btn-danger" data-del="'+c.id+'">Efase</button></td></tr>'}).join('')+'</tbody></table></div>';
  el.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editCar(Number(b.dataset.edit))));
  el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>deleteCar(Number(b.dataset.del))))}
document.getElementById('addCarBtn').addEventListener('click',()=>openCarModal());
document.getElementById('carSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();
  renderCars(allCars.filter(c=>(c.mark+' '+c.modele).toLowerCase().includes(q)))});
function openCarModal(car=null){
  const isEdit=!!car;
  const html='<div class="modal-overlay" id="carModal"><div class="modal"><h3>'+(isEdit?'Modifye':'Ajoute')+' Machin</h3>'+
    '<form id="carForm"><div class="grid-2">'+
    '<div class="form-group"><label>Mak *</label><input name="mark" required value="'+(car?escapeHTML(car.mark):'')+'"></div>'+
    '<div class="form-group"><label>Modèl *</label><input name="modele" required value="'+(car?escapeHTML(car.modele):'')+'"></div>'+
    '<div class="form-group"><label>Ane</label><input name="ane" type="number" value="'+(car?(car.ane||''):'')+'"></div>'+
    '<div class="form-group"><label>Pri (HTG) *</label><input name="pri" type="number" step="0.01" required value="'+(car?car.pri:'')+'"></div>'+
    '<div class="form-group"><label>Kilometraj</label><input name="km" value="'+(car?escapeHTML(car.km||''):'')+'"></div>'+
    '<div class="form-group"><label>Koulè</label><input name="koule" value="'+(car?escapeHTML(car.koule||''):'')+'"></div>'+
    '<div class="form-group"><label>Transmisyon</label><select name="transmisyon"><option value="">-</option><option '+(car&&car.transmisyon==='manyèl'?'selected':'')+'>manyèl</option><option '+(car&&car.transmisyon==='otomatik'?'selected':'')+'>otomatik</option></select></div>'+
    '<div class="form-group"><label>Gaz</label><select name="gaz"><option value="">-</option><option '+(car&&car.gaz==='gasoline'?'selected':'')+'>gasoline</option><option '+(car&&car.gaz==='dizèl'?'selected':'')+'>dizèl</option></select></div>'+
    '</div><div class="form-group"><label>Statut</label><select name="statut">'+
    '<option '+(!car||car.statut==='disponib'?'selected':'')+'>disponib</option>'+
    '<option '+(car&&car.statut==='rezève'?'selected':'')+'>rezève</option>'+
    '<option '+(car&&car.statut==='vandi'?'selected':'')+'>vandi</option></select></div>'+
    '<div class="form-group"><label>Deskripsyon</label><textarea name="deskripsyon" rows="3">'+(car?escapeHTML(car.deskripsyon||''):'')+'</textarea></div>'+
    '<div class="form-group"><label>Foto '+(isEdit?'(kite vid pou kenbe)':'')+'</label><input type="file" name="foto" accept="image/*"></div>'+
    '<div id="carModalMsg"></div><div class="modal-actions">'+
    '<button type="submit" class="btn btn-primary">'+(isEdit?'Sove':'Ajoute')+'</button>'+
    '<button type="button" class="btn btn-secondary" id="carCancelBtn">Anile</button></div></form></div></div>';
  document.getElementById('modalRoot').innerHTML=html;
  document.getElementById('carCancelBtn').addEventListener('click',closeModal);
  document.getElementById('carForm').addEventListener('submit',e=>submitCar(e,car?car.id:null))}
async function submitCar(e,id){
  e.preventDefault();const fd=new FormData(e.target);
  try{const url=id?(API+'/cars/'+id):(API+'/cars');const m=id?'PUT':'POST';
    const r=await fetch(url,{method:m,headers:{'Authorization':'Bearer '+authToken},body:fd});
    const j=await r.json();if(!r.ok)throw new Error(j.error||(j.errors&&j.errors[0]&&j.errors[0].msg)||'Erè');
    closeModal();loadCars()}catch(err){showMsg('carModalMsg',err.message)}}
async function editCar(id){try{const r=await fetch(API+'/cars/'+id);openCarModal(await r.json())}catch(e){alert(e.message)}}
async function deleteCar(id){if(!confirm('Efase machin sa?'))return;
  try{await api('/cars/'+id,{method:'DELETE'});loadCars()}catch(e){alert(e.message)}}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
async function loadOrders(){
  try{const orders=await api('/admin/orders');
    const el=document.getElementById('ordersList');
    if(!orders.length){el.innerHTML='<div class="empty">Pa gen kòmand.</div>';return}
    el.innerHTML='<div style="overflow-x:auto;"><table class="table"><thead><tr><th>ID</th><th>Machin</th><th>Kliyan</th><th>Montan</th><th>Metòd</th><th>Statut</th><th>Aksyon</th></tr></thead><tbody>'+
      orders.map(o=>{const a=[];
        if(o.preuve)a.push('<a href="'+o.preuve+'" target="_blank" class="btn btn-sm btn-secondary">Prèv</a>');
        if(o.statut==='annatant'){a.push('<button class="btn btn-sm btn-success" data-confirm="'+o.id+'">Konfime</button>');
          a.push('<button class="btn btn-sm btn-danger" data-fail="'+o.id+'">Echek</button>')}
        return '<tr><td>#'+o.id+'</td><td>'+escapeHTML(o.mark||'')+' '+escapeHTML(o.modele||'')+'</td>'+
        '<td>'+escapeHTML(o.buyer_nom||'-')+'<br><small style="color:var(--text-soft);">'+escapeHTML(o.phone_peman||'')+'</small></td>'+
        '<td><strong>'+formatPri(o.montant)+'</strong></td><td>'+escapeHTML(o.methode)+'</td>'+
        '<td><span class="badge badge-'+o.statut+'">'+escapeHTML(o.statut)+'</span></td>'+
        '<td>'+(a.join(' ')||'-')+'</td></tr>'}).join('')+'</tbody></table></div>';
    el.querySelectorAll('[data-confirm]').forEach(b=>b.addEventListener('click',()=>confirmOrder(Number(b.dataset.confirm))));
    el.querySelectorAll('[data-fail]').forEach(b=>b.addEventListener('click',()=>failOrder(Number(b.dataset.fail))));
  }catch(e){document.getElementById('ordersList').innerHTML='<div class="empty">'+escapeHTML(e.message)+'</div>'}}
async function confirmOrder(id){if(!confirm('Konfime peman sa?'))return;
  try{await api('/admin/orders/'+id+'/confirm',{method:'POST'});loadOrders()}catch(e){alert(e.message)}}
async function failOrder(id){if(!confirm('Make kòmand sa kòm echek?'))return;
  try{await api('/admin/orders/'+id+'/fail',{method:'POST'});loadOrders()}catch(e){alert(e.message)}}
async function loadUsers(){
  try{const users=await api('/admin/users');
    const el=document.getElementById('usersList');
    if(!users.length){el.innerHTML='<div class="empty">Pa gen itilizatè.</div>';return}
    el.innerHTML='<div style="overflow-x:auto;"><table class="table"><thead><tr><th>ID</th><th>Non</th><th>Email</th><th>Telefòn</th><th>Wòl</th><th>Dat</th></tr></thead><tbody>'+
      users.map(u=>'<tr><td>#'+u.id+'</td><td><strong>'+escapeHTML(u.nom)+'</strong></td>'+
      '<td>'+escapeHTML(u.email)+'</td><td>'+escapeHTML(u.phone||'-')+'</td>'+
      '<td><span class="badge '+(u.role==='admin'?'badge-rez':'badge-dispo')+'">'+escapeHTML(u.role)+'</span></td>'+
      '<td>'+new Date(u.created_at).toLocaleDateString('fr-FR')+'</td></tr>').join('')+'</tbody></table></div>';
  }catch(e){document.getElementById('usersList').innerHTML='<div class="empty">'+escapeHTML(e.message)+'</div>'}}
checkAdminAuth();

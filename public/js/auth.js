const authSection=document.getElementById('authSection');
const ordersSection=document.getElementById('ordersSection');
const alertBox=document.getElementById('alertBox');
function showAlert(m,t='error'){if(!alertBox)return;alertBox.innerHTML='<div class="alert alert-'+t+'">'+escapeHTML(m)+'</div>';setTimeout(()=>{alertBox.innerHTML=''},5000)}
document.querySelectorAll('.tab').forEach(t=>{t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');const el=document.getElementById('tab-'+t.dataset.tab);if(el)el.classList.add('active')})});
const rf=document.getElementById('registerForm');
if(rf){rf.addEventListener('submit',async e=>{e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target).entries());
  try{const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||(j.errors&&j.errors[0]&&j.errors[0].msg)||'Erè');
  localStorage.setItem('token',j.token);localStorage.setItem('user',JSON.stringify(j.user));
  showAlert('Byenveni '+j.user.nom+'!','ok');setTimeout(()=>location.reload(),800)}catch(err){showAlert(err.message)}})}
const lf=document.getElementById('loginForm');
if(lf){lf.addEventListener('submit',async e=>{e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target).entries());
  try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Erè');
  localStorage.setItem('token',j.token);localStorage.setItem('user',JSON.stringify(j.user));location.reload()}catch(err){showAlert(err.message)}})}
const lb=document.getElementById('logoutBtn');
if(lb){lb.addEventListener('click',()=>{localStorage.removeItem('token');localStorage.removeItem('user');location.reload()})}
async function checkAuth(){
  const t=localStorage.getItem('token');if(!t||!authSection)return;
  try{const r=await fetch('/api/auth/me',{headers:{'Authorization':'Bearer '+t}});
  if(!r.ok)throw new Error();const u=await r.json();
  authSection.style.display='none';ordersSection.style.display='block';
  document.getElementById('userInfo').textContent=u.nom+' · '+u.email;
  const or=await fetch('/api/auth/me/orders',{headers:{'Authorization':'Bearer '+t}});
  const orders=await or.json();const list=document.getElementById('ordersList');
  if(!Array.isArray(orders)||!orders.length){list.innerHTML='<div class="empty">Ou poko gen kòmand.</div>';return}
  list.innerHTML=orders.map(o=>{
    const b=o.statut==='konfime'?'dispo':o.statut==='echek'?'vandi':'rez';
    return '<div class="order-row"><div><div style="font-weight:700;">'+escapeHTML(o.mark||'Machin')+' '+escapeHTML(o.modele||'')+'</div>'+
    '<div style="font-size:13px;color:var(--text-soft);">'+new Date(o.created_at).toLocaleDateString('fr-FR')+' · '+escapeHTML(o.methode)+'</div>'+
    '<div style="font-size:12px;color:var(--text-soft);">ID: '+escapeHTML(o.transaction_id)+'</div></div>'+
    '<div style="text-align:right;"><div style="font-weight:800;color:var(--accent);">'+formatPri(o.montant)+'</div>'+
    '<span class="badge badge-'+b+'">'+escapeHTML(o.statut)+'</span></div></div>'}).join('');
  }catch(e){localStorage.removeItem('token');localStorage.removeItem('user')}}
checkAuth();

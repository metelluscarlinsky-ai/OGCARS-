const API = '/api';
(function(){const s=localStorage.getItem('theme');if(s==='dark')document.documentElement.setAttribute('data-theme','dark');
const b=document.getElementById('themeToggle');if(!b)return;b.innerHTML=s==='dark'?'&#9789;':'&#9788;';
b.addEventListener('click',()=>{const d=document.documentElement.getAttribute('data-theme')==='dark';
if(d){document.documentElement.removeAttribute('data-theme');localStorage.setItem('theme','light');b.innerHTML='&#9788;'}
else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('theme','dark');b.innerHTML='&#9789;'}})})();
const yearEl=document.getElementById('year');if(yearEl)yearEl.textContent=new Date().getFullYear();
function formatPri(p){return new Intl.NumberFormat('fr-HT').format(Number(p)||0)+' HTG'}
function escapeHTML(s){if(s==null)return '';return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function imagePlaceholder(){return 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="100%" height="100%" fill="#eeeeee"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#999" text-anchor="middle" dy=".3em">OGCARS</text></svg>')}
async function loadCars(params={}){
  const grid=document.getElementById('carsGrid');if(!grid)return;
  grid.innerHTML='<div class="loading">Ap chaje...</div>';
  const qs=new URLSearchParams(params).toString();
  try{
    const r=await fetch(API+'/cars'+(qs?'?'+qs:''));
    const cars=await r.json();
    if(!Array.isArray(cars)||!cars.length){grid.innerHTML='<div class="empty">Pa gen machin disponib pou kounye a.</div>';return}
    grid.innerHTML=cars.map(car=>{
      const img=car.foto||imagePlaceholder();
      return '<div class="car-card" onclick="location.href=\'/machin.html?id='+car.id+'\'">'+
      '<img class="car-image" src="'+img+'" alt="" onerror="this.onerror=null;this.src=\''+imagePlaceholder()+'\'">'+
      '<div class="car-body"><div class="car-title">'+escapeHTML(car.mark)+' '+escapeHTML(car.modele)+'</div>'+
      '<div class="car-meta"><span>'+(car.ane||'-')+'</span><span>'+escapeHTML(car.transmisyon||'-')+'</span><span>'+escapeHTML(car.gaz||'-')+'</span></div>'+
      '<div class="car-price">'+formatPri(car.pri)+'</div></div></div>';
    }).join('');
  }catch(e){grid.innerHTML='<div class="empty">Erè chajman.</div>'}
}
const searchForm=document.getElementById('searchForm');
if(searchForm){searchForm.addEventListener('submit',e=>{e.preventDefault();
  const q=document.getElementById('searchQ').value.trim();
  const mark=document.getElementById('searchMark').value;
  const params={};if(q)params.q=q;if(mark)params.mark=mark;
  loadCars(params);const t=document.getElementById('machin');if(t)t.scrollIntoView({behavior:'smooth'})})}
if(document.getElementById('carsGrid'))loadCars();

import {S,init,onChange,unitBySn,save} from './store.js';
import {ACT,IN,ic,logo,setRefresh,go,toast,closeModal} from './ui.js';
import {esc} from './util.js';
import {initSync,onStatus,isOn,syncNow,getStatus,pendingCount} from './sync.js';
import * as dashboard from './dashboard.js';import * as products from './products.js';import * as inspect from './inspect.js';import * as trace from './trace.js';import * as reports from './reports.js';import * as settings from './settings.js';
const R={dashboard,products,inspect,trace,reports,settings};
const NAV=[['dashboard','dash','ภาพรวม'],['products','box','สินค้า & Serial'],['inspect','scan','ตรวจ QC'],['trace','trace','ย้อนรอย'],['reports','chart','รายงาน']];
let cur='dashboard',deferred=null;
function theme(){const t=S.settings.theme||'auto';document.documentElement.dataset.theme=t==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=document.documentElement.dataset.theme==='dark'?'#101114':'#f6f4ef'}
function shell(){const app=document.getElementById('app');
  app.innerHTML=`<aside class="side"><a class="brand" href="#/dashboard">${logo}<div><b>CoreDash</b><small>Smart QC</small></div></a><nav class="nav" aria-label="เมนูหลัก">${NAV.map(([k,i,t])=>`<a href="#/${k}" data-nav="${k}">${ic(i)}<span>${t}</span></a>`).join('')}<a href="#/settings" data-nav="settings">${ic('gear')}<span>ตั้งค่า</span></a></nav><div class="sp"></div><div class="plant"><b>${esc(S.settings.company)}</b><small>${esc(S.settings.plant)}</small></div><button class="btn sm" id="inst" style="display:none;margin:8px">${ic('download')} ติดตั้งแอป</button></aside>
  <div class="main"><header class="top"><span class="crumb"><b id="crumb"></b></span><span class="sp"></span><form class="gs" id="gsf" role="search">${ic('search')}<input id="gs" placeholder="ค้นหา Serial / ล็อต…" autocomplete="off" aria-label="ค้นหา"></form><button class="ib" id="cld" aria-label="ซิงก์" title="ซิงก์ข้อมูล" style="position:relative">${ic('up')}<i id="cdot" style="position:absolute;right:7px;top:7px;width:9px;height:9px;border-radius:50%;background:var(--mut);border:2px solid var(--surface)"></i></button><button class="ib" id="thm" aria-label="สลับธีม">${ic('moon')}</button><a class="ib" href="#/settings" aria-label="ตั้งค่า">${ic('gear')}</a></header><main id="view" tabindex="-1"></main></div>
  <nav class="bnav" aria-label="เมนู">${NAV.map(([k,i,t],n)=>n===2?`<a class="mid" href="#/inspect" data-nav="inspect"><span class="fab">${ic('scan')}</span><span>ตรวจ</span></a>`:`<a href="#/${k}" data-nav="${k}">${ic(i)}<span>${t.split(' ')[0]}</span></a>`).join('')}</nav>`;
  document.getElementById('gsf').onsubmit=e=>{e.preventDefault();const v=document.getElementById('gs').value.trim();if(!v)return;document.getElementById('gs').value='';const u=unitBySn(v);go(u?'/inspect/'+encodeURIComponent(u.sn):'/trace/'+encodeURIComponent(v))};
  document.getElementById('thm').onclick=()=>{const d=document.documentElement.dataset.theme==='dark';S.settings.theme=d?'light':'dark';save();theme()};
  document.getElementById('cld').onclick=()=>{if(isOn())syncNow().then(()=>toast('ซิงก์แล้ว')).catch(e=>toast(e.message,5000));else go('/settings')};paintCloud();
  const ib=document.getElementById('inst');ib.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;ib.style.display='none'};if(deferred)ib.style.display='';}
function paintCloud(){const b=document.getElementById('cld'),d=document.getElementById('cdot');if(!b)return;const s=getStatus();b.style.display='';
  const c=!isOn()?['var(--line)','ยังไม่เชื่อมต่อ Google Sheet']:s.mode==='ok'?['var(--ok)','ซิงก์แล้ว']:s.mode==='busy'?['var(--info)','กำลังซิงก์…']:s.mode==='offline'?['var(--warn)','ออฟไลน์']:['var(--bad)',s.msg||'ซิงก์ไม่สำเร็จ'];
  d.style.background=c[0];b.title=c[1];b.setAttribute('aria-label',c[1]);b.classList.toggle('spin',s.mode==='busy')}
function route(){closeModal();const h=location.hash.replace(/^#\/?/,'')||'dashboard',parts=h.split('/'),k=R[parts[0]]?parts[0]:'dashboard';cur=k;const v=R[k],view=document.getElementById('view');
  try{view.innerHTML=v.render(parts.slice(1));if(v.mount)v.mount(parts.slice(1))}catch(e){console.error(e);view.innerHTML=`<div class="card empty"><div class="big">⚠️</div><h2>แสดงผลไม่สำเร็จ</h2><p class="mut">${esc(e.message)}</p><a class="btn pri" href="#/dashboard">กลับหน้าแรก</a></div>`}
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===k));document.getElementById('crumb').textContent=v.title;document.title=v.title+' · '+S.settings.company;
  if(!(k==='inspect'&&parts[1])&&!document.activeElement?.closest?.('input'))window.scrollTo(0,0)}
function rerender(){const view=document.getElementById('view'),y=window.scrollY;const parts=(location.hash.replace(/^#\/?/,'')||'dashboard').split('/'),v=R[parts[0]]||dashboard;try{view.innerHTML=v.render(parts.slice(1));if(v.mount)v.mount(parts.slice(1))}catch(e){console.error(e)}window.scrollTo(0,y)}
function start(){init();theme();shell();setRefresh(rerender);onStatus(paintCloud);initSync();window.addEventListener('cdq-synced',()=>{if(location.hash.startsWith('#/inspect/')||document.getElementById('modal')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;rerender()});
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',theme);
  window.addEventListener('cdq-theme',()=>{theme()});window.addEventListener('cdq-shell',()=>{shell();route()});
  window.addEventListener('cdq-error',e=>toast(e.detail,5000));window.addEventListener('hashchange',route);
  document.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(a&&ACT[a.dataset.act]){e.preventDefault();ACT[a.dataset.act](a,e);return}
    const g=e.target.closest('[data-go]');if(g&&!e.target.closest('a,button,input,select,label')){location.hash=g.dataset.go.replace(/^#/,'')}});
  const hin=e=>{const t=e.target.closest('[data-in]');if(t&&IN[t.dataset.in])IN[t.dataset.in](t,e)};
  document.addEventListener('input',e=>{const t=e.target;if(t.type==='file'||t.tagName==='SELECT')return;hin(e)});document.addEventListener('change',hin);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=document.getElementById('inst');if(b)b.style.display=''});
  if(!location.hash)location.hash='/dashboard';route();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{})}
let started=false;const boot=()=>{if(started)return;started=true;start()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

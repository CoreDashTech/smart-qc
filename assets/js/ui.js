/* shared UI helpers */
import {esc} from './util.js';
const P={dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
scan:'<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
trace:'<circle cx="6" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M6 8v3a4 4 0 004 4h5.5"/><path d="M18 8v8M15 11h3"/>',
chart:'<path d="M5 20V11M11 20V4M17 20v-6M3 20h18"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>',
print:'<path d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
download:'<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16"/>',check:'<path d="M5 12.5l4.5 4.5L19 7"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',
alert:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18.5v.1"/>',moon:'<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
chev:'<path d="M9 6l6 6-6 6"/>',back:'<path d="M15 6l-6 6 6 6"/>',tag:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1"/>',
file:'<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.1M14 21h3M21 17v4"/>',
factory:'<path d="M3 21V9l6 4V9l6 4V5h6v16H3z"/>',up:'<path d="M12 19V5m0 0l-5 5m5-5l5 5"/>',layers:'<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>'};
export const ic=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;
export const logo=`<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient></defs><path d="M20 2l15 8.5v19L20 38 5 29.5v-19L20 2z" fill="url(#lg)"/><path d="M26.5 14.5a8 8 0 100 11" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M19 20.2l2.6 2.6 4.8-5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0"/></svg>`;
export const ACT={},IN={};
export let refresh=()=>{};export const setRefresh=f=>{refresh=f};
export const go=h=>{if(location.hash==='#'+h)refresh();else location.hash=h};
let tt;export function toast(msg,ms=2600){let t=document.querySelector('.toast');if(t)t.remove();t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;document.body.appendChild(t);clearTimeout(tt);tt=setTimeout(()=>t.remove(),ms)}
export function modal(html,{wide=false}={}){closeModal();const m=document.createElement('div');m.className='mod';m.id='modal';m.innerHTML=`<div class="box" role="dialog" aria-modal="true" ${wide?'style="width:min(760px,100%)"':''}>${html}</div>`;m.addEventListener('mousedown',e=>{if(e.target===m)closeModal()});document.body.appendChild(m);const f=m.querySelector('[autofocus]');if(f)setTimeout(()=>f.focus(),40);return m}
export const closeModal=()=>{const m=document.getElementById('modal');if(m)m.remove()};
export function ask(title,msg,okLabel='ตกลง',cls='pri'){return new Promise(res=>{modal(`<h2>${esc(title)}</h2><p class="mut" style="margin:0">${esc(msg)}</p><div class="acts"><button class="btn" data-x="0">ยกเลิก</button><button class="btn ${cls}" data-x="1">${esc(okLabel)}</button></div>`);document.getElementById('modal').addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(b){closeModal();res(b.dataset.x==='1')}})})}
export const chipV=v=>v==='PASS'||v==='pass'?'<span class="chip ok">PASS</span>':v==='FAIL'||v==='fail'?'<span class="chip bad">FAIL</span>':v==='scrap'?'<span class="chip warn">SCRAP</span>':'<span class="chip">รอตรวจ</span>';

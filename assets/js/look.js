/* ปรับสีหน้าตา: สีพื้นหลัง / สีหลัก / เมนูด้านซ้าย — เก็บต่อเครื่อง (localStorage) */
import {lang} from './i18n.js';
const KEY='cdq.look';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{}}catch(e){return{}}};
let look=load();const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(look))}catch(e){}};
const hex=c=>{c=c.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(c.substr(i,2),16))};
const toHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const x=hex(a),y=hex(b);return toHex(x.map((v,i)=>v*(1-t)+y[i]*t))};
const lum=c=>{const [r,g,b]=hex(c).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
export const BG=[[null,'ค่าเริ่มต้น','Default','#f6f4ef'],['#ffffff','ขาว','White'],['#eef0f3','เทาอ่อน','Light grey'],['#e8f1fb','ฟ้าอ่อน','Light blue'],['#e6f4ec','เขียวมิ้นต์','Mint'],['#fbeaf0','ชมพูอ่อน','Light pink'],['#efe9fb','ม่วงอ่อน','Lavender'],['#fdf3d7','เหลืองอ่อน','Light yellow'],['#2b2f36','เทาเข้ม','Charcoal'],['#14213d','น้ำเงินเข้ม','Navy'],['#0c231c','เขียวเข้ม (โลโก้)','Logo green'],['#0b0c0f','ดำ','Black']];
export const AC=[[null,'ส้ม','Orange','#ff5a1f'],['#b8893b','ทอง (โลโก้)','Gold (logo)'],['#1f8a5b','เขียว','Green'],['#2563eb','ฟ้า','Blue'],['#7c3aed','ม่วง','Purple'],['#dc2626','แดง','Red'],['#db2777','ชมพู','Pink'],['#0d9488','เทอร์ควอยซ์','Teal']];
const VARS=['--bg','--surface','--surface2','--line','--ink','--mut','--accent','--accent2','--on-accent','--side','--side-ink','--side-on','--side-hover','--side-line'];
export function applyLook(){const r=document.documentElement,st=r.style;VARS.forEach(v=>st.removeProperty(v));
  const light=look.side==='light';
  if(look.bg){const dark=lum(look.bg)<.4;r.dataset.theme=dark?'dark':'light';
    st.setProperty('--bg',look.bg);
    st.setProperty('--surface',dark?mix(look.bg,'#ffffff',.07):mix(look.bg,'#ffffff',.72));
    st.setProperty('--surface2',dark?mix(look.bg,'#ffffff',.11):mix(look.bg,'#ffffff',.45));
    st.setProperty('--line',dark?mix(look.bg,'#ffffff',.17):mix(look.bg,'#000000',.1));
    const ink=dark?'#eceef2':'#17181c';st.setProperty('--ink',ink);st.setProperty('--mut',mix(ink,look.bg,dark?.38:.42));
    if(!light){st.setProperty('--side',dark?mix(look.bg,'#000000',.4):mix(look.bg,'#000000',.86))}}
  if(look.accent){st.setProperty('--accent',look.accent);st.setProperty('--accent2',mix(look.accent,'#ffffff',.25));st.setProperty('--on-accent',lum(look.accent)>.6?'#17181c':'#ffffff')}
  if(light){const dark=r.dataset.theme==='dark';st.setProperty('--side','var(--surface)');st.setProperty('--side-ink','var(--mut)');st.setProperty('--side-on','var(--ink)');st.setProperty('--side-hover',dark?'rgba(255,255,255,.07)':'rgba(0,0,0,.05)');st.setProperty('--side-line','var(--line)')}
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=getComputedStyle(r).getPropertyValue('--bg').trim()||m.content}
export const hasBg=()=>!!look.bg;
export function clearBg(){if(look.bg){look.bg=null;save()}}
const lg=(th,en)=>lang==='en'?en:th;
const sw=(list,cur,act)=>list.map(([c,th,en,pv])=>{const col=c||pv;return`<button type="button" class="${(cur||null)===c?'on':''}" data-act="${act}" data-v="${c||''}" title="${lg(th,en)}" aria-label="${lg(th,en)}" style="background:${col}"></button>`}).join('');
export function lookCard(mode,modeSeg){
  const isCustom=(list,cur)=>cur&&!list.some(x=>x[0]===cur);
  return`<div class="card" data-nt><h2>${lg('หน้าตา & สี','Appearance & colours')}</h2><div class="lk">
  <div><h3>${lg('โหมด','Mode')}</h3>${modeSeg}</div>
  <div><h3>${lg('สีพื้นหลัง','Background colour')}</h3><div class="sw">${sw(BG,look.bg,'lookBg')}<label class="cu ${isCustom(BG,look.bg)?'on':''}" title="${lg('กำหนดเอง','Custom')}"><input type="color" data-in="lookBgC" value="${look.bg||'#f6f4ef'}"></label></div></div>
  <div><h3>${lg('สีหลัก (ปุ่ม / เมนูที่เลือก)','Accent colour (buttons / active menu)')}</h3><div class="sw">${sw(AC,look.accent,'lookAc')}<label class="cu ${isCustom(AC,look.accent)?'on':''}" title="${lg('กำหนดเอง','Custom')}"><input type="color" data-in="lookAcC" value="${look.accent||'#ff5a1f'}"></label></div></div>
  <div><h3>${lg('เมนูด้านซ้าย','Sidebar')}</h3><div class="seg"><button type="button" class="${look.side!=='light'?'on':''}" data-act="lookSide" data-v="dark">${lg('เข้ม','Dark')}</button><button type="button" class="${look.side==='light'?'on':''}" data-act="lookSide" data-v="light">${lg('สว่างตามพื้นหลัง','Match background')}</button></div></div>
  <div><button type="button" class="btn sm" data-act="lookReset">${lg('คืนค่าสีเริ่มต้น','Reset colours')}</button></div></div></div>`}
export const lookActions={
  lookBg:v=>{look.bg=v||null;save()},lookAc:v=>{look.accent=v||null;save()},lookSide:v=>{look.side=v;save()},lookReset:()=>{look={};save()},
  lookBgC:v=>{look.bg=v;save()},lookAcC:v=>{look.accent=v;save()}};

/* CoreDash Smart QC — helpers */
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid=(p='')=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const pad=(n,w=2)=>String(n).padStart(w,'0');
export const DAY=86400000;
export const startOfDay=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const TH_M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export const fDate=(t,y=false)=>{const d=new Date(t);return d.getDate()+' '+TH_M[d.getMonth()]+(y?' '+(d.getFullYear()+543):'')};
export const fTime=t=>{const d=new Date(t);return pad(d.getHours())+':'+pad(d.getMinutes())};
export const fDT=t=>fDate(t,true)+' · '+fTime(t);
export const fNum=(n,d=0)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
export const pct=(a,b,d=1)=>b?(a/b*100):0;
export const fPct=(a,b,d=1)=>b?fNum(a/b*100,d)+'%':'—';
export function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function debounce(f,ms=200){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)}}
export function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
export function csv(rows){return '﻿'+rows.map(r=>r.map(v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(',')).join('\r\n')}

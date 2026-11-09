/* ระบบ 2 ภาษา ไทย / English — ต้นฉบับเป็นภาษาไทย แปลเป็นอังกฤษแบบ real-time ด้วยพจนานุกรม (en.js) */
import EN from './en.js';
const KEY='cdq.lang';
const guess=()=>{try{return (navigator.language||'th').toLowerCase().startsWith('th')?'th':'en'}catch(e){return'th'}};
export let lang=(()=>{try{return localStorage.getItem(KEY)||guess()}catch(e){return guess()}})();
const THAI=/[฀-๿]/,esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/* กฎเฉพาะที่ต้องจัดลำดับคำใหม่ (ทำก่อนแปลทีละท่อน) */
const PRE=[[/ไม่ผ่าน \(FAIL\)/g,'FAIL'],[/ผ่าน \(PASS\)/g,'PASS'],[/ขวด PET/g,'PET bottle'],[/(\d)\s*หัวข้อ(?! ·)/g,'$1 items'],[/(\d)\s*ล็อต/g,'$1 lots'],[/(\d)\s*ชิ้นงาน/g,'$1 units'],[/(\d)\s*ตรวจ(?!\S)/g,'$1 inspections'],[/ตรวจ (?=\d)/g,'Inspected '],[/(?<![\u0E00-\u0E7F\/]\s?)พิมพ์ (?=Serial)/g,'Type '],[/(?<![\u0E00-\u0E7F])พิมพ์ (?=\d)/g,'Printed '],[/ข้อมูลย้อนหลัง/g,'Data for the last'],[/ข้อมูลวันนี้/g,'Data for today']];
const keys=Object.keys(EN).sort((a,b)=>b.length-a.length);
const RE=new RegExp(keys.map(esc).join('|'),'g');
const isW=c=>/[A-Za-z0-9)’"]/.test(c||''),isS=c=>/[A-Za-z0-9(]/.test(c||'');
/* แปลข้อความหนึ่งชุด (ใช้เฉพาะโหมด EN) */
export function tr(s){if(lang!=='en'||typeof s!=='string'||!THAI.test(s))return s;
  s=s.replace(/มม\./g,'mm');for(const [r,v] of PRE)s=s.replace(r,v);if(!THAI.test(s))return s;let out='',last=0,m;RE.lastIndex=0;
  while((m=RE.exec(s))){const pre=s.slice(last,m.index);out+=pre;let e=EN[m[0]];
    if(isW(out.slice(-1))&&isS(e[0]))out+=' ';
    out+=e;last=m.index+m[0].length;if(isW(e.slice(-1))&&isS(s[last]))out+=' '}
  return out+s.slice(last)}
export const t=tr;
const ATTR=['placeholder','title','aria-label','alt'];
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','CODE']);
function fixEl(el){if(el.nodeType!==1||el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.closest('[data-nt]'))return;for(const a of ATTR){const v=el.getAttribute(a);if(v&&THAI.test(v)){const n=tr(v);if(n!==v)el.setAttribute(a,n)}}}
export function walk(root){if(lang!=='en'||!root)return;
  if(root.nodeType===3){if(THAI.test(root.nodeValue)&&!SKIP.has(root.parentNode?.tagName||'')&&!root.parentNode?.closest?.('[data-nt]')){const v=tr(root.nodeValue);if(v!==root.nodeValue)root.nodeValue=v}return}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){if(SKIP.has(root.tagName)||root.closest?.('[data-nt]'))return;fixEl(root)}
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){if(n.nodeType===3){const p=n.parentNode;if(THAI.test(n.nodeValue)&&!SKIP.has(p.tagName)&&!p.closest('[data-nt]')){const v=tr(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}}else fixEl(n)}}
let mo=null;
function observe(){if(mo||typeof MutationObserver==='undefined')return;
  mo=new MutationObserver(ms=>{if(lang!=='en')return;for(const m of ms){
    if(m.type==='childList')m.addedNodes.forEach(n=>walk(n));
    else if(m.type==='characterData')walk(m.target);
    else if(m.type==='attributes')fixEl(m.target)}});
  mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR})}
export function applyLang(){document.documentElement.lang=lang;observe();if(lang==='en')walk(document.documentElement)}
export function setLang(l){lang=l==='en'?'en':'th';try{localStorage.setItem(KEY,lang)}catch(e){}applyLang();window.dispatchEvent(new Event('cdq-shell'))}
export const locale=()=>lang==='en'?'en-GB':'th-TH';
applyLang();

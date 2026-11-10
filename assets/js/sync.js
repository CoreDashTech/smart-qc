/* ซิงก์กับ Google Sheet (ผ่าน Google Apps Script Web App) — local-first: ใช้งานออฟไลน์ได้ แล้วซิงก์เมื่อมีเน็ต */
import {tr} from './i18n.js';
import {S,onChange,save,getP,getL,getT} from './store.js';
const CFG='cdq.cfg',ST='cdq.sst',PK='cdq.photo.';
const COLS={products:'products',templates:'templates',lots:'lots',units:'units',inspections:'inspections',events:'events'};
const KEY={units:'sn'};const keyOf=(c,r)=>r[KEY[c]||'id'];
const HDR={products:['SKU','ชื่อสินค้า','หมวด','หน่วย','แม่แบบตรวจ'],templates:['ชื่อแม่แบบ','จำนวนหัวข้อ','หัวข้อ'],lots:['เลขล็อต','สินค้า','จำนวน','ไลน์','กะ','ผู้ผลิต','วันที่'],units:['Serial','สินค้า','ล็อต','สถานะ','ชื่อเรียก','รุ่นบอร์ด','เฟิร์มแวร์','กระแส (µA)'],inspections:['เวลา','Serial','สินค้า','ล็อต','ผู้ตรวจ','รอบที่','ผล','รหัสของเสีย','สาเหตุ','ค่าที่วัด','หมายเหตุ','Meter ID','รุ่นบอร์ด','เฟิร์มแวร์','กระแส (µA)'],events:['เวลา','Serial','เหตุการณ์','โดย'],settings:['บริษัท','โรงงาน','เป้า %']};
const dt=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())};
const cols={
 products:r=>[r.sku,r.name,r.category,r.unit,getT(r.templateId)?.name||''],
 templates:r=>[r.name,r.items.length,r.items.map(i=>i.label).join(' | ')],
 lots:r=>[r.lotNo,getP(r.productId)?.name||'',r.qty,r.line,r.shift,r.operator,dt(r.ts)],
 units:r=>[r.sn,getP(r.productId)?.name||'',getL(r.lotId)?.lotNo||'',r.status,r.label||'',(r.meta?.model||r.meta?.hw)||'',(r.meta?.fw||r.meta?.rnd)||'',r.meta?.ua??''],

 events:r=>[dt(r.ts),r.sn||'',r.text,r.by||''],
 settings:r=>[r.company,r.plant,r.target]};
cols.inspections=r=>[dt(r.ts),r.sn,getP(r.productId)?.name||'',getL(r.lotId)?.lotNo||'',r.inspector,r.round,r.verdict,r.defect||'',r.results.map(x=>x.type==='measure'?`${x.label}=${x.value}${x.unit||''}${x.ok?'':' ✘'}`:`${x.label}:${x.value==='ok'?'OK':'NG'}`).join('; '),r.note||'',r.scan?.id||'',(r.scan?.model||r.scan?.hw)||'',(r.scan?.fw||r.scan?.rnd)||'',r.scan?.ua??''];
HDR.inspections=['เวลา','Serial','สินค้า','ล็อต','ผู้ตรวจ','รอบที่','ผล','รหัสของเสีย','ค่าที่วัด','หมายเหตุ','Meter ID','รุ่นบอร์ด','เฟิร์มแวร์','กระแส (µA)'];
const SKIPSET=['theme','demo'];
const lsGet=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch(e){return d}};
let cfg=lsGet(CFG,null),st=lsGet(ST,{last:0,snap:{},ph:{}}),busy=false,timer=null,poll=null,status={mode:cfg?'ok':'off',msg:'',last:st.last||0,pending:0};
const subs=new Set();export const onStatus=f=>{subs.add(f);return()=>subs.delete(f)};
const setStatus=o=>{Object.assign(status,o);subs.forEach(f=>f(status))};
export const getStatus=()=>status;export const getCfg=()=>cfg;export const isOn=()=>!!cfg;
const saveSt=()=>{try{localStorage.setItem(ST,JSON.stringify(st))}catch(e){}};
const hash=o=>{const s=JSON.stringify(o);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h.toString(36)+s.length};
const settingsRec=()=>{const o={...S.settings};SKIPSET.forEach(k=>delete o[k]);return o};
function* records(){for(const c in COLS)for(const r of S[c])yield[c,keyOf(c,r),r];yield['settings','main',settingsRec()]}
function pendingRows(){const out=[];for(const[c,k,r]of records()){if(st.snap[c+'|'+k]!==hash(r))out.push({c,k,r})}return out}
export function pendingCount(){return cfg?pendingRows().length:0}
async function call(body){const r=await fetch(cfg.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:cfg.token,...body})});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(!j.ok)throw new Error(j.error||'เซิร์ฟเวอร์ตอบกลับผิดพลาด');return j}
async function get(q){const u=new URL(cfg.url);u.searchParams.set('token',cfg.token);Object.entries(q).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(!j.ok)throw new Error(j.error||'เซิร์ฟเวอร์ตอบกลับผิดพลาด');return j}
export async function ping(url,token){const old=cfg;cfg={url,token};try{return await get({action:'ping'})}finally{cfg=old}}
/* ---- ดึงข้อมูลจาก Sheet ---- */
async function pull(){const j=await get({action:'pull',since:st.last||0});let changed=false;
  for(const row of j.rows){let rec;try{rec=JSON.parse(row.j)}catch(e){continue}const c=row.c,k=row.k,sk=c+'|'+k;
    if(c==='settings'){const cur=settingsRec();if(st.snap[sk]&&st.snap[sk]!==hash(cur))continue;if(hash(rec)!==hash(cur)){Object.assign(S.settings,rec);changed=true}S.settings.demo=false;st.snap[sk]=hash(settingsRec());continue}
    const arr=S[c];if(!arr)continue;const i=arr.findIndex(x=>keyOf(c,x)===k);
    if(i<0){arr.push(rec);st.snap[sk]=hash(rec);changed=true}
    else{if(st.snap[sk]!==hash(arr[i]))continue; /* มีการแก้ไขในเครื่องที่ยังไม่ส่ง — ใช้ของเครื่องก่อน */
      if(hash(arr[i])!==hash(rec)){Object.keys(arr[i]).forEach(x=>delete arr[i][x]);Object.assign(arr[i],rec);changed=true}st.snap[sk]=hash(arr[i])}
    if(c==='lots'){const m=/^L(\d{6})-(\d+)$/.exec(rec.lotNo||'');if(m){const sq='lot20'+m[1];S.seq[sq]=Math.max(S.seq[sq]||0,+m[2])}}}
  st.last=j.now;saveSt();if(changed){S.settings.demo=false;save()}return changed}
/* ---- ส่งขึ้น Sheet ---- */
async function push(){const rows=pendingRows();let n=0;
  for(let i=0;i<rows.length;i+=150){const part=rows.slice(i,i+150),hdr={};part.forEach(x=>hdr[x.c]=HDR[x.c].map(tr));
    await call({action:'push',hdr,rows:part.map(x=>({c:x.c,k:x.k,cols:cols[x.c](x.r),j:JSON.stringify(x.r)}))});part.forEach(x=>{st.snap[x.c+'|'+x.k]=hash(x.r)});n+=part.length;saveSt()}
  return n}
async function photos(){let up=0;
  for(const i of S.inspections){if(!i.photo||st.ph[i.photo])continue;const d=localStorage.getItem(PK+i.photo);if(!d){continue}try{await call({action:'photo',id:i.photo,data:d});st.ph[i.photo]=1;up++}catch(e){throw e}if(up>=6)break}
  let down=0;for(const i of S.inspections){if(!i.photo||localStorage.getItem(PK+i.photo)||st.ph[i.photo]===2)continue;try{const j=await get({action:'getphoto',id:i.photo});if(j.data){localStorage.setItem(PK+i.photo,j.data);st.ph[i.photo]=1}else st.ph[i.photo]=2}catch(e){break}if(++down>=6)break}
  saveSt()}
export async function syncNow({quiet=false}={}){if(!cfg||busy)return;if(!navigator.onLine){setStatus({mode:'offline',msg:'ออฟไลน์ — จะซิงก์เมื่อมีอินเทอร์เน็ต',pending:pendingCount()});return}
  busy=true;setStatus({mode:'busy',msg:'กำลังซิงก์…'});
  try{const ch=await pull();const n=await push();await photos().catch(()=>{});st.last=st.last||Date.now();saveSt();setStatus({mode:'ok',msg:'ซิงก์แล้ว',last:Date.now(),pending:pendingCount()});if(ch)window.dispatchEvent(new Event('cdq-synced'));return{pulled:ch,pushed:n}}
  catch(e){console.warn('sync',e);setStatus({mode:'err',msg:'ซิงก์ไม่สำเร็จ: '+e.message,pending:pendingCount()});if(!quiet)throw e}
  finally{busy=false}}
export function schedule(ms=3500){if(!cfg)return;clearTimeout(timer);setStatus({pending:pendingCount()});timer=setTimeout(()=>syncNow({quiet:true}),ms)}
export function connect(url,token){cfg={url:url.trim(),token:token.trim()};localStorage.setItem(CFG,JSON.stringify(cfg));st={last:0,snap:{},ph:{}};saveSt();startPolling();setStatus({mode:'ok',msg:'เชื่อมต่อแล้ว'})}
export function disconnect(){cfg=null;localStorage.removeItem(CFG);localStorage.removeItem(ST);st={last:0,snap:{},ph:{}};clearInterval(poll);setStatus({mode:'off',msg:'',pending:0})}
function startPolling(){clearInterval(poll);poll=setInterval(()=>{if(document.visibilityState==='visible')syncNow({quiet:true})},45000)}
export function initSync(){onChange(()=>schedule());if(!cfg)return;window.addEventListener('online',()=>syncNow({quiet:true}));window.addEventListener('offline',()=>setStatus({mode:'offline',msg:'ออฟไลน์'}));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow({quiet:true})});startPolling();syncNow({quiet:true})}

/* CoreDash Smart QC — data store (local-first, localStorage) */
import {uid,rng,pad,DAY,startOfDay} from './util.js';
const KEY='cdq.v1',PKEY='cdq.photo.';
export const DEFECTS=[['DIM','มิติเกินพิกัด'],['SCR','รอยขีดข่วน/ตำหนิผิว'],['DEF','รูปทรงผิดปกติ'],['ASM','ประกอบผิด/ไม่ครบ'],['LBL','ฉลาก/บรรจุภัณฑ์ผิด'],['COL','สีไม่ตรง'],['FUN','ใช้งานไม่ได้/รั่ว/ไม่ต่อเนื่อง'],['OTH','อื่นๆ']];
export const S={settings:{},products:[],templates:[],lots:[],units:[],inspections:[],events:[],seq:{}};
const subs=new Set();export const onChange=f=>{subs.add(f);return()=>subs.delete(f)};
let timer;export function save(){clearTimeout(timer);timer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){console.warn('save fail',e);window.dispatchEvent(new CustomEvent('cdq-error',{detail:'พื้นที่จัดเก็บเต็ม — ส่งออกสำรองข้อมูลแล้วล้างรูป/ข้อมูลเก่า'}))}subs.forEach(f=>f())},60)}
export function load(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&j.products){Object.assign(S,j);return true}}catch(e){}return false}
export function reset(withDemo=true){Object.keys(localStorage).filter(k=>k.startsWith(PKEY)).forEach(k=>localStorage.removeItem(k));S.settings=defaults();S.products=[];S.templates=[];S.lots=[];S.units=[];S.inspections=[];S.events=[];S.seq={};if(withDemo)seed();else{S.settings.demo=false}save()}
function defaults(){return{company:'CoreDash Smart QC',plant:'โรงงานตัวอย่าง',lines:['Line A','Line B','Line C'],operators:['สมชาย ใจดี','วิภา รักงาน','อนุชา มั่นคง'],inspectors:['QC สมศรี','QC ประเสริฐ'],target:95,theme:'auto',demo:true}}
export const nextSeq=(k)=>{S.seq[k]=(S.seq[k]||0)+1;return S.seq[k]};
export const getP=id=>S.products.find(p=>p.id===id),getL=id=>S.lots.find(l=>l.id===id),getT=id=>S.templates.find(t=>t.id===id);
export const unitBySn=sn=>S.units.find(u=>u.sn.toLowerCase()===String(sn).trim().toLowerCase());
export function addEvent(e){S.events.push({id:uid('e'),ts:Date.now(),...e})}
/* ---------- สร้างล็อต + serial ---------- */
export function createLot({productId,qty,line,shift,operator,ts=Date.now()}){
  const p=getP(productId),d=new Date(ts),k='lot'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
  let n=nextSeq(k),lotNo;const mk=()=>'L'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(n);lotNo=mk();while(S.lots.some(l=>l.lotNo===lotNo)){n=nextSeq(k);lotNo=mk()}
  const lot={id:uid('l'),lotNo,productId,qty:+qty,line,shift,operator,ts,status:'open'};S.lots.push(lot);
  const pk='sn'+p.sku;const base=S.units.filter(u=>u.productId===productId).length;
  for(let i=0,j=0;i<qty;i++){let sn;do{sn=p.sku+'-'+String(d.getFullYear()).slice(2)+pad(d.getMonth()+1)+'-'+pad(base+(++j),5)}while(unitBySn(sn));S.units.push({sn,productId,lotId:lot.id,ts,status:'new'})}
  addEvent({ts,type:'lot',lotId:lot.id,text:`เปิดล็อตผลิต ${lotNo} · ${p.name} ${qty} ชิ้น · ${line}`,by:operator});
  return lot}
export function addUnits({lotId,sns,ts=Date.now()}){const l=getL(lotId);let n=0;sns.forEach(sn=>{sn=String(sn).trim();if(!sn||unitBySn(sn))return;S.units.push({sn,productId:l.productId,lotId,ts,status:'new'});n++});l.qty+=n;addEvent({ts,type:'reg',lotId,text:`ลงทะเบียน serial เพิ่ม ${n} รายการ (ล็อต ${l.lotNo})`});return n}
/* ---------- บันทึกผลตรวจ ---------- */
export function evaluate(tpl,vals){const res=tpl.items.map(it=>{const v=vals[it.id];let ok=null,note='';
  if(it.type==='check'){ok=v==='ok'?true:v==='ng'?false:null}
  else if(it.type==='measure'){const x=parseFloat(v);if(!isNaN(x)){ok=(it.lsl==null||x>=it.lsl)&&(it.usl==null||x<=it.usl)}else ok=null}
  const o={itemId:it.id,label:it.label,type:it.type,value:v??null,ok};if(it.unit)o.unit=it.unit;if(it.lsl!=null)o.lsl=it.lsl;if(it.usl!=null)o.usl=it.usl;if(it.critical)o.critical=1;return o});
  const missing=res.some(r=>r.ok===null),fail=res.some(r=>r.ok===false);return{results:res,verdict:fail?'FAIL':'PASS',complete:!missing}}
export function saveInspection({sn,vals,inspector,defect,note,photo,ts=Date.now()}){
  const u=unitBySn(sn),p=getP(u.productId),t=getT(p.templateId),ev=evaluate(t,vals);
  const prev=S.inspections.filter(i=>i.sn===u.sn).length;
  const ins={id:uid('i'),sn:u.sn,productId:u.productId,lotId:u.lotId,ts,inspector,results:ev.results,verdict:ev.verdict,defect:ev.verdict==='FAIL'?(defect||'OTH'):null,note:note||'',round:prev+1,photo:null,scan:u.meta?{id:u.meta.id,hw:u.meta.hw,rnd:u.meta.rnd,model:u.meta.model||'',fw:u.meta.fw||'',ua:u.meta.ua}:null};
  if(photo){ins.photo='p'+ins.id;try{localStorage.setItem(PKEY+ins.photo,photo)}catch(e){ins.photo=null}}
  S.inspections.push(ins);u.status=ev.verdict==='PASS'?'pass':'fail';u.last=ts;
  save();return ins}
export const defName=c=>(DEFECTS.find(d=>d[0]===c)||[c,c])[1];
export const getPhoto=id=>{try{return localStorage.getItem(PKEY+id)}catch(e){return null}};
export function scrapUnit(sn,by){const u=unitBySn(sn);u.status='scrap';addEvent({type:'scrap',sn:u.sn,lotId:u.lotId,text:'ตัดจำหน่าย/ทิ้งชิ้นงาน (Scrap)',by});save()}
/* ---------- สถิติ ---------- */
export function statsOf(list){const t=list.length,pass=list.filter(i=>i.verdict==='PASS').length;return{total:t,pass,fail:t-pass,rate:t?pass/t*100:0}}
export function inRange(from,to=Date.now()+DAY){return S.inspections.filter(i=>i.ts>=from&&i.ts<to)}
export function groupBy(list,fn){const m=new Map();list.forEach(x=>{const k=fn(x);(m.get(k)||m.set(k,[]).get(k)).push(x)});return m}
export function pareto(list){const f=list.filter(i=>i.verdict==='FAIL'),m=groupBy(f,i=>i.defect||'OTH');return[...m].map(([k,v])=>({code:k,name:defName(k),n:v.length})).sort((a,b)=>b.n-a.n)}
export function lotStats(lot){const us=S.units.filter(u=>u.lotId===lot.id),ins=S.inspections.filter(i=>i.lotId===lot.id);const last=us.map(u=>u.status);return{units:us.length,inspected:us.filter(u=>u.status!=='new').length,pass:last.filter(s=>s==='pass').length,fail:last.filter(s=>s==='fail').length,scrap:last.filter(s=>s==='scrap').length,firstPass:us.filter(u=>{const f=ins.filter(i=>i.sn===u.sn).sort((a,b)=>a.ts-b.ts)[0];return f&&f.verdict==='PASS'}).length,insp:ins.length}}
/* ---------- ข้อมูลตัวอย่าง ---------- */
function seed(){
  const T=(name,items)=>{const t={id:uid('t'),name,items:items.map((x,i)=>({id:'i'+(i+1),...x}))};S.templates.push(t);return t};
  const chk=(label,critical)=>({label,type:'check',critical:!!critical}),ms=(label,nominal,lsl,usl,unit,critical)=>({label,type:'measure',nominal,lsl,usl,unit,critical:!!critical});
  const t1=T('บานพับเหล็ก HG-40',[chk('ผิวชิ้นงาน ไม่มีรอยขีดข่วน/สนิม'),ms('ความยาว',40,39.8,40.2,'mm'),ms('ความหนา',2.0,1.95,2.05,'mm'),ms('น้ำหนัก',85,82,88,'g'),chk('รูยึดครบ ไม่มีเสี้ยน',true)]);
  const t2=T('ขวด PET 500 ml',[chk('ไม่รั่วซึม (Leak test)',true),ms('น้ำหนักขวด',18.5,18,19,'g'),ms('ความสูง',195,194,196,'mm'),chk('ฉลากถูกต้อง ตรงตำแหน่ง'),chk('ฝาปิดสนิท')]);
  const t3=T('ชุดสายไฟ WH-120',[chk('ต่อเนื่องทางไฟฟ้า (Continuity)',true),ms('ความยาวสาย',120,118,122,'cm'),chk('ขั้วต่อแน่น ไม่หลวม'),ms('ความต้านทานรวม',null,null,0.5,'Ω',true),chk('ปลอกสายไม่ฉีกขาด')]);
  const P=[['HG-40','บานพับเหล็ก HG-40','โลหะ',t1,'ชิ้น'],['BT-500','ขวด PET 500 ml','บรรจุภัณฑ์',t2,'ขวด'],['WH-120','ชุดสายไฟ WH-120','อิเล็กทรอนิกส์',t3,'เส้น']].map(([sku,name,cat,t,unit],i)=>{const p={id:'p'+(i+1),sku,name,category:cat,templateId:t.id,unit,ts:Date.now()-20*DAY};S.products.push(p);return p});
  const R=rng(20261109),now=Date.now(),lines=S.settings.lines,ops=S.settings.operators,ins=S.settings.inspectors;
  const badRate=[.07,.09,.06];
  for(let d=13;d>=0;d--){const day=startOfDay(now-d*DAY);
    P.forEach((p,pi)=>{if(R()<.3&&d>0)return;const nl=R()<.25?2:1;for(let k=0;k<nl;k++){
      const qty=[14,18,22,16,12][Math.floor(R()*5)]+(d===0?-4:0),ts=day+(7+Math.floor(R()*6))*3600e3,line=lines[(pi+k)%3];
      const lot=createLot({productId:p.id,qty,line,shift:ts%2?'A':'B',operator:ops[Math.floor(R()*3)],ts});
      const t=getT(p.templateId),us=S.units.filter(u=>u.lotId===lot.id);
      const bad=badRate[pi]*(d<3&&pi===1?2.6:1)*(d===4&&pi===2?3:1);
      us.forEach((u,j)=>{if(d===0&&j>us.length*.7)return;const when=ts+3600e3+j*140e3+Math.floor(R()*60e3);
        const run=(forceBad)=>{const vals={},bi=forceBad?Math.floor(R()*t.items.length):-1;t.items.forEach((it,ix)=>{if(it.type==='check')vals[it.id]=ix===bi?'ng':'ok';
            else{const sd=((it.usl??it.nominal)-(it.lsl??(it.nominal||0)))/6||.1,mean=it.nominal??((it.usl||1)*.5);let v=mean+(R()+R()+R()-1.5)*2*sd*.8;if(ix===bi)v=R()<.5?(it.usl??mean)+sd*(.5+R()):(it.lsl??mean)-sd*(.5+R());vals[it.id]=Number(v.toFixed(3))}});return vals};
        const f=R()<bad;let vals=run(f);let e=evaluate(t,vals);
        const dm={check:['SCR','ASM','FUN','LBL','DEF'],measure:['DIM']};
        const mk=(vals,ts2,round)=>{const ev=evaluate(t,vals);const bi=ev.results.find(r=>r.ok===false);const defect=bi?(bi.type==='measure'?'DIM':dm.check[Math.floor(R()*5)]):null;
          const rec={id:uid('i'),sn:u.sn,productId:u.productId,lotId:u.lotId,ts:ts2,inspector:ins[Math.floor(R()*2)],results:ev.results,verdict:ev.verdict,defect,note:'',round,photo:null};S.inspections.push(rec);u.status=ev.verdict==='PASS'?'pass':'fail';u.last=ts2;
          return rec};
        const r1=mk(vals,when,1);
        if(r1.verdict==='FAIL'){const x=R();if(x<.55&&d>0||x<.5){mk(run(false),when+2*3600e3,2)}else if(x<.8){u.status='scrap';addEvent({ts:when+3600e3,type:'scrap',sn:u.sn,lotId:u.lotId,text:'ตัดจำหน่าย/ทิ้งชิ้นงาน (Scrap)',by:'QC สมศรี'})}}})}})}
  S.settings.demo=true}
export function init(){if(!load()){S.settings=defaults();seed();save()}}
export function exportJSON(){return JSON.stringify({app:'coredash-smart-qc',v:1,at:Date.now(),data:S})}
export function importJSON(txt){const j=JSON.parse(txt);if(j.app!=='coredash-smart-qc')throw new Error('ไฟล์ไม่ใช่ข้อมูล CoreDash Smart QC');Object.assign(S,j.data);save()}

/* สินค้า+แม่แบบตรวจตั้งต้นสำหรับบอร์ดมิเตอร์ SMCV4 (พิกัดกระแสเป็นค่าตั้งต้น ปรับได้ที่เมนูสินค้า) */
export function ensureBoardProduct(model='SMCV4'){let p=S.products.find(x=>x.sku===model);if(p)return p;
  const t={id:uid('t'),name:'ตรวจบอร์ดมิเตอร์ '+model,items:[{id:'i1',label:'กระแสขณะวัด',type:'measure',nominal:null,lsl:0,usl:model==='SMCV4'?20:15,unit:'µA',critical:true},{id:'i2',label:'ตรวจด้วยสายตา: บัดกรี/ชิ้นส่วนครบ',type:'check',critical:false},{id:'i3',label:'จอ LCD แสดงผลปกติ',type:'check',critical:true}]};
  S.templates.push(t);p={id:uid('p'),sku:model,name:'บอร์ดมิเตอร์ '+model,category:'อิเล็กทรอนิกส์',templateId:t.id,unit:'ชิ้น',ts:Date.now()};S.products.push(p);save();return p}

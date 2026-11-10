import {S,save,getP,getL,getT,unitBySn,evaluate,saveInspection,DEFECTS,defName,scrapUnit,createLot,addUnits,ensureBoardProduct} from './store.js';
import {ACT,IN,ic,refresh,modal,closeModal,toast,chipV,go} from './ui.js';
import {openScanner,parseScan,parseBoard} from './scan.js';
import {esc,fNum,fDate,fTime,clamp} from './util.js';
export const title='ตรวจ QC';
let cur=null,stream=null,scanT=null;
const inspector=()=>localStorage.getItem('cdq.inspector')||S.settings.inspectors[0]||'QC';
/* ---------- หน้าเลือกชิ้นงาน ---------- */
function renderScan(){
  const waiting=S.units.filter(u=>u.status==='new').sort((a,b)=>b.ts-a.ts||a.sn.localeCompare(b.sn)),failed=S.units.filter(u=>u.status==='fail').sort((a,b)=>(b.last||0)-(a.last||0));
  const today=S.inspections.filter(i=>i.ts>=new Date().setHours(0,0,0,0));const st=today.length;
  const item=u=>`<a class="row" href="#/inspect/${encodeURIComponent(u.sn)}"><span class="dot ${u.status==='fail'?'bad':''}">${ic(u.status==='fail'?'alert':'tag')}</span><div class="m"><b class="mono">${esc(u.sn)}</b><small>${esc(getP(u.productId)?.name)} · ${esc(getL(u.lotId)?.lotNo||'')}</small></div>${chipV(u.status)}${ic('chev')}</a>`;
  return`<div class="ph"><div><h1>ตรวจสอบคุณภาพ</h1><p>สแกนหรือพิมพ์ Serial แล้วบันทึกผลตรวจ — วันนี้ตรวจแล้ว <b class="mono">${st}</b> ชิ้น</p></div></div>
  <div class="grid g21"><div class="card"><div class="scan"><label class="mut" style="font-weight:600;font-size:.85rem">Serial Number</label>
    <form id="snf" style="display:grid;gap:10px"><input class="in" id="snIn" name="sn" placeholder="ยิงบาร์โค้ด / พิมพ์ Serial…" autocomplete="off" autocapitalize="characters" autofocus enterkeyhint="go" list="snl"><datalist id="snl">${waiting.slice(0,60).map(u=>`<option value="${esc(u.sn)}">`).join('')}</datalist>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn pri lg">${ic('check')} เริ่มตรวจ</button><button type="button" class="btn lg" data-act="camScan">${ic('camera')} สแกนกล้อง</button></div></form>
    <div class="mut" style="font-size:.85rem">เครื่องยิงบาร์โค้ด USB/Bluetooth ใช้ได้เลย — ยิงแล้วระบบเริ่มตรวจให้อัตโนมัติ · QR ที่ติดมากับบอร์ด/อุปกรณ์ (ไม่ได้พิมพ์จากระบบนี้) ก็สแกนแล้วลงทะเบียนได้ทันที</div><details style="margin-top:6px"><summary style="cursor:pointer;font-weight:600;font-size:.88rem">สแกนด้วยกล้อง/สแกน QR ของมือถือ แล้วส่งเข้าแอป</summary><ol class="mut" style="font-size:.85rem;padding-left:20px;margin:8px 0 0"><li>เปิดแอปกล้องมือถือ หรือแตะปุ่ม <b>สแกน QR</b> ในแถบการตั้งค่าด่วน (ปัดจอลง) แล้วเล็งที่ QR</li><li>ถ้า QR เป็นลิงก์ของระบบนี้ กดลิงก์ได้เลย แอปจะเปิดหน้าตรวจของชิ้นนั้น</li><li>ถ้า QR เป็นข้อความธรรมดา (เช่น QR ที่ติดมากับบอร์ด) กด <b>แชร์</b> → เลือก <b>Smart QC</b> ข้อมูลจะเข้าแอปทันที แล้วลงทะเบียน/บันทึกผลตรวจ ซึ่งซิงก์เข้า Google Sheet ให้ถ้าเชื่อมไว้</li></ol><p class="mut" style="font-size:.8rem;margin:6px 0 0">ตัวเลือก Smart QC ใน “แชร์” จะขึ้นเมื่อติดตั้งแอปจากเบราว์เซอร์แล้ว (หากเพิ่งอัปเดต ให้เปิดแอปทิ้งไว้สักครู่หรือติดตั้งใหม่)</p></details></div></div>
    <div class="card"><h2>ผู้ตรวจ</h2><select class="in" data-in="insp">${S.settings.inspectors.map(n=>`<option ${n===inspector()?'selected':''}>${esc(n)}</option>`).join('')}</select><p class="mut" style="font-size:.85rem;margin:10px 0 0">ชื่อผู้ตรวจจะถูกบันทึกกับผลตรวจทุกชิ้น เพื่อใช้ย้อนรอย</p></div></div>
  ${failed.length?`<div class="card" style="margin-top:16px"><div class="ch-h"><h2>รอตรวจซ้ำ (FAIL)</h2><span class="chip bad">${failed.length}</span></div><div class="rows">${failed.slice(0,5).map(item).join('')}</div></div>`:''}
  <div class="card" style="margin-top:16px"><div class="ch-h"><h2>ชิ้นที่รอตรวจ</h2><span class="chip">${fNum(waiting.length)}</span></div><div class="rows">${waiting.slice(0,10).map(item).join('')||'<div class="empty-s">ไม่มีชิ้นงานรอตรวจ — เปิดล็อตใหม่ได้ที่เมนู "สินค้า"</div>'}</div></div>`}
IN.insp=el=>localStorage.setItem('cdq.inspector',el.value);
function registerUnit(sn,pid,label,meta){let lot=S.lots.filter(l=>l.productId===pid).sort((a,b)=>b.ts-a.ts)[0];
  if(!lot)lot=createLot({productId:pid,qty:0,line:S.settings.lines[0],shift:'A',operator:S.settings.operators[0]});addUnits({lotId:lot.id,sns:[sn]});
  const nu=unitBySn(sn);if(nu){if(label)nu.label=label;if(meta)nu.meta=meta}save();return nu}
let pend=null;
export function submitSn(raw,opt={}){const sn=parseScan(raw);if(!sn)return;const meta=parseBoard(raw),u=unitBySn(sn);
  if(u){if(meta){u.meta=meta;save()}return go((opt.to||'/inspect/')+encodeURIComponent(u.sn))}
  if(!S.products.length){pend={sn,meta,raw,opt};return meta?modal(`<h2>ยังไม่มีสินค้าในระบบ</h2><p class="mut">พบ QR บอร์ดมิเตอร์: Meter ID <b class="mono">${esc(meta.id)}</b> · ${esc(meta.model||meta.hw)}${meta.fw?' · '+esc(meta.fw):''}${meta.ua!=null?' · '+meta.ua+' µA':''}<br>ให้ระบบสร้างสินค้า “บอร์ดมิเตอร์ ${esc(meta.model||'SMCV4')}” พร้อมแม่แบบตรวจ (กระแส + ตรวจสายตา + จอ LCD) แล้วลงทะเบียนเลยไหม</p><div class="acts"><button class="btn" data-act="mClose2">ยกเลิก</button><button class="btn pri" data-act="mkBoard">สร้างและลงทะเบียน</button></div>`):askRegister(sn,opt)}
  const mp=meta&&meta.model&&S.products.find(x=>x.sku===meta.model);
  if(mp){registerUnit(sn,mp.id,String(raw).trim().slice(0,80),meta);toast('ลงทะเบียนแล้ว · '+sn);return go('/inspect/'+encodeURIComponent(sn))}
  if(S.products.length===1&&meta){registerUnit(sn,S.products[0].id,String(raw).trim().slice(0,80),meta);toast('ลงทะเบียนแล้ว · '+sn);return go('/inspect/'+encodeURIComponent(sn))}
  askRegister(sn,{...opt,meta});const rt=String(raw||'').trim();if(rt&&rt!==sn&&!/^https?:/i.test(rt)){const l=document.querySelector('#qf [name=label]');if(l&&!l.value)l.value=rt.slice(0,80)}}
ACT.mkBoard=()=>{if(!pend)return;const p=ensureBoardProduct(pend.meta&&pend.meta.model||'SMCV4');closeModal();const {sn,meta,raw}=pend;pend=null;registerUnit(sn,p.id,String(raw).trim().slice(0,80),meta);toast('สร้างสินค้าและลงทะเบียนแล้ว · '+sn);go('/inspect/'+encodeURIComponent(sn))};
/* โค้ดที่ยังไม่อยู่ในระบบ (เช่น QR ที่ติดมากับบอร์ด/อุปกรณ์) → ลงทะเบียนจากโค้ดนั้นได้ทันที */
export function askRegister(sn,opt={}){
  if(!S.products.length)return modal(`<h2>ยังไม่มีสินค้าในระบบ</h2><p class="mut">ต้องเพิ่มสินค้า (เช่น ชื่อบอร์ด/อุปกรณ์) ก่อน จึงจะลงทะเบียนโค้ดได้</p><div class="acts"><button class="btn" data-act="mClose2">ปิด</button><button class="btn pri" data-act="goProducts">ไปเพิ่มสินค้า</button></div>`);
  modal(`<h2>พบโค้ดใหม่ — ยังไม่ได้ลงทะเบียน</h2><p class="mono" style="word-break:break-all;background:var(--surface2);padding:10px 12px;border-radius:12px;margin:0 0 12px">${esc(sn)}</p><form id="qf"><div class="f"><label>สินค้า / ประเภทบอร์ด</label><select class="in" name="p">${opt.meta&&opt.meta.model&&!S.products.some(x=>x.sku===opt.meta.model)?`<option value="__new">＋ สร้างสินค้า “บอร์ดมิเตอร์ ${esc(opt.meta.model)}” (แนะนำ)</option>`:''}${S.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="f"><label>ชื่อเรียก / ตำแหน่งอุปกรณ์ (ไม่บังคับ)</label><input class="in" name="label" placeholder="เช่น บอร์ดควบคุมเครื่องอัด #3" autocomplete="off"></div><div class="acts" style="flex-wrap:wrap"><button type="button" class="btn" data-act="mClose2">ยกเลิก</button><button type="button" class="btn" data-act="regOnly">ลงทะเบียนอย่างเดียว</button><button class="btn pri">ลงทะเบียน & ตรวจ</button></div></form>`);
  const f=document.getElementById('qf');let only=false;ACT.regOnly=()=>{only=true;f.requestSubmit()};
  f.onsubmit=e=>{e.preventDefault();const d=new FormData(f);registerUnit(sn,d.get('p')==='__new'?ensureBoardProduct(opt.meta.model).id:d.get('p'),String(d.get('label')||'').trim(),opt.meta);closeModal();toast('ลงทะเบียนแล้ว');
    if(only){go(opt.back||'/inspect');refresh()}else go('/inspect/'+encodeURIComponent(sn))}}
ACT.mClose2=()=>closeModal();ACT.goProducts=()=>{closeModal();go('/products')};
/* ---------- สแกนด้วยกล้อง ---------- */
const phone=()=>matchMedia('(max-width:700px)').matches&&matchMedia('(pointer:coarse)').matches;
ACT.camScan=()=>{try{sessionStorage.setItem('cdq.cont','1')}catch(e){}openScanner(submitSn)};
/* เครื่องยิงบาร์โค้ด (keyboard wedge): ถ้าโฟกัสหลุด ตัวอักษรที่ยิงมาจะถูกดึงเข้าช่อง Serial เอง */
document.addEventListener('keydown',e=>{if(location.hash.replace(/^#\/?/,'')!=='inspect'||document.getElementById('modal')||e.ctrlKey||e.metaKey||e.altKey)return;
  const t=document.activeElement,tag=t&&t.tagName;if(/INPUT|TEXTAREA|SELECT/.test(tag||''))return;const i=document.getElementById('snIn');if(!i)return;
  if(e.key.length===1||e.key==='Enter'){i.focus()}});
/* ---------- หน้าตรวจ ---------- */
function renderForm(sn){const u=unitBySn(sn);if(!u)return`<div class="card empty"><div class="big">🔎</div><h2>ไม่พบ Serial</h2><a class="btn pri" href="#/inspect">กลับ</a></div>`;
  const p=getP(u.productId),t=getT(p.templateId),lot=getL(u.lotId),prev=S.inspections.filter(i=>i.sn===u.sn);
  if(!cur||cur.sn!==u.sn){cur={sn:u.sn,vals:{},photo:null,defect:'',note:''};
    if(u.meta&&u.meta.ua!=null){const ci=t.items.find(i=>i.type==='measure'&&(/กระแส|current/i.test(i.label)||/^[µμu]a$/i.test(i.unit||'')));if(ci)cur.vals[ci.id]=String(u.meta.ua)}}
  const rows=t.items.map(it=>{
    if(it.type==='check')return`<div class="ck" data-item="${it.id}"><div class="lb"><b>${esc(it.label)}</b>${it.critical?'<span class="crit">● หัวข้อวิกฤต</span>':''}</div><div class="pn"><button type="button" class="y" data-act="ck" data-id="${it.id}" data-v="ok">${ic('check')} ผ่าน</button><button type="button" class="n" data-act="ck" data-id="${it.id}" data-v="ng">${ic('x')} ไม่ผ่าน</button></div></div>`;
    const lo=it.lsl,hi=it.usl,span=(hi!=null&&lo!=null)?hi-lo:null,a=span?lo-span*.6:null,b=span?hi+span*.6:null;
    return`<div class="ck" data-item="${it.id}" style="grid-template-columns:1fr"><div class="lb"><b>${esc(it.label)}</b> ${it.critical?'<span class="crit">● วิกฤต</span>':''}<small>พิกัด: ${lo!=null?'≥ '+lo:''}${lo!=null&&hi!=null?' และ ':''}${hi!=null?'≤ '+hi:''} ${esc(it.unit||'')}${it.nominal!=null?' (ค่ากลาง '+it.nominal+')':''}</small></div>
      <div class="ms-in"><input class="in mono" inputmode="decimal" data-in="mv" data-id="${it.id}" placeholder="0.00" autocomplete="off" value="${esc(cur.vals[it.id]??'')}"><span class="u">${esc(it.unit||'')}</span><span class="mv-s" style="flex:1;text-align:right;font-weight:700"></span></div>
      ${span?`<div class="rg" data-a="${a}" data-b="${b}"><i class="band" style="left:${(lo-a)/(b-a)*100}%;width:${span/(b-a)*100}%"></i><i class="pin" style="display:none"></i></div>`:''}</div>`}).join('');
  const retest=prev.length?`<span class="chip ${u.status==='fail'?'bad':'info'}">ตรวจซ้ำ · รอบที่ ${prev.length+1}</span>`:'';
  return`<div class="ph"><a class="btn sm" href="#/inspect">${ic('back')} กลับ</a><div><h1 class="mono" style="font-size:1.3rem">${esc(u.sn)}</h1><p>${esc(p.name)} · ล็อต ${esc(lot?.lotNo||'')} ${retest}</p></div><div class="sp"></div><a class="btn sm" href="#/trace/${encodeURIComponent(u.sn)}">${ic('trace')} ประวัติ</a></div>
  ${u.meta?`<div class="card" style="margin-bottom:14px"><div style="font-size:.8rem;font-weight:700;opacity:.7;margin-bottom:8px">ข้อมูลจาก QR ที่สแกน</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:10px">${[['Meter ID',u.meta.id,1],['รุ่นบอร์ด',u.meta.model||u.meta.hw||'—'],['เฟิร์มแวร์',u.meta.fw||u.meta.rnd||'—'],['กระแส',u.meta.ua!=null?u.meta.ua+' µA':'ยังไม่มีใน QR · กรอกเอง']].map(([l,v,m])=>`<div style="background:var(--surface2);border-radius:12px;padding:10px 12px"><small class="mut">${l}</small><div class="${m?'mono ':''}" style="font-weight:800;font-size:1.05rem;word-break:break-all">${esc(String(v))}</div></div>`).join('')}</div></div>`:''}
  <div class="grid g21" style="align-items:start"><div><div style="display:flex;gap:10px;align-items:center;margin-bottom:12px"><h2 style="flex:1">รายการตรวจ · ${esc(t.name)}</h2><button class="btn sm" data-act="allOk">${ic('check')} ผ่านทั้งหมด (ข้อสายตา)</button></div>${rows}</div>
  <div class="card" id="side"><h2>หลักฐาน & หมายเหตุ</h2>
    <div class="f"><label>รูปถ่าย (ไม่บังคับ)</label><label class="btn" style="width:100%">${ic('camera')} ถ่ายรูป / เลือกรูป<input type="file" accept="image/*" capture="environment" hidden data-in="photo"></label><div id="ph"></div></div>
    <div class="f" id="defF" style="display:none"><label>สาเหตุที่ไม่ผ่าน (Defect)</label><select class="in" data-in="defect">${DEFECTS.map(([c,n])=>`<option value="${c}">${c} · ${esc(n)}</option>`).join('')}</select></div>
    <div class="f"><label>หมายเหตุ</label><textarea class="in" data-in="note" rows="3" placeholder="เช่น ผิวมีรอยลึกด้านซ้าย"></textarea></div></div></div>
  <div class="verdict" id="vd"><div class="vt"><b id="vtx">—</b><small id="vsm"></small></div><button class="btn lg ok" id="vsave" data-act="inspSave">${ic('check')} บันทึกผล</button></div>`}
function paint(){const u=unitBySn(cur.sn),t=getT(getP(u.productId).templateId),ev=evaluate(t,cur.vals);
  t.items.forEach((it,i)=>{const row=document.querySelector(`[data-item="${it.id}"]`);if(!row)return;const r=ev.results[i];row.classList.toggle('ok',r.ok===true);row.classList.toggle('ng',r.ok===false);
    if(it.type==='check'){row.querySelector('.y').classList.toggle('on',cur.vals[it.id]==='ok');row.querySelector('.n').classList.toggle('on',cur.vals[it.id]==='ng')}
    else{const s=row.querySelector('.mv-s');s.textContent=r.ok===null?'':r.ok?'✔ อยู่ในพิกัด':'✘ เกินพิกัด';s.className='mv-s '+(r.ok?'okc':'badc');const rg=row.querySelector('.rg');if(rg){const x=parseFloat(cur.vals[it.id]);const pin=rg.querySelector('.pin');if(isNaN(x))pin.style.display='none';else{const a=+rg.dataset.a,b=+rg.dataset.b;pin.style.display='block';pin.style.left=clamp((x-a)/(b-a)*100,1,99)+'%';pin.classList.toggle('bad',r.ok===false)}}}});
  const done=ev.results.filter(r=>r.ok!==null).length,tot=ev.results.length,vd=document.getElementById('vd');
  vd.className='verdict '+(ev.complete?(ev.verdict==='PASS'?'ok':'ng'):'');
  document.getElementById('vtx').innerHTML=ev.complete?(ev.verdict==='PASS'?'<span class="okc">✔ PASS — ผ่าน</span>':'<span class="badc">✘ FAIL — ไม่ผ่าน</span>'):(ev.verdict==='FAIL'?'<span class="badc">✘ พบจุดไม่ผ่านแล้ว</span>':'กำลังตรวจ…');
  document.getElementById('vsm').textContent=`ตรวจแล้ว ${done}/${tot} หัวข้อ`;
  const sv=document.getElementById('vsave');sv.disabled=!ev.complete;sv.className='btn lg '+(ev.verdict==='PASS'?'ok':'bad');sv.innerHTML=ic(ev.verdict==='PASS'?'check':'x')+(ev.verdict==='PASS'?' บันทึก PASS':' บันทึก FAIL');
  document.getElementById('defF').style.display=ev.verdict==='FAIL'&&ev.complete||ev.verdict==='FAIL'?'grid':'none'}
ACT.ck=el=>{cur.vals[el.dataset.id]=el.dataset.v;paint()};
ACT.allOk=()=>{const u=unitBySn(cur.sn),t=getT(getP(u.productId).templateId);t.items.filter(i=>i.type==='check').forEach(i=>{if(!cur.vals[i.id])cur.vals[i.id]='ok'});paint()};
IN.mv=el=>{cur.vals[el.dataset.id]=el.value.replace(',','.');paint()};IN.defect=el=>{cur.defect=el.value};IN.note=el=>{cur.note=el.value};
IN.photo=el=>{const f=el.files[0];if(!f)return;const img=new Image(),r=new FileReader();r.onload=()=>{img.onload=()=>{const k=Math.min(1,720/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=img.width*k;c.height=img.height*k;c.getContext('2d').drawImage(img,0,0,c.width,c.height);cur.photo=c.toDataURL('image/jpeg',.6);document.getElementById('ph').innerHTML=`<img src="${cur.photo}" style="width:100%;border-radius:12px;margin-top:8px">`};img.src=r.result};r.readAsDataURL(f)};
ACT.inspSave=()=>{const u=unitBySn(cur.sn),t=getT(getP(u.productId).templateId),ev=evaluate(t,cur.vals);if(!ev.complete)return toast('กรอกผลให้ครบทุกหัวข้อก่อน');
  const ins=saveInspection({sn:cur.sn,vals:cur.vals,inspector:inspector(),defect:cur.defect||'DIM',note:cur.note,photo:cur.photo});
  const lotId=u.lotId,sn=cur.sn;cur=null;const nxt=S.units.filter(x=>x.lotId===lotId&&x.status==='new').sort((a,b)=>a.sn.localeCompare(b.sn))[0];
  toast(ins.verdict==='PASS'?`✔ ${sn} ผ่าน`:`✘ ${sn} ไม่ผ่าน — บันทึกแล้ว`,2200);
  if(ins.verdict==='FAIL'){modal(`<h2 class="badc">ชิ้นงานไม่ผ่าน</h2><p class="mono">${esc(sn)}</p><p class="mut">เลือกขั้นตอนต่อไป</p><div class="acts" style="justify-content:stretch;flex-direction:column"><button class="btn lg" data-act="nextAfter" data-v="${nxt?encodeURIComponent(nxt.sn):''}">ตรวจชิ้นถัดไป</button><button class="btn lg" data-act="reInsp" data-v="${encodeURIComponent(sn)}">ตรวจซ้ำชิ้นนี้ (หลังแก้ไข)</button><button class="btn lg danger" data-act="doScrap" data-v="${encodeURIComponent(sn)}" data-n="${nxt?encodeURIComponent(nxt.sn):''}">${ic('trash')} ตัดจำหน่าย (Scrap)</button></div>`)}
  else go(nxt?'/inspect/'+encodeURIComponent(nxt.sn):'/inspect')};
ACT.nextAfter=el=>{closeModal();go(el.dataset.v?'/inspect/'+el.dataset.v:'/inspect')};
ACT.reInsp=el=>{closeModal();cur=null;go('/inspect/'+el.dataset.v);refresh()};
ACT.doScrap=el=>{scrapUnit(decodeURIComponent(el.dataset.v),inspector());closeModal();toast('บันทึก Scrap แล้ว');go(el.dataset.n?'/inspect/'+el.dataset.n:'/inspect')};
export function render(p){if(!p[0])return renderScan();return renderForm(decodeURIComponent(p[0]))}
export function mount(p){if(!p[0]){const f=document.getElementById('snf');if(f)f.onsubmit=e=>{e.preventDefault();submitSn(new FormData(f).get('sn'))};const i=document.getElementById('snIn');if(i&&matchMedia('(hover:hover)').matches)i.focus();let c=null;try{c=sessionStorage.getItem('cdq.cont')}catch(e){}if(c==='1'&&phone()&&!document.getElementById('modal'))setTimeout(()=>{if(location.hash.replace(/^#\/?/,'')==='inspect'&&!document.getElementById('modal'))openScanner(submitSn)},350)}else if(cur)paint()}

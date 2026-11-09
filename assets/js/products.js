import {S,save,getP,getL,getT,createLot,addUnits,addEvent,lotStats,unitBySn} from './store.js';
import {ACT,IN,ic,refresh,modal,closeModal,toast,chipV,go} from './ui.js';
import {esc,fNum,fDate,fDT,fTime,uid} from './util.js';
import {code128,qrSvg} from './barcode.js';
export const title='สินค้า & Serial';
let tab=sessionStorage.getItem('cdq.ptab')||'lots',q='',fs='all';
ACT.pTab=el=>{tab=el.dataset.v;sessionStorage.setItem('cdq.ptab',tab);refresh()};
IN.pq=el=>{q=el.value;refresh(true)};ACT.pFs=el=>{fs=el.dataset.v;refresh()};
const optP=sel=>S.products.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${esc(p.name)} (${esc(p.sku)})</option>`).join('');
/* ---------- ลงทะเบียนสินค้า ---------- */
ACT.pNew=(el)=>{const p=el&&el.dataset.id?getP(el.dataset.id):null;
  modal(`<h2>${p?'แก้ไขสินค้า':'ลงทะเบียนสินค้าใหม่'}</h2><form id="pf"><div class="frow"><div class="f"><label>รหัสสินค้า (SKU)</label><input class="in mono" name="sku" required maxlength="14" value="${esc(p?.sku||'')}" placeholder="เช่น HG-40" autofocus ${p?'readonly':''}></div>
  <div class="f"><label>หน่วยนับ</label><input class="in" name="unit" value="${esc(p?.unit||'ชิ้น')}"></div></div>
  <div class="f"><label>ชื่อสินค้า</label><input class="in" name="name" required value="${esc(p?.name||'')}" placeholder="เช่น บานพับเหล็ก 40 มม."></div>
  <div class="frow"><div class="f"><label>หมวดหมู่</label><input class="in" name="category" value="${esc(p?.category||'')}" placeholder="โลหะ / บรรจุภัณฑ์ / …"></div>
  <div class="f"><label>แม่แบบการตรวจ (QC Plan)</label><select class="in" name="templateId">${S.templates.map(t=>`<option value="${t.id}" ${p&&p.templateId===t.id?'selected':''}>${esc(t.name)} (${t.items.length} หัวข้อ)</option>`).join('')}<option value="__new">➕ สร้างแม่แบบใหม่…</option></select></div></div>
  <div class="acts"><button type="button" class="btn" data-act="mClose">ยกเลิก</button><button class="btn pri">${p?'บันทึก':'ลงทะเบียน'}</button></div></form>`);
  document.getElementById('pf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    if(!p&&S.products.some(x=>x.sku.toLowerCase()===f.sku.trim().toLowerCase()))return toast('รหัสสินค้านี้มีอยู่แล้ว');
    if(f.templateId==='__new'){const t={id:uid('t'),name:'แม่แบบ '+f.name,items:[{id:'i1',label:'ตรวจรูปลักษณ์ภายนอก',type:'check'}]};S.templates.push(t);f.templateId=t.id}
    if(p){Object.assign(p,{name:f.name.trim(),category:f.category.trim(),unit:f.unit.trim()||'ชิ้น',templateId:f.templateId})}
    else S.products.push({id:uid('p'),sku:f.sku.trim().toUpperCase(),name:f.name.trim(),category:f.category.trim(),unit:f.unit.trim()||'ชิ้น',templateId:f.templateId,ts:Date.now()});
    save();closeModal();toast(p?'บันทึกแล้ว':'ลงทะเบียนสินค้าแล้ว — เปิดล็อตเพื่อสร้าง Serial ต่อได้เลย');tab='products';refresh()}};
ACT.mClose=()=>closeModal();
/* ---------- เปิดล็อต + สร้าง serial ---------- */
ACT.lotNew=(el)=>{if(!S.products.length)return toast('ลงทะเบียนสินค้าก่อน');const s=S.settings;
  modal(`<h2>เปิดล็อตผลิต + สร้าง Serial</h2><form id="lf"><div class="f"><label>สินค้า</label><select class="in" name="productId">${optP(el?.dataset.p)}</select></div>
  <div class="frow"><div class="f"><label>จำนวนที่ผลิต</label><input class="in mono" name="qty" type="number" min="1" max="500" value="20" required inputmode="numeric"></div>
  <div class="f"><label>ไลน์ผลิต</label><select class="in" name="line">${s.lines.map(l=>`<option>${esc(l)}</option>`).join('')}</select></div></div>
  <div class="frow"><div class="f"><label>กะ</label><select class="in" name="shift"><option>A</option><option>B</option><option>C</option></select></div>
  <div class="f"><label>ผู้ผลิต/หัวหน้าไลน์</label><select class="in" name="operator">${s.operators.map(l=>`<option>${esc(l)}</option>`).join('')}</select></div></div>
  <p class="mut" style="margin:0 0 4px;font-size:.88rem">ระบบจะสร้างเลข Serial อัตโนมัติ (เช่น <span class="mono">HG-40-2611-00001</span>) พร้อมพิมพ์ป้ายบาร์โค้ด/QR ได้</p>
  <div class="acts"><button type="button" class="btn" data-act="mClose">ยกเลิก</button><button class="btn pri">${ic('plus')} สร้างล็อต</button></div></form>`);
  document.getElementById('lf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const qty=Math.min(500,Math.max(1,+f.qty||1));
    const lot=createLot({...f,qty});save();closeModal();tab='lots';refresh();
    modal(`<h2>✅ สร้างล็อต ${esc(lot.lotNo)} แล้ว</h2><p>สร้าง Serial ${qty} รายการ · ${esc(getP(lot.productId).name)}</p><div class="acts"><button class="btn" data-act="mClose">ปิด</button><button class="btn" data-act="lotInsp" data-id="${lot.id}">${ic('scan')} ไปตรวจชิ้นแรก</button><button class="btn pri" data-act="printLot" data-id="${lot.id}">${ic('print')} พิมพ์ป้าย Serial</button></div>`)}};
ACT.lotInsp=el=>{closeModal();const u=S.units.find(u=>u.lotId===el.dataset.id&&u.status==='new');go('/inspect'+(u?'/'+encodeURIComponent(u.sn):''))};
/* ---------- เพิ่ม serial เอง ---------- */
ACT.snAdd=()=>{const open=S.lots.slice().sort((a,b)=>b.ts-a.ts).slice(0,30);if(!open.length)return toast('ยังไม่มีล็อต');
  modal(`<h2>เพิ่ม Serial ที่มีอยู่แล้ว</h2><p class="mut" style="margin:0 0 10px">วาง Serial ที่ติดป้ายไว้แล้ว (หนึ่งบรรทัดต่อหนึ่งรายการ) หรือยิงบาร์โค้ดต่อเนื่อง</p><form id="sf"><div class="f"><label>ล็อต</label><select class="in" name="lot">${open.map(l=>`<option value="${l.id}">${esc(l.lotNo)} · ${esc(getP(l.productId)?.name)}</option>`).join('')}</select></div><div class="f"><label>Serial Numbers</label><textarea class="in mono" name="sns" rows="6" placeholder="SN-0001&#10;SN-0002" autofocus></textarea></div><div class="acts"><button type="button" class="btn" data-act="mClose">ยกเลิก</button><button class="btn pri">เพิ่ม</button></div></form>`);
  document.getElementById('sf').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),n=addUnits({lotId:f.lot,sns:f.sns.split(/\r?\n|,|;/)});save();closeModal();toast(n?`เพิ่ม ${n} Serial แล้ว`:'ไม่มี Serial ใหม่ (อาจซ้ำ)');refresh()}};
/* ---------- พิมพ์ป้าย ---------- */
export function printLabels(units){const html=units.map(u=>{const p=getP(u.productId);return`<div class="lab"><b>${esc(p?.name||'')}</b><div class="t"><div style="flex:1">${code128(u.sn,{h:40})}<small>${esc(u.sn)}</small></div><div class="q">${qrSvg(u.sn)}</div></div><small>${esc(S.settings.company)} · ล็อต ${esc(getL(u.lotId)?.lotNo||'')}</small></div>`}).join('');
  document.getElementById('print').innerHTML=`<h3 style="font-family:var(--font)">ป้าย Serial (${units.length})</h3>`+html;setTimeout(()=>window.print(),120)}
ACT.printLot=el=>{closeModal();printLabels(S.units.filter(u=>u.lotId===el.dataset.id))};
ACT.printSn=el=>printLabels([unitBySn(el.dataset.sn)]);
ACT.printFiltered=()=>{const l=filtered();if(!l.length)return;if(l.length>240)return toast('พิมพ์ได้ครั้งละไม่เกิน 240 ป้าย — กรองให้แคบลง');printLabels(l)};
const filtered=()=>S.units.filter(u=>(fs==='all'||u.status===fs)&&(!q||u.sn.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>b.ts-a.ts||b.sn.localeCompare(a.sn));
/* ---------- render ---------- */
export function render(){
  const tabs=[['lots','ล็อตผลิต',S.lots.length],['products','สินค้า',S.products.length],['serials','Serial ทั้งหมด',S.units.length]];
  let body='';
  if(tab==='products'){body=S.products.length?`<div class="grid g3">${S.products.map(p=>{const t=getT(p.templateId),us=S.units.filter(u=>u.productId===p.id),pass=us.filter(u=>u.status==='pass').length,ins=us.filter(u=>u.status!=='new').length;
    return`<div class="card"><div class="ch-h"><span class="dot">${ic('box')}</span><div><h2 style="margin:0">${esc(p.name)}</h2><small class="mono">${esc(p.sku)} · ${esc(p.category||'—')}</small></div></div>
    <div class="kv" style="margin:14px 0"><div><small>Serial</small><b>${fNum(us.length)}</b></div><div><small>ผ่านแล้ว</small><b class="okc">${fNum(pass)}</b></div><div><small>หัวข้อตรวจ</small><b>${t?t.items.length:0}</b></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm pri" data-act="lotNew" data-p="${p.id}">${ic('plus')} เปิดล็อต</button><button class="btn sm" data-act="pNew" data-id="${p.id}">${ic('edit')} แก้ไข</button></div></div>`}).join('')}</div>`:`<div class="card empty"><div class="big">📦</div><h2>ยังไม่มีสินค้า</h2><p>เริ่มจากลงทะเบียนสินค้าตัวแรกของโรงงาน</p></div>`}
  else if(tab==='lots'){const rows=[...S.lots].sort((a,b)=>b.ts-a.ts);body=`<div class="card"><div class="tw"><table class="tbl"><thead><tr><th>ล็อต</th><th>สินค้า</th><th>วันที่</th><th>ไลน์/กะ</th><th class="r">จำนวน</th><th class="r">ตรวจแล้ว</th><th class="r">ผ่าน</th><th class="r">ไม่ผ่าน</th><th></th></tr></thead><tbody>
    ${rows.map(l=>{const s=lotStats(l);return`<tr data-go="#/trace/${encodeURIComponent(l.lotNo)}"><td class="mono"><b>${esc(l.lotNo)}</b></td><td>${esc(getP(l.productId)?.name)}</td><td>${fDate(l.ts)}</td><td>${esc(l.line)} · ${esc(l.shift)}</td><td class="r mono">${s.units}</td><td class="r mono">${s.inspected}</td><td class="r mono okc">${s.pass}</td><td class="r mono ${s.fail+s.scrap?'badc':''}">${s.fail+s.scrap}</td><td class="r"><button class="btn sm" data-act="printLot" data-id="${l.id}" title="พิมพ์ป้าย" onclick="event.stopPropagation()">${ic('print')}</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-s">ยังไม่มีล็อตผลิต</td></tr>'}</tbody></table></div></div>`}
  else{const l=filtered();body=`<div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center"><div class="gs" style="width:min(320px,100%)">${ic('search')}<input id="pq" data-in="pq" placeholder="ค้นหา Serial…" value="${esc(q)}" autocomplete="off"></div>
    <div class="seg">${[['all','ทั้งหมด'],['new','รอตรวจ'],['pass','ผ่าน'],['fail','ไม่ผ่าน'],['scrap','Scrap']].map(([v,t])=>`<button class="${fs===v?'on':''}" data-act="pFs" data-v="${v}">${t}</button>`).join('')}</div><span class="mut" style="flex:1">${fNum(l.length)} รายการ</span><button class="btn sm" data-act="snAdd">${ic('plus')} เพิ่ม Serial</button><button class="btn sm" data-act="printFiltered">${ic('print')} พิมพ์ป้าย</button></div>
    <div class="tw"><table class="tbl"><thead><tr><th>Serial</th><th>สินค้า</th><th>ล็อต</th><th>วันที่</th><th>สถานะ</th></tr></thead><tbody>${l.slice(0,100).map(u=>`<tr data-go="#/trace/${encodeURIComponent(u.sn)}"><td class="mono"><b>${esc(u.sn)}</b></td><td>${esc(getP(u.productId)?.name)}</td><td class="mono">${esc(getL(u.lotId)?.lotNo||'')}</td><td>${fDate(u.ts)}</td><td>${chipV(u.status)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty-s">ไม่พบ</td></tr>'}</tbody></table></div>${l.length>100?`<p class="mut" style="text-align:center;margin:10px 0 0">แสดง 100 รายการแรก — ใช้ช่องค้นหาเพื่อกรอง</p>`:''}</div>`}
  return`<div class="ph"><div><h1>ลงทะเบียนสินค้า & Serial</h1><p>สินค้า → ล็อตผลิต → Serial Number พร้อมป้ายบาร์โค้ด/QR</p></div><div class="sp"></div><button class="btn" data-act="pNew">${ic('plus')} สินค้าใหม่</button><button class="btn pri" data-act="lotNew">${ic('layers')} เปิดล็อต / สร้าง Serial</button></div>
  <div class="seg" style="margin-bottom:16px">${tabs.map(([v,t,n])=>`<button class="${tab===v?'on':''}" data-act="pTab" data-v="${v}">${t} <span class="mono" style="opacity:.6">${n}</span></button>`).join('')}</div>${body}`}

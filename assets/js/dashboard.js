import {S,inRange,statsOf,groupBy,pareto,lotStats,getP,getL,defName} from './store.js';
import {ACT,ic,refresh,chipV} from './ui.js';
import {esc,fNum,fPct,fDate,fTime,startOfDay,DAY} from './util.js';
import * as C from './charts.js';
let range=sessionStorage.getItem('cdq.range')||'7';
ACT.dRange=el=>{range=el.dataset.v;sessionStorage.setItem('cdq.range',range);refresh()};
const rangeFrom=()=>startOfDay(Date.now()-(range==='1'?0:range==='7'?6:29)*DAY);
export const title='ภาพรวม';
export function render(){
  const now=Date.now(),from=rangeFrom(),ins=inRange(from),st=statsOf(ins),tgt=S.settings.target||95;
  const lots=S.lots.filter(l=>l.ts>=from),units=S.units.filter(u=>u.ts>=from),waiting=S.units.filter(u=>u.status==='new').length;
  const days=14,dl=[],dv=[],dn=[];for(let i=days-1;i>=0;i--){const a=startOfDay(now-i*DAY),s=statsOf(inRange(a,a+DAY));dl.push(fDate(a));dv.push(s.total?+s.rate.toFixed(1):null);dn.push(s.total)}
  const prev=statsOf(inRange(from-(now-from+DAY),from));const dRate=prev.total?st.rate-prev.rate:null;
  /* by product / line */
  const byP=[...groupBy(ins,i=>i.productId)].map(([k,v])=>{const s=statsOf(v);return{label:getP(k)?.name||k,pass:s.pass,fail:s.fail}});
  const byL=[...groupBy(ins,i=>getL(i.lotId)?.line||'—')].map(([k,v])=>{const s=statsOf(v);return{label:k,pass:s.pass,fail:s.fail}}).sort((a,b)=>a.label.localeCompare(b.label));
  /* alerts */
  const alerts=[];if(st.total>=10&&st.rate<tgt)alerts.push(`อัตราผ่านช่วงนี้ ${fNum(st.rate,1)}% ต่ำกว่าเป้า ${tgt}%`);
  S.lots.filter(l=>l.ts>=now-3*DAY).forEach(l=>{const ls=lotStats(l);const done=ls.pass+ls.fail+ls.scrap;if(done>=8){const y=ls.firstPass/Math.max(ls.inspected,1)*100;if(y<tgt-4)alerts.push(`ล็อต ${l.lotNo} (${getP(l.productId)?.name}) ผ่านครั้งแรกเพียง ${fNum(y,1)}%`)}});
  const recent=[...S.inspections].sort((a,b)=>b.ts-a.ts).slice(0,7),lotRows=[...S.lots].sort((a,b)=>b.ts-a.ts).slice(0,6);
  const rLabel={1:'วันนี้',7:'7 วัน',30:'30 วัน'}[range];
  return`<div class="ph"><div><h1>ภาพรวมการผลิตและคุณภาพ</h1><p>${esc(S.settings.plant)} · ข้อมูล${rLabel==='วันนี้'?'วันนี้':'ย้อนหลัง '+rLabel}</p></div><div class="sp"></div>
    <div class="seg" role="tablist">${[['1','วันนี้'],['7','7 วัน'],['30','30 วัน']].map(([v,t])=>`<button class="${range===v?'on':''}" data-act="dRange" data-v="${v}">${t}</button>`).join('')}</div>
    <a class="btn pri" href="#/inspect">${ic('scan')} เริ่มตรวจสินค้า</a></div>
    ${alerts.length?`<div class="card" style="border-color:color-mix(in srgb,var(--bad) 40%,var(--line));background:var(--badb);margin-bottom:16px;display:flex;gap:12px;align-items:flex-start"><span class="badc" style="font-size:1.3rem">${ic('alert')}</span><div><b class="badc">แจ้งเตือนคุณภาพ</b>${alerts.slice(0,3).map(a=>`<div>${esc(a)}</div>`).join('')}</div></div>`:''}
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card kpi"><div class="l">ตรวจแล้ว</div><div class="v">${fNum(st.total)}</div><div class="s">${fNum(units.length)} ชิ้นที่ผลิต · ${lots.length} ล็อต</div><span class="sp">${C.spark(dn)}</span></div>
      <div class="card kpi ${st.total&&st.rate>=tgt?'ok':st.total?'bad':''}"><div class="l">อัตราผ่าน</div><div class="v">${st.total?fNum(st.rate,1)+'%':'—'}</div><div class="s">เป้า ${tgt}%${dRate!=null?` · <span class="${dRate>=0?'okc':'badc'}">${dRate>=0?'▲':'▼'} ${fNum(Math.abs(dRate),1)} จุด</span>`:''}</div></div>
      <div class="card kpi ${st.fail?'bad':''}"><div class="l">ไม่ผ่าน (FAIL)</div><div class="v">${fNum(st.fail)}</div><div class="s">${st.total?fNum(st.fail/st.total*100,1)+'% ของที่ตรวจ':'—'}</div></div>
      <div class="card kpi"><div class="l">รอตรวจ</div><div class="v">${fNum(waiting)}</div><div class="s">ชิ้นที่ลงทะเบียนแล้วแต่ยังไม่ตรวจ</div></div></div>
    <div class="grid g21" style="margin-bottom:16px"><div class="card"><div class="ch-h"><h2>แนวโน้มอัตราผ่าน 14 วัน</h2><span class="sp"></span><small>เส้นประ = เป้าหมาย</small></div>${C.line(dl,[{vals:dv,color:'var(--accent)'}],{target:tgt,unit:'%',fmt:v=>fNum(v,0),h:210,max:100})}</div>
      <div class="card"><h2>สัดส่วนผลตรวจ</h2><div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center">${C.donut([{v:st.pass,color:'var(--ok)'},{v:st.fail,color:'var(--bad)'}],{center:st.total?fNum(st.rate,1)+'%':'—',sub:'ผ่าน',size:150})}
      <div class="legend" style="flex-direction:column"><span><i style="background:var(--ok)"></i>ผ่าน ${fNum(st.pass)}</span><span><i style="background:var(--bad)"></i>ไม่ผ่าน ${fNum(st.fail)}</span></div></div></div></div>
    <div class="grid g3" style="margin-bottom:16px"><div class="card"><h2>อัตราผ่านตามสินค้า</h2>${byP.length?C.passBars(byP,tgt):'<div class="empty-s">ยังไม่มีข้อมูล</div>'}</div>
      <div class="card"><h2>อัตราผ่านตามไลน์ผลิต</h2>${byL.length?C.passBars(byL,tgt):'<div class="empty-s">ยังไม่มีข้อมูล</div>'}</div>
      <div class="card"><h2>ของเสียหลัก (Pareto)</h2>${C.pareto(pareto(ins))}</div></div>
    <div class="grid g21"><div class="card"><div class="ch-h"><h2>ล็อตผลิตล่าสุด</h2><span class="sp"></span><a class="btn sm" href="#/products">ดูทั้งหมด</a></div><div class="tw"><table class="tbl"><thead><tr><th>ล็อต</th><th>สินค้า</th><th>ไลน์</th><th class="r">จำนวน</th><th>ความคืบหน้า</th><th class="r">ผ่านครั้งแรก</th></tr></thead><tbody>
      ${lotRows.map(l=>{const s=lotStats(l),pr=s.units?s.inspected/s.units*100:0;return`<tr data-go="#/trace/${encodeURIComponent(l.lotNo)}"><td class="mono">${esc(l.lotNo)}</td><td>${esc(getP(l.productId)?.name)}</td><td>${esc(l.line)}</td><td class="r mono">${s.units}</td><td style="min-width:110px"><div class="pb-t" style="height:8px"><i class="ok" style="width:${pr}%;background:var(--info)"></i></div></td><td class="r mono ${s.inspected&&s.firstPass/s.inspected*100<tgt?'badc':'okc'}">${s.inspected?fNum(s.firstPass/s.inspected*100,0)+'%':'—'}</td></tr>`}).join('')}</tbody></table></div></div>
      <div class="card"><div class="ch-h"><h2>ตรวจล่าสุด</h2></div><div class="rows">${recent.map(i=>`<a class="row" href="#/trace/${encodeURIComponent(i.sn)}"><span class="dot ${i.verdict==='PASS'?'ok':'bad'}">${ic(i.verdict==='PASS'?'check':'x')}</span><div class="m"><b class="mono">${esc(i.sn)}</b><small>${fDate(i.ts)} ${fTime(i.ts)}${i.defect?' · '+esc(defName(i.defect)):''}</small></div>${chipV(i.verdict)}</a>`).join('')||'<div class="empty-s">ยังไม่มีการตรวจ</div>'}</div></div></div>`}

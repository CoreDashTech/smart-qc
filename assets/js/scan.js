import {modal,closeModal,toast,ACT,ic} from './ui.js';
let stream=null,raf=0,live=false;
/* ดึงรหัส/Serial จากข้อความที่สแกนได้ — รองรับ QR ภายนอก: ข้อความล้วน, "SN:xxx", URL ที่มี ?sn=, JSON {"sn":..} และ URL ของแอปนี้ (#/trace/SN) */
export function parseScan(t){t=String(t||'').trim();if(!t)return'';
  const m=t.match(/#\/(?:trace|inspect)\/([^/?\s]+)/);if(m)return decodeURIComponent(m[1]);
  if(t[0]==='{'){try{const o=JSON.parse(t);for(const k of ['sn','SN','serial','Serial','serialNumber','id','ID','code'])if(o[k]!=null&&String(o[k]).trim())return String(o[k]).trim()}catch(e){}}
  if(/^https?:\/\//i.test(t)){try{const u=new URL(t);for(const k of ['sn','serial','serialNumber','id','code','s'])if(u.searchParams.get(k))return u.searchParams.get(k).trim()}catch(e){}}
  const p=t.match(/^(?:s\/?n|serial(?:\s*(?:no|number))?)\s*[:=#]\s*(.+)$/i);if(p)return p[1].trim();
  return t.replace(/[\r\n]+/g,' ').slice(0,120)}
export function stopScan(){live=false;cancelAnimationFrame(raf);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
const wk=document.createElement('canvas'),wx=wk.getContext('2d',{willReadFrequently:true});
/* ถอดรหัสจากส่วนหนึ่งของภาพ (ความละเอียดเต็มของส่วนนั้น) */
function qrAt(src,sx,sy,sw,sh,maxW){const k=Math.min(1,maxW/sw);wk.width=Math.max(1,Math.round(sw*k));wk.height=Math.max(1,Math.round(sh*k));wx.drawImage(src,sx,sy,sw,sh,0,0,wk.width,wk.height);
  const d=wx.getImageData(0,0,wk.width,wk.height),q=window.jsQR&&jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});return q&&q.data?q.data:''}
const crop=(w,h,f)=>[w*(1-f)/2,h*(1-f)/2,w*f,h*f];
/* หลายกลยุทธ์: ตัดกลางภาพเต็มความละเอียด (QR เล็ก) / ทั้งภาพ / ซูมกลาง — pass = 0..2 */
export function decodePass(src,w,h,pass){const f=[.6,1,.4][pass%3],[x,y,cw,ch]=crop(w,h,f);return qrAt(src,x,y,cw,ch,pass%3===1?960:1400)}
/* ถอดรหัสจากรูปถ่ายนิ่ง (ชัดกว่าวิดีโอ) ลองหลายส่วน */
export async function decodePhoto(file){const bm=await createImageBitmap(file),w=bm.width,h=bm.height;
  if('BarcodeDetector' in window){try{const r=await new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13']}).detect(bm);if(r.length)return r[0].rawValue}catch(e){}}
  for(const f of [1,.7,.5,.35]){const [x,y,cw,ch]=crop(w,h,f);const v=qrAt(bm,x,y,cw,ch,2000);if(v)return v}
  for(const [ox,oy] of [[0,0],[.5,0],[0,.5],[.5,.5]]){const v=qrAt(bm,w*ox,h*oy,w*.5,h*.5,1600);if(v)return v}return''}
export async function openScanner(onResult){
  if(!navigator.mediaDevices?.getUserMedia)return toast('เบราว์เซอร์นี้ไม่รองรับกล้อง — ต้องเปิดผ่าน https (เช่น GitHub Pages)',4500);
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false})}catch(e){return toast('เปิดกล้องไม่ได้ — กรุณาอนุญาตการใช้กล้อง แล้วลองใหม่',4500)}
  const tr=stream.getVideoTracks()[0];let caps={};try{caps=tr.getCapabilities?.()||{};if(caps.focusMode?.includes('continuous'))await tr.applyConstraints({advanced:[{focusMode:'continuous'}]})}catch(e){}
  const mob=matchMedia('(max-width:700px)').matches,zr0=caps.zoom?`<div class="scz"><span>ซูม</span><input id="scz" type="range" min="${caps.zoom.min}" max="${caps.zoom.max}" step="${caps.zoom.step||.1}" value="${caps.zoom.min}"></div>`:'';
  const tips='เล็งให้ QR อยู่ในกรอบ ถือห่าง 15–25 ซม. ให้ภาพชัด ไม่สะท้อนแสง',pick=(cap)=>`<input type="file" accept="image/*" ${cap?'capture="environment"':''} hidden class="scph">`;
  if(mob){modal(`<div class="scm"><video id="cv" playsinline muted autoplay></video><div class="scg"></div><div class="sct"><b>สแกน QR / บาร์โค้ด</b><button class="btn sm" data-act="scanStop">✕ ปิด</button></div><div class="scb"><p id="scmsg">${tips}</p>${zr0}<div class="scbtn">${caps.torch?`<button class="btn" id="sctr" type="button">🔦 ไฟฉาย</button>`:''}<label class="btn">🖼 เลือกจากแกลเลอรี${pick(false)}</label><label class="btn">${ic('camera')} ถ่ายรูป${pick(true)}</label></div></div></div>`);document.getElementById('modal').classList.add('sc')}
  else modal(`<h2>สแกน QR / บาร์โค้ด</h2><div style="position:relative;border-radius:16px;overflow:hidden;background:#000"><video id="cv" playsinline muted autoplay style="width:100%;display:block;max-height:60vh;object-fit:cover"></video><div style="position:absolute;inset:18% 12%;border:3px solid var(--accent);border-radius:16px;box-shadow:0 0 0 999px rgba(0,0,0,.4)"></div></div>${zr0.replace('class="scz"','style="margin-top:10px;display:flex;gap:10px;align-items:center"')}<p class="mut" id="scmsg" style="font-size:.85rem;margin:10px 0 0">${tips}</p><div class="acts"><label class="btn" style="cursor:pointer">🖼 เลือกรูป${pick(false)}</label><label class="btn" style="cursor:pointer">${ic('camera')} ถ่ายรูป${pick(true)}</label><button class="btn" data-act="scanStop">ปิดกล้อง</button></div>`);
  const v=document.getElementById('cv');v.srcObject=stream;try{await v.play()}catch(e){}
  const zr=document.getElementById('scz');if(zr)zr.oninput=()=>tr.applyConstraints({advanced:[{zoom:+zr.value}]}).catch(()=>{});
  const done=val=>{stopScan();closeModal();if(navigator.vibrate)navigator.vibrate(60);onResult(parseScan(val))};
  const tb=document.getElementById('sctr');if(tb){let on=false;tb.onclick=()=>{on=!on;tr.applyConstraints({advanced:[{torch:on}]}).catch(()=>{});tb.style.outline=on?'3px solid var(--accent)':''}}
  document.querySelectorAll('.scph').forEach(inp=>inp.onchange=async e=>{const f=e.target.files[0];if(!f)return;document.getElementById('scmsg').textContent='กำลังอ่านรูป…';try{const r=await decodePhoto(f);if(r)done(r);else document.getElementById('scmsg').textContent='อ่านจากรูปไม่ได้ — ลองถ่ายใกล้ขึ้น ให้ QR เต็มภาพ และชัด'}catch(err){document.getElementById('scmsg').textContent='อ่านรูปไม่ได้'}});
  let det=null;if('BarcodeDetector' in window){try{det=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a']})}catch(e){det=null}}
  if(!det&&typeof window.jsQR!=='function')document.getElementById('scmsg').textContent='ไม่มีตัวอ่านโค้ดในเครื่องนี้ — ใช้ปุ่มถ่ายรูป หรือพิมพ์ Serial แทน';
  live=true;let last=0,n=0;
  const tick=async t=>{if(!live)return;raf=requestAnimationFrame(tick);if(t-last<120||v.readyState<2)return;last=t;
    try{if(det){const r=await det.detect(v);if(r.length&&live)return done(r[0].rawValue)}
      if(window.jsQR&&v.videoWidth){const q=decodePass(v,v.videoWidth,v.videoHeight,n++);if(q&&live)done(q)}}catch(e){}};
  raf=requestAnimationFrame(tick)}
ACT.scanStop=()=>{try{sessionStorage.removeItem('cdq.cont')}catch(e){}stopScan();closeModal()};

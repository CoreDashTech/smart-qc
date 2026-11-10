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
const tick0=()=>new Promise(r=>setTimeout(r,0));
/* ถอดรหัสจากรูปถ่ายนิ่ง (ชัดกว่าวิดีโอมาก): ลองทั้งภาพ แล้วไล่ตัดเป็นช่องเล็กๆ ที่ความละเอียดจริง เผื่อ QR เล็กในภาพใหญ่ */
export async function decodePhoto(file,onProg){const bm=await createImageBitmap(file),w=bm.width,h=bm.height;
  if('BarcodeDetector' in window){try{const r=await new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13']}).detect(bm);if(r.length)return r[0].rawValue}catch(e){}}
  for(const m of [1600,2600]){const v=qrAt(bm,0,0,w,h,m);if(v)return v;await tick0()}
  for(const f of [.7,.5,.35]){const [x,y,cw,ch]=crop(w,h,f);const v=qrAt(bm,x,y,cw,ch,2000);if(v)return v;await tick0()}
  for(const f of [.5,.33,.22]){const tw=w*f,th=h*f,sx=tw/2,sy=th/2;let n=0;
    for(let y=0;y+th<=h+1;y+=sy)for(let x=0;x+tw<=w+1;x+=sx){const v=qrAt(bm,x,y,tw,th,1400);if(v)return v;if(++n%6===0){if(onProg)onProg();await tick0()}}}
  return''}
const pickBtns=()=>`<label class="btn pri" style="cursor:pointer">${ic('camera')} ถ่ายรูป QR<input type="file" accept="image/*" capture="environment" hidden class="scph"></label><label class="btn" style="cursor:pointer">🖼 เลือกจากแกลเลอรี<input type="file" accept="image/*" hidden class="scph"></label>`;
function bindPick(root,msgEl,done){root.querySelectorAll('.scph').forEach(inp=>inp.onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let dots=0;msgEl.textContent='กำลังอ่านรูป…';
  try{const r=await decodePhoto(f,()=>{msgEl.textContent='กำลังอ่านรูป'+'.'.repeat(1+(dots++%3))});if(r)done(r);else msgEl.textContent='อ่านจากรูปไม่ได้ — ถ่ายใหม่โดยให้ QR อยู่กลางภาพ ใหญ่ขึ้น (ห่าง 10–15 ซม.) รอให้โฟกัสชัดก่อนกดถ่าย และไม่ให้มีแสงสะท้อน'}catch(err){msgEl.textContent='อ่านรูปไม่ได้'}})}
function camFail(e,onResult){const n=e&&e.name||'';
  const why=!navigator.mediaDevices?.getUserMedia?'ต้องเปิดเว็บผ่าน https (เช่น GitHub Pages) จึงจะใช้กล้องสดได้':n==='NotFoundError'?'ไม่พบกล้องในเครื่องนี้':n==='NotReadableError'?'กล้องถูกใช้โดยแอปอื่นอยู่ — ปิดแอปอื่นแล้วลองใหม่':'ยังไม่ได้อนุญาตให้เว็บนี้ใช้กล้อง';
  modal(`<h2>เปิดกล้องสดไม่ได้</h2><p class="mut" style="margin:0 0 10px">${why}</p><p style="margin:0 0 6px"><b>ใช้ได้ทันที ไม่ต้องอนุญาต:</b> กดถ่ายรูป QR → เปิดกล้องมือถือ (ชัดกว่าและอ่านง่ายกว่า) หรือเลือกรูปที่ถ่ายไว้</p><div class="acts" style="flex-wrap:wrap;justify-content:flex-start">${pickBtns()}</div><p class="mut" id="scmsg" style="font-size:.85rem;margin:10px 0 0"></p>
  <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">วิธีอนุญาตกล้อง (Android)</summary><ol class="mut" style="font-size:.85rem;padding-left:20px;margin:8px 0 0"><li>แตะไอคอนแม่กุญแจ/ตั้งค่าข้างชื่อเว็บ (หรือ ⋮ → ข้อมูลเว็บไซต์)</li><li>เลือก <b>สิทธิ์ / Permissions → กล้อง → อนุญาต</b></li><li>ถ้าเปิดจากไอคอนแอปที่ติดตั้ง: กดค้างที่ไอคอน → ข้อมูลแอป → สิทธิ์ → กล้อง → อนุญาต</li><li>กลับมาที่แอปแล้วกดสแกนใหม่</li></ol></details><div class="acts"><button class="btn" data-act="scanStop">ปิด</button></div>`);
  const m=document.getElementById('modal');bindPick(m,document.getElementById('scmsg'),val=>{closeModal();if(navigator.vibrate)navigator.vibrate(60);onResult(parseScan(val))})}
export async function openScanner(onResult){
  try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('nomd');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false})}catch(e){return camFail(e,onResult)}
  const tr=stream.getVideoTracks()[0];let caps={};try{caps=tr.getCapabilities?.()||{};if(caps.focusMode?.includes('continuous'))await tr.applyConstraints({advanced:[{focusMode:'continuous'}]})}catch(e){}
  const mob=matchMedia('(max-width:700px)').matches,zr0=caps.zoom?`<div class="scz"><span>ซูม</span><input id="scz" type="range" min="${caps.zoom.min}" max="${caps.zoom.max}" step="${caps.zoom.step||.1}" value="${caps.zoom.min}"></div>`:'';
  const tips='เล็งให้ QR อยู่ในกรอบ ถือห่าง 10–20 ซม. รอให้ภาพชัด ไม่สะท้อนแสง';
  if(mob){modal(`<div class="scm"><video id="cv" playsinline muted autoplay></video><div class="scg"></div><div class="sct"><b>สแกน QR / บาร์โค้ด</b><button class="btn sm" data-act="scanStop">✕ ปิด</button></div><div class="scb"><p id="scmsg">${tips}</p>${zr0}<div class="scbtn">${caps.torch?`<button class="btn" id="sctr" type="button">🔦 ไฟฉาย</button>`:''}${pickBtns()}</div></div></div>`);document.getElementById('modal').classList.add('sc')}
  else modal(`<h2>สแกน QR / บาร์โค้ด</h2><div style="position:relative;border-radius:16px;overflow:hidden;background:#000"><video id="cv" playsinline muted autoplay style="width:100%;display:block;max-height:60vh;object-fit:cover"></video><div style="position:absolute;inset:18% 12%;border:3px solid var(--accent);border-radius:16px;box-shadow:0 0 0 999px rgba(0,0,0,.4)"></div></div>${zr0.replace('class="scz"','style="margin-top:10px;display:flex;gap:10px;align-items:center"')}<p class="mut" id="scmsg" style="font-size:.85rem;margin:10px 0 0">${tips}</p><div class="acts" style="flex-wrap:wrap">${pickBtns()}<button class="btn" data-act="scanStop">ปิดกล้อง</button></div>`);
  const root=document.getElementById('modal'),v=document.getElementById('cv'),msg=document.getElementById('scmsg');v.srcObject=stream;try{await v.play()}catch(e){}
  const zr=document.getElementById('scz');if(zr)zr.oninput=()=>tr.applyConstraints({advanced:[{zoom:+zr.value}]}).catch(()=>{});
  const tb=document.getElementById('sctr');if(tb){let on=false;tb.onclick=()=>{on=!on;tr.applyConstraints({advanced:[{torch:on}]}).catch(()=>{});tb.style.outline=on?'3px solid var(--accent)':''}}
  const done=val=>{stopScan();closeModal();if(navigator.vibrate)navigator.vibrate(60);onResult(parseScan(val))};
  bindPick(root,msg,done);
  let det=null;if('BarcodeDetector' in window){try{det=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a']})}catch(e){det=null}}
  live=true;let last=0,n=0;const t0=Date.now();let hinted=false;
  const tick=async t=>{if(!live)return;raf=requestAnimationFrame(tick);if(!hinted&&Date.now()-t0>7000){hinted=true;msg.innerHTML='<b>ยังไม่เจอ QR</b> — QR เล็กหรือไม่ชัด ลองกด <b>ถ่ายรูป QR</b> (ใช้กล้องมือถือ ชัดกว่า) ';msg.style.color=mob?'#ffd9a8':''}
    if(t-last<120||v.readyState<2)return;last=t;
    try{if(det){const r=await det.detect(v);if(r.length&&live)return done(r[0].rawValue)}
      if(window.jsQR&&v.videoWidth){const q=decodePass(v,v.videoWidth,v.videoHeight,n++);if(q&&live)done(q)}}catch(e){}};
  raf=requestAnimationFrame(tick)}
ACT.scanStop=()=>{try{sessionStorage.removeItem('cdq.cont')}catch(e){}stopScan();closeModal()};

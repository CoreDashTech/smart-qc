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
export async function openScanner(onResult){
  if(!navigator.mediaDevices?.getUserMedia)return toast('เบราว์เซอร์นี้ไม่รองรับกล้อง — ต้องเปิดผ่าน https (เช่น GitHub Pages)',4500);
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false})}catch(e){return toast('เปิดกล้องไม่ได้ — กรุณาอนุญาตการใช้กล้อง แล้วลองใหม่',4500)}
  modal(`<h2>สแกน QR / บาร์โค้ด</h2><div style="position:relative;border-radius:16px;overflow:hidden;background:#000"><video id="cv" playsinline muted autoplay style="width:100%;display:block;max-height:60vh;object-fit:cover"></video><div style="position:absolute;inset:18% 12%;border:3px solid var(--accent);border-radius:16px;box-shadow:0 0 0 999px rgba(0,0,0,.4)"></div></div><p class="mut" id="scmsg" style="font-size:.85rem;margin:10px 0 0">เล็งให้ QR / บาร์โค้ดอยู่ในกรอบ</p><div class="acts"><button class="btn" data-act="scanStop">ปิดกล้อง</button></div>`);
  const v=document.getElementById('cv');v.srcObject=stream;try{await v.play()}catch(e){}
  const hasBD='BarcodeDetector' in window;let det=null;if(hasBD){try{det=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a']})}catch(e){det=null}}
  if(!det&&typeof window.jsQR!=='function'){document.getElementById('scmsg').textContent='ไม่มีตัวอ่านโค้ดในเครื่องนี้ — พิมพ์ Serial แทน'}
  else if(!det)document.getElementById('scmsg').textContent='โหมดอ่าน QR (บาร์โค้ดเส้นให้ใช้เครื่องยิง หรือพิมพ์ Serial)';
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});live=true;let last=0;
  const done=val=>{stopScan();closeModal();if(navigator.vibrate)navigator.vibrate(60);onResult(parseScan(val))};
  const tick=async t=>{if(!live)return;raf=requestAnimationFrame(tick);if(t-last<140||v.readyState<2)return;last=t;
    try{if(det){const r=await det.detect(v);if(r.length&&live)return done(r[0].rawValue)}
      else if(window.jsQR){const w=v.videoWidth,h=v.videoHeight,k=Math.min(1,640/Math.max(w,h));cv.width=w*k;cv.height=h*k;cx.drawImage(v,0,0,cv.width,cv.height);const d=cx.getImageData(0,0,cv.width,cv.height),q=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});if(q&&q.data&&live)done(q.data)}}catch(e){}};
  raf=requestAnimationFrame(tick)}
ACT.scanStop=()=>{stopScan();closeModal()};

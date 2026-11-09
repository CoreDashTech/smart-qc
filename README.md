# CoreDashTech — CoreDash Smart QC

ระบบตรวจสอบคุณภาพสินค้าและติดตามประวัติการผลิต สำหรับโรงงานขนาดเล็กและ SME
โดย **CoreDash Technology** — เว็บแอป + ติดตั้งบนมือถือได้ (PWA) ไม่ต้องมีเซิร์ฟเวอร์ ข้อมูลเก็บใน Google Sheet ของลูกค้าเอง

## ฟังก์ชัน
| เมนู | ทำอะไรได้ |
|---|---|
| ภาพรวม | ยอดตรวจ / อัตราผ่าน / FAIL / รอตรวจ, แนวโน้ม 14 วัน, Pareto ของเสีย, แจ้งเตือนเมื่ออัตราผ่านต่ำกว่าเป้า |
| สินค้า & Serial | ลงทะเบียนสินค้า, เปิดล็อตผลิต + สร้าง Serial อัตโนมัติ, พิมพ์ป้าย Code128 + QR |
| ตรวจ QC | **สแกน QR ด้วยกล้องมือถือ** / เครื่องยิงบาร์โค้ด / พิมพ์ Serial → เช็กลิสต์ → PASS/FAIL อัตโนมัติ, รหัสของเสีย, รูปถ่าย, ตรวจซ้ำ, Scrap |
| ย้อนรอย | ค้นหา/สแกน Serial หรือล็อต, Genealogy timeline, ประวัติทุกรอบ, ใบรับรองผลตรวจ (พิมพ์/PDF) |
| รายงาน | กรองช่วงเวลา/สินค้า/ไลน์/ผล, กราฟ, FPY, Export Excel / CSV, พิมพ์ PDF |
| ตั้งค่า | ข้อมูลโรงงาน, เป้า %, ไลน์/พนักงาน/ผู้ตรวจ, แก้ QC Plan, ธีมมืด/สว่าง, สำรอง/กู้คืน, **เชื่อม Google Sheet** |

## ติดตั้งขึ้น GitHub Pages (repo ชื่อ `CoreDashTech`)
1. https://github.com/nupinhomeschool → New repository → ชื่อ **CoreDashTech** (Public)
2. อัปโหลด **ทุกไฟล์ในโฟลเดอร์นี้** (ให้ `index.html` อยู่ที่ราก)
3. Settings → Pages → Source: `Deploy from a branch` → `main` / `(root)` → Save
4. รอ 1–2 นาที เปิด `https://nupinhomeschool.github.io/CoreDashTech/`
5. บนมือถือ: เปิดลิงก์ → เมนูเบราว์เซอร์ → **เพิ่มลงหน้าจอหลัก / Install app**
   (กล้องสแกนต้องเปิดผ่าน https เท่านั้น — GitHub Pages ใช้ได้)

## เชื่อม Google Sheet
ดู **[SETUP-GoogleSheet.md](SETUP-GoogleSheet.md)** — โค้ดฝั่ง Sheet อยู่ที่ `google-apps-script/Code.gs`

## ทดสอบในเครื่อง
```
python3 -m http.server 8000   # แล้วเปิด http://localhost:8000  (ต้องใช้ http ไม่ใช่เปิดไฟล์ตรง ๆ)
```

## โครงสร้าง
```
index.html  manifest.webmanifest  sw.js  SETUP-GoogleSheet.md
google-apps-script/Code.gs
assets/app.css  assets/fonts/  assets/icons/
assets/js/  main.js store.js sync.js scan.js dashboard.js products.js inspect.js trace.js reports.js settings.js
            charts.js barcode.js xlsx.js ui.js util.js  + qrcode.js (qrcode-generator, MIT) jsqr.js (jsQR, Apache-2.0)
```
ไม่มี build tool · ฟอนต์ (Noto Sans Thai, Inter, JetBrains Mono — OFL) ฝังในแอป ใช้ออฟไลน์ได้

## ข้อจำกัดปัจจุบัน
- 1 Sheet = 1 โรงงาน ใช้ URL + Token ร่วมกัน (ยังไม่มีบัญชีผู้ใช้/สิทธิ์แยกรายคน)
- Google Apps Script รับได้ราว 20,000 requests/วัน และ Sheet ~10 ล้านเซลล์ — เพียงพอสำหรับ SME หลายพันชิ้นต่อเดือน; ถ้าโตกว่านี้ควรย้ายไปฐานข้อมูลจริง
- บาร์โค้ดเส้น (Code128) บนมือถือสแกนได้เฉพาะเบราว์เซอร์ที่มี BarcodeDetector (Chrome Android) — QR ได้ทุกเครื่อง; เครื่องยิงบาร์โค้ดแบบ keyboard ใช้ได้ทุกกรณี

/**
 * CoreDash Smart QC — Google Sheet backend (Google Apps Script)
 * วิธีใช้: ดูไฟล์ SETUP-GoogleSheet.md
 *
 * 1) ตั้งรหัสลับด้านล่าง (TOKEN) เป็นรหัสของคุณเอง
 * 2) Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone
 */
var TOKEN = 'เปลี่ยนเป็นรหัสลับของคุณ';          // ← แก้ตรงนี้ (ใช้ตัวอักษร/ตัวเลข 12 ตัวขึ้นไป)
var PHOTO_FOLDER = 'CoreDash Smart QC - Photos'; // โฟลเดอร์เก็บรูปถ่ายใน Google Drive
var SHEETS = ['products', 'templates', 'lots', 'units', 'inspections', 'events', 'settings'];
var TITLE = { products: 'สินค้า', templates: 'แม่แบบตรวจ', lots: 'ล็อตผลิต', units: 'Serial', inspections: 'ผลตรวจ', events: 'เหตุการณ์', settings: 'ตั้งค่า' };

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

/** รันครั้งเดียวจากเมนู Run เพื่อสร้างแท็บทั้งหมด + อนุญาตสิทธิ์ */
function setup() {
  SHEETS.forEach(function (n) { sheet_(n, null); });
  folder_();
  var d = ss_().getSheetByName('Sheet1');
  if (d && ss_().getSheets().length > 1 && d.getLastRow() === 0) ss_().deleteSheet(d);
  return 'พร้อมใช้งาน';
}

function sheet_(name, hdr) {
  var s = ss_().getSheetByName(name);
  if (!s) s = ss_().insertSheet(name);
  if (s.getLastRow() === 0) {
    var h = (hdr || []).concat(['_id', '_updated', '_json']);
    s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#17181c').setFontColor('#ffffff');
    s.setFrozenRows(1);
  }
  return s;
}
function folder_() {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function doGet(e) {
  try {
    var p = e.parameter || {};
    if (p.token !== TOKEN) return out_({ ok: false, error: 'รหัสลับ (Token) ไม่ถูกต้อง' });
    if (p.action === 'ping') return out_({ ok: true, name: ss_().getName(), now: Date.now() });
    if (p.action === 'pull') return out_(pull_(Number(p.since || 0)));
    if (p.action === 'getphoto') return out_(getPhoto_(p.id));
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var b = JSON.parse(e.postData.contents);
    if (b.token !== TOKEN) return out_({ ok: false, error: 'รหัสลับ (Token) ไม่ถูกต้อง' });
    if (b.action === 'push') return out_(push_(b));
    if (b.action === 'photo') return out_(putPhoto_(b));
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
  finally { try { lock.releaseLock(); } catch (x) {} }
}

/** upsert แถวตาม _id: แถวใหม่เขียนทีเดียว, แถวเดิมอัปเดตเฉพาะที่เปลี่ยน */
function push_(b) {
  var now = Date.now(), by = {}, n = 0;
  (b.rows || []).forEach(function (r) { (by[r.c] = by[r.c] || []).push(r); });
  Object.keys(by).forEach(function (c) {
    if (SHEETS.indexOf(c) < 0) return;
    var hdr = (b.hdr && b.hdr[c]) || [];
    var s = sheet_(c, hdr), last = s.getLastRow();
    // หาตำแหน่งคอลัมน์ _id จาก header จริง
    var head = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
    var idCol = head.indexOf('_id') + 1, nc = head.length;
    var ids = last > 1 ? s.getRange(2, idCol, last - 1, 1).getValues() : [];
    var idx = {};
    for (var i = 0; i < ids.length; i++) idx[ids[i][0]] = i + 2;
    var fresh = [];
    by[c].forEach(function (r) {
      var row = (r.cols || []).slice(0, nc - 3);
      while (row.length < nc - 3) row.push('');
      row.push(r.k, now, r.j);
      if (idx[r.k]) s.getRange(idx[r.k], 1, 1, nc).setValues([row]);
      else { fresh.push(row); idx[r.k] = -1; }
      n++;
    });
    if (fresh.length) s.getRange(last + 1, 1, fresh.length, nc).setValues(fresh);
  });
  return { ok: true, n: n, now: now };
}

function pull_(since) {
  var now = Date.now(), rows = [];
  SHEETS.forEach(function (c) {
    var s = ss_().getSheetByName(c);
    if (!s || s.getLastRow() < 2) return;
    var nc = s.getLastColumn(), data = s.getRange(2, nc - 2, s.getLastRow() - 1, 3).getValues();
    data.forEach(function (d) { if (Number(d[1]) > since && d[2]) rows.push({ c: c, k: String(d[0]), u: Number(d[1]), j: d[2] }); });
  });
  return { ok: true, rows: rows, now: now };
}

function putPhoto_(b) {
  var m = /^data:(.*?);base64,(.*)$/.exec(b.data || '');
  if (!m) return { ok: false, error: 'bad photo' };
  var f = folder_(), it = f.getFilesByName(b.id + '.jpg');
  if (it.hasNext()) return { ok: true };
  f.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], b.id + '.jpg'));
  return { ok: true };
}
function getPhoto_(id) {
  var it = folder_().getFilesByName(id + '.jpg');
  if (!it.hasNext()) return { ok: true, data: null };
  var f = it.next();
  return { ok: true, data: 'data:image/jpeg;base64,' + Utilities.base64Encode(f.getBlob().getBytes()) };
}

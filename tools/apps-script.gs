const SHEET_ID = '18LiQBcW7E1A_0lXvUlk_LBEVeyG4XnxqHsTI9h085lI';
const TAB = '설문지 응답 시트1';
const GB = '방명록';
const SITE = '사이트';
const FOLDER_NAME = 'parranii 문의 첨부파일';
const COLORS = ['pink','yellow','mint','sky','lilac','peach'];
const HEAD = ['시간', '이름', '메시지', '캐릭터', '색', '숨김', '그림', '글번호', '열쇠', '고친 시간'];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website) return out({ ok: true });
    if (d.type === 'guestbook') return out(addGuest(d));
    if (d.type === 'guestbook_edit') return out(editGuest(d, false));
    if (d.type === 'guestbook_delete') return out(editGuest(d, true));
    const links = [];
    if (d.files && d.files.length) {
      const it = DriveApp.getFoldersByName(FOLDER_NAME);
      const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
      d.files.slice(0, 3).forEach(f => {
        const blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type || 'application/octet-stream', f.name || 'file');
        links.push(folder.createFile(blob).getUrl());
      });
    }
    SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB)
      .appendRow([new Date(), clean(d.name, 40), clean(d.phone, 40), clean(d.email, 80), clean(d.msg, 3000), links.join(', ')]);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.type === 'site') return siteData();
  if (p.type !== 'guestbook') return out({ ok: true });
  const items = gbSheet().getDataRange().getValues().slice(1)
    .filter(r => r[2] && !String(r[5]).trim())
    .slice(-500).reverse()
    .map(r => ({ id: String(r[7] || ''), t: new Date(r[0]).toISOString(), name: String(r[1]), msg: String(r[2]),
      s: String(r[3]), c: String(r[4]), w: String(r[6] || ''), e: r[9] ? 1 : 0 }));
  return out({ ok: true, items: items });
}

function siteData() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SITE);
  if (!sh) return out({ ok: false, error: 'no site' });
  const head = String(sh.getRange(1, 1).getValue() || '');
  if (!head) return out({ ok: false, error: 'empty' });
  const meta = JSON.parse(head.slice(1));
  const parts = sh.getRange(2, 1, meta.n, 1).getValues().map(r => String(r[0]).slice(1));
  return ContentService.createTextOutput('{"ok":true,"site":' + parts.join('') + '}')
    .setMimeType(ContentService.MimeType.JSON);
}

function fields(d) {
  return [clean(d.name, 12), clean(d.msg, 140),
    /^\d{1,2}(\.\d{1,2}){7}$/.test(String(d.sticker)) ? String(d.sticker) : '0.1.0.0.1.0.0.0',
    COLORS.indexOf(d.color) >= 0 ? d.color : 'yellow'];
}

function addGuest(d) {
  const f = fields(d);
  if (!f[1]) return { ok: false, error: 'empty' };
  const id = Utilities.getUuid().slice(0, 12);
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    gbSheet().appendRow([new Date(), f[0], f[1], f[2], f[3], '', clean(d.work, 40), id, hash(d.key), '']);
  } finally { lock.releaseLock(); }
  return { ok: true, id: id };
}

function editGuest(d, remove) {
  if (!d.id || !d.key) return { ok: false, error: 'no key' };
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    const sh = gbSheet(), v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      if (String(v[i][7]) !== String(d.id)) continue;
      if (!v[i][8] || String(v[i][8]) !== hash(d.key)) return { ok: false, error: 'not yours' };
      if (remove) { sh.getRange(i + 1, 6).setValue('본인 삭제'); return { ok: true }; }
      const f = fields(d);
      if (!f[1]) return { ok: false, error: 'empty' };
      sh.getRange(i + 1, 2, 1, 4).setValues([[f[0], f[1], f[2], f[3]]]);
      sh.getRange(i + 1, 7).setValue(clean(d.work, 40));
      sh.getRange(i + 1, 10).setValue(new Date());
      return { ok: true };
    }
    return { ok: false, error: 'not found' };
  } finally { lock.releaseLock(); }
}

function gbSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(GB);
  if (!sh) { sh = ss.insertSheet(GB); sh.setFrozenRows(1); }
  if (sh.getRange(1, 10).getValue() !== HEAD[9]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
  return sh;
}

function hash(k) {
  if (!k) return '';
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(k))
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function clean(s, n) {
  s = String(s || '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

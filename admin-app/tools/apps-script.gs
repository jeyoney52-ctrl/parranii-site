const SHEET_ID = '18LiQBcW7E1A_0lXvUlk_LBEVeyG4XnxqHsTI9h085lI';
const TAB = '설문지 응답 시트1';
const GB = '방명록';
const SITE = '사이트';
const FOLDER_NAME = 'parranii 문의 첨부파일';
const COLORS = ['pink','yellow','mint','sky','lilac','peach'];
const SHARED = '(압축 파일의 tools/apps-script.gs에 있는 값)'; // 파르라니 관리 앱 전용 열쇠 (바꾸지 마세요)
const SUBS = '알림구독';
const HEAD = ['시간', '이름', '메시지', '캐릭터', '색', '숨김', '그림', '글번호', '열쇠', '고친 시간'];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if ('adminKey' in d) return out(d.adminKey === SHARED ? admin(d) : { ok: false, error: 'key' });
    if (d.website) return out({ ok: true });
    if (d.type === 'guestbook') return out(addGuest(d));
    if (d.type === 'guestbook_edit') return out(editGuest(d, false));
    if (d.type === 'guestbook_delete') return out(editGuest(d, true));
    if (d.type && d.type !== 'inquiry') return out({ ok: false, error: 'type' });
    if (!String(d.msg || '').trim()) return out({ ok: false, error: 'empty' });
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

/* ───────── 파르라니 관리 앱 (열쇠가 맞을 때만) ───────── */
function admin(d) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (d.type === 'admin_inbox') {
    const names = workNames();
    const iq = ss.getSheetByName(TAB).getDataRange().getValues();
    const inquiries = iq.slice(1).map((r, i) => ({ row: i + 2, t: iso(r[0]), name: String(r[1] || ''), phone: String(r[2] || ''), email: String(r[3] || ''), msg: String(r[4] || ''), files: String(r[5] || '') }))
      .filter(x => x.msg || x.name).reverse().slice(0, 300);
    const gv = gbSheet().getDataRange().getValues();
    const guestbook = gv.slice(1).map((r, i) => ({ row: i + 2, t: iso(r[0]), name: String(r[1] || ''), msg: String(r[2] || ''), s: String(r[3] || ''), c: String(r[4] || ''),
      hidden: String(r[5] || '').trim(), work: names[String(r[6] || '')] || '', edited: r[9] ? iso(r[9]) : '' })).filter(x => x.msg).reverse().slice(0, 500);
    return { ok: true, inquiries: inquiries, guestbook: guestbook };
  }
  if (d.type === 'gb_hide') {
    const row = Number(d.row); if (!(row >= 2)) return { ok: false, error: 'row' };
    gbSheet().getRange(row, 6).setValue(d.hidden ? '숨김' : '');
    return { ok: true };
  }
  if (d.type === 'sub_add' || d.type === 'sub_del' || d.type === 'sub_list') {
    let sh = ss.getSheetByName(SUBS);
    if (!sh) { sh = ss.insertSheet(SUBS); sh.appendRow(['주소', '구독 정보', '기기', '시간']); sh.setFrozenRows(1); }
    const v = sh.getDataRange().getValues();
    if (d.type === 'sub_list') return { ok: true, subs: v.slice(1).map(r => { try { return JSON.parse(r[1]); } catch (e) { return null; } }).filter(Boolean) };
    const ep = d.type === 'sub_add' ? String((d.sub || {}).endpoint || '') : String(d.endpoint || '');
    if (!ep) return { ok: false, error: 'endpoint' };
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === ep) sh.deleteRow(i + 1);
    if (d.type === 'sub_add') sh.appendRow([ep, JSON.stringify(d.sub), clean(d.device, 60), new Date()]);
    return { ok: true };
  }
  if (d.type === 'pending') {
    const p = PropertiesService.getScriptProperties();
    const iq = ss.getSheetByName(TAB).getDataRange().getValues(), gv = gbSheet().getDataRange().getValues();
    const nI = iq.length, nG = gv.length;
    const lastI = Number(p.getProperty('notifiedInq') || 0), lastG = Number(p.getProperty('notifiedGb') || 0);
    p.setProperties({ notifiedInq: String(nI), notifiedGb: String(nG) });
    if (!lastI && !lastG) return { ok: true, items: [] }; // 처음 한 번은 지금 상태만 기억
    const items = [];
    for (let i = Math.max(1, lastI); i < nI; i++) { const r = iq[i]; if (r[4] || r[1]) items.push({ kind: 'inq', row: i + 1, name: String(r[1] || ''), text: String(r[4] || '') }); }
    for (let i = Math.max(1, lastG); i < nG; i++) { const r = gv[i]; if (r[2]) items.push({ kind: 'gb', row: i + 1, name: String(r[1] || ''), text: String(r[2] || '') }); }
    return { ok: true, items: items };
  }
  return { ok: false, error: 'type' };
}

function iso(v) { try { return new Date(v).toISOString(); } catch (e) { return String(v || ''); } }

/* 방명록의 ‘마음에 든 그림’ 번호 · 제목 (사이트 탭의 작품 목록에서) */
function workNames() {
  try {
    const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SITE); if (!sh) return {};
    const head = String(sh.getRange(1, 1).getValue() || ''); if (!head) return {};
    const meta = JSON.parse(head.slice(1));
    const site = JSON.parse(sh.getRange(2, 1, meta.n, 1).getValues().map(r => String(r[0]).slice(1)).join(''));
    const works = (site.data.works || []).filter(w => !w.data.hidden).sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
    const out = {}; works.forEach((w, i) => { out[w.id] = 'No. ' + ('0' + (i + 1)).slice(-2) + ' ' + (w.data.title || ''); });
    return out;
  } catch (e) { return {}; }
}

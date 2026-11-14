/* ───────── 전시 · Works 묶음 데이터 ─────────
   로그인한 방문자는 공유 데이터베이스(exhibitions, groups)의 최신 내용을, 로그인하지 않은 방문자는 아래 기본값을 본다.
   관리자 페이지에서 고친 내용은 ‘공개 반영’을 해야 아래 기본값에도 들어간다. */
const EXH_DEFAULT = [ // 전시 기간 순서 (오래된 전시부터)
  { id: "e1", title: "기다리니, 아직도?", sub: "1st Solo Exhibition", period: "2014.8.23 – 9.5", venue: "갤러리카페 잠시", poster: "img/p/pm1.jpg", ar: 407 / 589, workIds: [], order: 1 },
  { id: "e2", title: "괄호속이야기", sub: "김성순 개인전 · The 2nd Solo Exhibition", period: "2016.5.9 – 5.19", venue: "", poster: "img/p/p0.jpg", ar: 1000 / 1500, workIds: [], order: 2 },
  { id: "e3", title: "啐啄同時展", sub: "3인전", period: "2016.11.17 – 12.3", venue: "갤러리 하이", poster: "img/p/p3.jpg", ar: 966 / 1365, workIds: [], order: 3 },
  { id: "e4", title: "길아, 너 거기 있니", sub: "김성순 개인전 · The 3rd Solo Exhibition", period: "2017.9.9 – 9.14", venue: "ARTION", poster: "img/p/p2.jpg", ar: 900 / 653, workIds: [], order: 4 },
  { id: "e5", title: "보통의 존재", sub: "김성순 초대전 · The 4th Solo Exhibition", period: "2020.9.7 – 9.29", venue: "매화나무 두 그루", poster: "img/p/p1.jpg", ar: 614 / 1500, workIds: [], order: 5 },
];
const GROUPS_DEFAULT = [
  { id: "g1", name: "한지 · 한국화물감", en: "Hanji & Korean Pigment", desc: "한지와 종이 위에 한국화물감, 먹으로 그린 작품", poster: "img/p/mat1.jpg", ar: 887 / 1774, order: 1 },
  { id: "g2", name: "아크릴릭 · 과슈", en: "Acrylic & Gouache", desc: "종이·캔버스·나무 위에 과슈로 그린 작품", poster: "img/p/mat2.jpg", ar: 1, order: 2 },
  { id: "g3", name: "자개", en: "Mother-of-pearl", desc: "캔버스에 아크릴릭과 자개로 작업한 작은 작품들", poster: "img/p/mat4.jpg", ar: 1448 / 1086, order: 3 },
  { id: "g4", name: "오일파스텔", en: "Oil Pastel", desc: "오일파스텔과 색연필로 그린 작품", poster: "img/p/mat3.jpg", ar: 1086 / 1448, order: 4 },
  { id: "g5", name: "사진 · 프린트", en: "Photo Print", desc: "사진을 피그먼트 프린트로 옮긴 작품", poster: "img/p/mat5.jpg", ar: 1122 / 1402, order: 5 },
  { id: "g6", name: "기타", en: "Objects & Others", desc: "다섯 묶음에 넣기 애매한 작품들 (오브제, 혼합 재료)", poster: "img/p/mat6.jpg", ar: 1000 / 1300, order: 6 },
];
const EXH = [], GROUPS = [], exhFns = [], grpFns = []; let exhReady = false, grpReady = false;
const onExh = fn => { exhFns.push(fn); if (exhReady) fn(); };
const onGroups = fn => { grpFns.push(fn); if (grpReady) fn(); };
const PH = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e6e5ea"/></svg>');
const posterOf = d => d.posterId ? "/_blob/" + d.posterId : (d.poster || "");
const normEx = (id, d) => ({ id, title: d.title || "", sub: d.sub || "", period: d.period || "", venue: d.venue || "", src: posterOf(d) || PH, ar: +d.ar || .75, workIds: Array.isArray(d.workIds) ? d.workIds : [], order: d.order ?? 0 });
const normGr = (id, d) => ({ id, name: d.name || "", en: d.en || "", desc: d.desc || "", src: posterOf(d) || PH, ar: +d.ar || .8, order: d.order ?? 0 });
/* 첫 화면에는 가장 최근 전시가 먼저 걸린다: 전시 기간의 시작일이 늦은 순. 날짜가 없는 전시는 맨 뒤 */
const exStart = e => { const m = String(e.period || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? +m[1] * 10000 + +m[2] * 100 + +m[3] : (String(e.period || "").match(/\d{4}/) ? +String(e.period).match(/\d{4}/)[0] * 10000 : 0); };
let EX_SORT = "date", exRaw = [];
function setExh(list) { if (list) exRaw = list; const l = exRaw.slice(); if (EX_SORT === "date") l.sort((a, b) => exStart(b) - exStart(a) || b.order - a.order); else l.sort((a, b) => a.order - b.order); EXH.length = 0; EXH.push(...l); exhReady = true; exhFns.forEach(f => f()); }
function setGroups(list) { GROUPS.length = 0; GROUPS.push(...list); grpReady = true; grpFns.forEach(f => f()); }
const exhFallback = () => EXH_DEFAULT.map(d => normEx(d.id, d)), grpFallback = () => GROUPS_DEFAULT.map(d => normGr(d.id, d));
(async () => {
  setExh(exhFallback()); setGroups(grpFallback());
  const db = await DB; if (!db) return;
  db.collection("settings").onSnapshot(snap => { const ab = snap.docs.find(x => x.id === "about"); if (ab) setAbout(ab.data()); const ct = snap.docs.find(x => x.id === "contact"); if (ct) setContact(ct.data()); const d = snap.docs.find(x => x.id === "site"); const v = d && d.data().exSort === "manual" ? "manual" : "date"; if (v !== EX_SORT) { EX_SORT = v; setExh(); } }, () => {});
  db.collection("exhibitions").orderBy("order").onSnapshot(snap => setExh(snap.empty ? exhFallback() : snap.docs.map(d => normEx(d.id, d.data()))), () => {});
  db.collection("groups").orderBy("order").onSnapshot(snap => setGroups(snap.empty ? grpFallback() : snap.docs.map(d => normGr(d.id, d.data()))), () => {});
})();
/* 재료 칸을 읽어 자동으로 묶음을 정한다. 작품에 묶음을 직접 지정해 두었으면(group) 그쪽이 먼저다. */
function autoGroup(w) {
  const m = String(w.medium || "");
  if (/^붉은뺨/.test(String(w.title || "")) || /은분/.test(m)) return "g6";
  if (/사진|프린트|피그먼트/.test(m)) return "g5";
  if (/한지|한국화물감|채색|먹|장지|화선지/.test(m)) return "g1";
  if (/과슈|수채/.test(m)) return "g2";
  if (/자개/.test(m)) return "g3";
  if (/오일파스텔|색연필|파스텔/.test(m)) return "g4";
  return "g3";
}
function groupOf(w) {
  if (w.group && GROUPS.some(g => g.id === w.group)) return w.group;
  const a = autoGroup(w); return GROUPS.some(g => g.id === a) ? a : (GROUPS.length ? GROUPS[GROUPS.length - 1].id : "");
}

/* About: 로그인한 방문자는 공유 데이터베이스(settings/about)의 내용을, 아닌 방문자는 아래 기본값을 본다 */
const ABOUT_DEFAULT = { title: "About", body: "‘파르라니’는 아주 파르스름한 빛깔을 가리키는 말이에요.\n시선이 머무는 자리에서 그림이 작품이 되는 갤러리입니다.", lines: "", imageId: "", image: "" };
let ABOUT = { ...ABOUT_DEFAULT }; const aboutFns = [];
const onAbout = fn => { aboutFns.push(fn); fn(); };
function setAbout(d) { ABOUT = { ...ABOUT_DEFAULT, ...(d || {}) }; aboutFns.forEach(f => f()); }

const CONTACT_DEFAULT = { title: "Contact", intro: "전시와 작품 문의는 아래로 연락해 주세요.", lines: "" };
let CONTACT = { ...CONTACT_DEFAULT }; const contactFns = [];
const onContact = fn => { contactFns.push(fn); fn(); };
/* 연락처 항목: items [{k, v}]가 있으면 그것을, 없으면 예전 lines("이름 | 값" 또는 "이름 : 값")를 나눠 쓴다 */
const CT_KINDS = ["연락처", "이메일", "위치", "인스타그램", "웹사이트", "블로그"];
const CT_ALIAS = { "h.p": "연락처", "hp": "연락처", "tel": "연락처", "phone": "연락처", "전화": "연락처", "email": "이메일", "e-mail": "이메일", "메일": "이메일", "instagram": "인스타그램", "주소": "위치", "address": "위치" };
function contactItems(d) {
  if (d && Array.isArray(d.items)) return d.items.map(x => ({ k: String(x.k || ""), v: String(x.v || "") }));
  return String((d && d.lines) || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    let m = l.match(/^(.{1,20}?)\s*\|\s*(.*)$/) || l.match(/^([^:]{1,20}?)\s+:\s*(.*)$/) || l.match(/^([^:\/]{1,20}?):\s*(?!\/\/)(.*)$/);
    if (!m) return { k: "", v: l };
    const k = m[1].trim(); return { k: CT_ALIAS[k.toLowerCase()] || k, v: m[2].trim() };
  });
}
function setContact(d) { CONTACT = { ...CONTACT_DEFAULT, ...(d || {}) }; contactFns.forEach(f => f()); }

/* 확인 팝업: 지우기 · 사진 바꾸기 · 글을 비우거나 크게 줄일 때 한 번 더 묻는다 */
function askConfirm({ title, body = "", ok = "지우기", danger = true }) {
  return new Promise(res => {
    const el = document.createElement("div"); el.className = "ask"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true");
    const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    el.innerHTML = `<div class="ask-box"><h3>${e(title)}</h3>${body ? `<p>${e(body)}</p>` : ""}<div class="ask-btns"><button type="button" class="btn quiet" data-a="no">취소</button><button type="button" class="btn ${danger ? "danger-fill" : "primary"}" data-a="yes">${e(ok)}</button></div></div>`;
    const prev = document.activeElement, done = v => { el.remove(); removeEventListener("keydown", key, true); try { prev && prev.focus && prev.focus({ preventScroll: true }); } catch {} res(v); };
    const key = ev => { if (ev.key === "Escape") { ev.stopPropagation(); done(false); } };
    el.addEventListener("click", ev => { const a = ev.target.closest("[data-a]")?.dataset.a; if (a) done(a === "yes"); else if (ev.target === el) done(false); });
    addEventListener("keydown", key, true); (document.body.classList.contains("admin") && document.getElementById("admin") || document.body).appendChild(el); el.querySelector('[data-a="no"]').focus();
  });
}
window.__ask = askConfirm;
/* 글을 비우거나 절반 넘게 지웠으면: 입력 중에는 저장하지 않고, 칸을 벗어날 때 물어본다 */
async function guardText(old, val, final, label) {
  old = String(old ?? ""); val = String(val ?? "");
  const emptied = old.trim() && !val.trim(), shrunk = old.trim().length >= 20 && val.trim().length < old.trim().length * .5;
  if (!emptied && !shrunk) return "save";
  if (!final) return "wait";
  const ok = await askConfirm({ title: emptied ? `‘${label}’ 칸을 비울까요?` : `‘${label}’ 칸의 글이 많이 줄었어요. 이대로 저장할까요?`, body: `지금 저장된 내용: “${old.length > 90 ? old.slice(0, 90) + "…" : old}”`, ok: emptied ? "비우고 저장" : "이대로 저장" });
  return ok ? "save" : "revert";
}

/* 작은 정사각형 사진: 세로로 긴 인물 그림은 얼굴이 보이게 위아래 위치를 정하고(%), 도자기 · 오브제는 잘리지 않게 통째로 보여 준다 */
const THUMB_Y = { yp9b9vkntj5rnyuqabj5: 12, "3su35wx7ex5u8ybzi28h": 78, bqueiyfgqinvl3jru6cf: 10, udzujbnb0nf8dl0a2c4h: 62, j5dvb0vgia7m8f84rb4m: 16 };
const THUMB_WHOLE = new Set(["bzq68vx9q2pl710f6jgz", "qcrrbjb6174jj598inhq", "wiiewhdqkrxnkuuvl878", "yqtqlxuoxd7gjuo8tk8r"]);
const isWhole = w => THUMB_WHOLE.has(w.id) || w.fit === "contain" || /도자|세라믹|백자|청자|분청|옹기|조소|조각/.test(w.medium || "");

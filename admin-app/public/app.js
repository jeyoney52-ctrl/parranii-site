/* 파르라니 관리 앱 */
(() => {
  const $ = id => document.getElementById(id);
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COL = { pink: "#ffe3ea", yellow: "#fff4c9", mint: "#dff5e8", sky: "#dcefff", lilac: "#ebe3ff", peach: "#ffe6d2" };
  const LS = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: k => { try { localStorage.removeItem(k); } catch {} } };
  const TITLES = { inq: "문의", gb: "방명록", set: "설정" };
  let pass = LS.get("pa-pass") || "", tab = "inq", data = null, busy = false;

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  let toastT = 0;
  const toast = t => { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2600); };
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(10); } catch {} };

  async function api(path, body) {
    const r = await fetch("/api/" + path, { method: body ? "POST" : "GET", headers: { "x-pass": pass, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { logout("비밀번호가 맞지 않아요."); throw new Error("401"); }
    return r.json();
  }

  /* ── 로그인 ── */
  function showLogin(msg) { $("app").hidden = true; $("login").hidden = false; $("login-msg").textContent = msg || ""; }
  function logout(msg) { pass = ""; LS.del("pa-pass"); showLogin(msg); }
  $("login-form").addEventListener("submit", async ev => {
    ev.preventDefault(); pass = ev.target.pass.value.trim(); if (!pass) return;
    $("login-msg").textContent = "확인하는 중…";
    try { const j = await api("login", {}); if (j.ok) { LS.set("pa-pass", pass); start(); } } catch {}
  });
  $("logout").addEventListener("click", () => { if (confirm("로그아웃할까요?")) logout(); });

  /* ── 목록 ── */
  const when = t => { const d = new Date(t); if (isNaN(d)) return t || ""; const m = (Date.now() - d) / 6e4;
    return m < 1 ? "방금" : m < 60 ? Math.floor(m) + "분 전" : m < 1440 ? Math.floor(m / 60) + "시간 전" : m < 10080 ? Math.floor(m / 1440) + "일 전" : d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }); };
  const seen = k => +LS.get("pa-seen-" + k) || 0;
  function counts() {
    if (!data) return; let all = 0;
    for (const k of ["inq", "gb"]) { const arr = k === "inq" ? data.inquiries : data.guestbook, n = arr.filter(x => x.row > seen(k)).length; all += n; $("n-" + k).hidden = !n; $("n-" + k).textContent = n > 99 ? "99+" : n; }
    if ("setAppBadge" in navigator) (all ? navigator.setAppBadge(all) : navigator.clearAppBadge()).catch(() => {});
  }
  function draw() {
    document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
    $("title").textContent = TITLES[tab]; $("settings").hidden = tab !== "set"; $("list").hidden = tab === "set"; $("refresh").hidden = tab === "set";
    if (tab === "set" || !data) { counts(); return; }
    const s = seen(tab), list = $("list");
    if (tab === "inq") {
      list.innerHTML = data.inquiries.length ? data.inquiries.map(x => {
        const tel = x.phone.replace(/[^\d+]/g, ""), files = x.files ? x.files.split(",").map(u => u.trim()).filter(Boolean) : [];
        return `<article class="card${x.row > s ? " new" : ""}" id="inq-${x.row}"><header>${x.row > s ? '<span class="dot" aria-label="새 문의"></span>' : ""}<b>${e(x.name || "(이름 없음)")}</b><time>${e(when(x.t))}</time></header>
          <p class="txt">${e(x.msg)}</p>
          <div class="acts">${tel ? `<a href="tel:${e(tel)}">📞 전화</a><a href="sms:${e(tel)}">💬 문자</a>` : ""}${x.email ? `<a href="mailto:${e(x.email)}">✉️ 메일</a>` : ""}${files.map((u, i) => `<a href="${e(u)}" target="_blank" rel="noopener">📎 첨부${files.length > 1 ? " " + (i + 1) : ""}</a>`).join("")}
          ${x.phone || x.email ? `<span class="em">${e([x.phone, x.email].filter(Boolean).join(" · "))}</span>` : ""}</div></article>`; }).join("")
        : `<p class="empty"><span>📭</span>아직 들어온 문의가 없어요.</p>`;
    } else {
      list.innerHTML = data.guestbook.length ? data.guestbook.map(x => {
        const off = !!x.hidden, ava = typeof PrAva !== "undefined" && PrAva.valid(x.s) ? PrAva.svg(x.s, COL[x.c] || COL.yellow) : "";
        return `<article class="card${x.row > s ? " new" : ""}${off ? " off" : ""}" id="gb-${x.row}"><header><span class="ava">${ava}</span>${x.row > s ? '<span class="dot" aria-label="새 글"></span>' : ""}<b>${e(x.name || "익명의 관람객")}</b>${off ? `<span class="badge">${x.hidden === "본인 삭제" ? "본인이 지움" : "숨김"}</span>` : ""}<time>${e(when(x.t))}</time></header>
          <p class="txt">${e(x.msg)}</p>${x.work ? `<p class="fav">♥ ${e(x.work)}</p>` : ""}
          ${x.hidden === "본인 삭제" ? "" : `<div class="acts"><button type="button" data-hide="${x.row}" data-off="${off ? 1 : 0}">${off ? "👁 다시 보이기" : "🙈 숨기기"}</button></div>`}</article>`; }).join("")
        : `<p class="empty"><span>🌱</span>아직 남겨진 방명록이 없어요.</p>`;
    }
    counts();
  }
  function markSeen() { if (!data || tab === "set") return; const arr = tab === "inq" ? data.inquiries : data.guestbook; const max = arr.reduce((m, x) => Math.max(m, x.row), 0); if (max > seen(tab)) LS.set("pa-seen-" + tab, max); setTimeout(counts, 0); }
  let seenT = 0;
  async function load(manual) {
    if (busy) return; busy = true; $("refresh").classList.add("spin"); $("note").className = "note"; $("note").textContent = data ? "" : "불러오는 중…";
    try { const j = await api("inbox"); if (!j.ok) throw new Error(j.error || "fail"); data = j; $("note").textContent = ""; draw(); jump(); clearTimeout(seenT); seenT = setTimeout(() => { markSeen(); }, 4000); if (manual) toast("새로고침했어요"); }
    catch (err) { if (String(err.message) !== "401") { $("note").className = "note err"; $("note").textContent = "불러오지 못했어요. 잠시 뒤 다시 당겨 주세요."; } }
    busy = false; $("refresh").classList.remove("spin");
  }
  function jump() {
    const m = /^#(inq|gb)-(\d+)$/.exec(location.hash); if (!m) return;
    if (tab !== m[1]) { tab = m[1]; draw(); }
    const el = $(`${m[1]}-${m[2]}`); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2500); }
    history.replaceState(null, "", location.pathname);
  }
  document.querySelector(".tabbar").addEventListener("click", ev => { const b = ev.target.closest("[data-tab]"); if (!b) return; buzz();
    if (tab === b.dataset.tab) { scrollTo({ top: 0, behavior: "smooth" }); return; }
    markSeen(); tab = b.dataset.tab; draw(); scrollTo(0, 0); clearTimeout(seenT); seenT = setTimeout(markSeen, 4000); });
  $("refresh").addEventListener("click", () => load(true));
  $("list").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-hide]"); if (!b) return;
    const off = b.dataset.off === "1";
    if (!off && !confirm("이 방명록을 숨길까요?\n사이트에서 바로 사라지고, ‘다시 보이기’로 되돌릴 수 있어요.")) return;
    b.disabled = true; b.textContent = "저장 중…";
    try { const j = await api("hide", { row: +b.dataset.hide, hidden: !off }); if (!j.ok) throw 0; const x = data.guestbook.find(g => g.row === +b.dataset.hide); if (x) x.hidden = off ? "" : "숨김"; draw(); toast(off ? "다시 보이게 했어요" : "숨겼어요"); }
    catch { b.disabled = false; b.textContent = "다시 눌러 주세요"; }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && pass) load(); });
  addEventListener("hashchange", jump);
  navigator.serviceWorker?.addEventListener("message", ev => { if (ev.data && ev.data.url) { history.replaceState(null, "", ev.data.url); load(); } });

  /* ── 당겨서 새로고침 ── */
  { let y0 = null, dy = 0; const ptr = $("ptr");
    addEventListener("touchstart", ev => { y0 = scrollY <= 0 && tab !== "set" ? ev.touches[0].clientY : null; dy = 0; }, { passive: true });
    addEventListener("touchmove", ev => { if (y0 === null) return; dy = Math.max(0, ev.touches[0].clientY - y0); const d = Math.min(dy, 120);
      ptr.style.opacity = Math.min(1, d / 70); ptr.style.transform = `translateY(${d * .6 - 40}px)`; ptr.classList.toggle("go", d > 80); }, { passive: true });
    addEventListener("touchend", () => { if (y0 === null) return; if (dy > 80) { buzz(); load(true); } y0 = null; ptr.style.opacity = 0; ptr.style.transform = ""; ptr.classList.remove("go"); }); }

  /* ── 알림 ── */
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent), standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const b64 = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  const canPush = () => "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  async function pushOn() { if (!canPush()) return false; const reg = await navigator.serviceWorker.ready; return !!(await reg.pushManager.getSubscription()) && Notification.permission === "granted"; }
  async function paintBell() {
    const hint = $("bell-hint"), on = await pushOn().catch(() => false);
    $("bell-sw").classList.toggle("on", on); hint.hidden = true;
    $("banner").hidden = on || !canPush() || Notification.permission === "denied" || LS.get("pa-banner-x") === "1";
    if (!canPush()) { hint.hidden = false; hint.innerHTML = isIOS && !standalone ? "아이폰은 <b>홈 화면에 추가</b>한 앱에서만 알림을 받을 수 있어요. 사파리 아래 <b>공유 → 홈 화면에 추가</b>를 누른 뒤, 홈 화면의 ‘파르라니 관리’로 열어 주세요." : "이 브라우저에서는 알림을 받을 수 없어요."; }
    else if (Notification.permission === "denied") { hint.hidden = false; hint.textContent = "알림이 막혀 있어요. 핸드폰 설정 → 앱(또는 브라우저) → 알림에서 허용해 주세요."; }
  }
  async function turnOn() {
    if (!canPush()) { tab = "set"; draw(); paintBell(); return; }
    const perm = await Notification.requestPermission(); if (perm !== "granted") { paintBell(); return; }
    try {
      const reg = await navigator.serviceWorker.ready; const { key } = await (await fetch("/api/vapid")).json();
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
      const dev = isIOS ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "PC";
      const j = await api("subscribe", { sub: sub.toJSON(), device: dev }); if (!j.ok) throw 0;
      toast("알림을 켰어요 🔔");
    } catch { toast("알림을 켜지 못했어요. 다시 눌러 주세요."); }
    paintBell();
  }
  async function turnOff() {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { await api("unsubscribe", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
    toast("이 핸드폰의 알림을 껐어요"); paintBell();
  }
  $("bell").addEventListener("click", async () => { buzz(); if (await pushOn().catch(() => false)) { if (confirm("이 핸드폰의 알림을 끌까요?")) turnOff(); } else turnOn(); });
  $("banner-on").addEventListener("click", () => { buzz(); turnOn(); });
  $("test").addEventListener("click", async () => {
    buzz(); const reg = await navigator.serviceWorker?.ready, sub = reg && await reg.pushManager?.getSubscription();
    if (!sub) { toast("먼저 알림을 켜 주세요"); return; }
    const j = await api("test", { endpoint: sub.endpoint }).catch(() => ({}));
    toast(j.sent ? "테스트 알림을 보냈어요. 곧 와요!" : "테스트 알림을 보내지 못했어요");
  });

  function start() { $("login").hidden = true; $("app").hidden = false; draw(); load(); paintBell(); }
  if (pass) start(); else showLogin();
})();

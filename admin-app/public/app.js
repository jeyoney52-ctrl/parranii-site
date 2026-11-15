/* 파르라니 관리 앱 */
(() => {
  const $ = id => document.getElementById(id);
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COL = { pink: "#ffe3ea", yellow: "#fff4c9", mint: "#dff5e8", sky: "#dcefff", lilac: "#ebe3ff", peach: "#ffe6d2" };
  const LS = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: k => { try { localStorage.removeItem(k); } catch {} } };
  let pass = LS.get("pa-pass") || "", tab = "inq", data = null, busy = false;

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

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
  $("logout").addEventListener("click", () => logout());

  /* ── 목록 ── */
  const when = t => { const d = new Date(t); if (isNaN(d)) return t || ""; const m = (Date.now() - d) / 6e4;
    return m < 1 ? "방금" : m < 60 ? Math.floor(m) + "분 전" : m < 1440 ? Math.floor(m / 60) + "시간 전" : d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) + " " + d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }); };
  const seen = k => +LS.get("pa-seen-" + k) || 0;
  function counts() {
    if (!data) return;
    for (const k of ["inq", "gb"]) { const arr = k === "inq" ? data.inquiries : data.guestbook, s = seen(k), n = arr.filter(x => x.row > s).length;
      $("n-" + k).hidden = !n; $("n-" + k).textContent = n; }
    if ("setAppBadge" in navigator) { const n = (+$("n-inq").textContent || 0) * !$("n-inq").hidden + (+$("n-gb").textContent || 0) * !$("n-gb").hidden; (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch?.(() => {}); }
  }
  function draw() {
    if (!data) return;
    document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
    const s = seen(tab), list = $("list");
    if (tab === "inq") {
      list.innerHTML = data.inquiries.length ? data.inquiries.map(x => {
        const files = x.files ? x.files.split(",").map(u => u.trim()).filter(Boolean) : [];
        return `<article class="card${x.row > s ? " new" : ""}" id="inq-${x.row}"><header><b>${e(x.name || "(이름 없음)")}</b>${x.row > s ? '<span class="new-tag">새 문의</span>' : ""}<time>${e(when(x.t))}</time></header>
          <p class="txt">${e(x.msg)}</p><div class="meta">${x.phone ? `<a href="tel:${e(x.phone.replace(/[^\d+]/g, ""))}">📞 ${e(x.phone)}</a><a href="sms:${e(x.phone.replace(/[^\d+]/g, ""))}">💬 문자</a>` : ""}${x.email ? `<a href="mailto:${e(x.email)}">✉️ ${e(x.email)}</a>` : ""}${files.map((u, i) => `<a href="${e(u)}" target="_blank" rel="noopener">📎 첨부${files.length > 1 ? " " + (i + 1) : ""}</a>`).join("")}</div></article>`; }).join("")
        : `<p class="empty">아직 들어온 문의가 없어요.</p>`;
    } else {
      list.innerHTML = data.guestbook.length ? data.guestbook.map(x => {
        const off = !!x.hidden, ava = typeof PrAva !== "undefined" && PrAva.valid(x.s) ? PrAva.svg(x.s, COL[x.c] || COL.yellow) : "";
        return `<article class="card${x.row > s ? " new" : ""}${off ? " off" : ""}" id="gb-${x.row}"><header><span class="ava">${ava}</span><b>${e(x.name || "익명의 관람객")}</b>${x.row > s ? '<span class="new-tag">새 글</span>' : ""}${off ? `<span class="badge">${x.hidden === "본인 삭제" ? "본인이 지움" : "숨김"}</span>` : ""}<time>${e(when(x.t))}</time></header>
          <p class="txt">${e(x.msg)}</p>${x.work ? `<p class="fav">♥ 마음에 든 그림 · ${e(x.work)}</p>` : ""}
          <div class="meta">${x.hidden === "본인 삭제" ? "" : `<button type="button" data-hide="${x.row}" data-off="${off ? 1 : 0}">${off ? "다시 보이기" : "숨기기"}</button>`}</div></article>`; }).join("")
        : `<p class="empty">아직 남겨진 방명록이 없어요.</p>`;
    }
    counts();
  }
  function markSeen() { if (!data) return; const arr = tab === "inq" ? data.inquiries : data.guestbook; const max = arr.reduce((m, x) => Math.max(m, x.row), 0); if (max > seen(tab)) LS.set("pa-seen-" + tab, max); setTimeout(counts, 0); }
  async function load() {
    if (busy) return; busy = true; $("refresh").classList.add("spin"); $("note").className = "note"; $("note").textContent = data ? "" : "불러오는 중…";
    try { const j = await api("inbox"); if (!j.ok) throw new Error(j.error || "fail"); data = j; $("note").textContent = ""; draw(); jump(); setTimeout(markSeen, 2500); }
    catch (err) { if (String(err.message) !== "401") { $("note").className = "note err"; $("note").textContent = "불러오지 못했어요. 잠시 뒤 ↻를 눌러 주세요."; } }
    busy = false; $("refresh").classList.remove("spin");
  }
  function jump() {
    const m = /^#(inq|gb)-(\d+)$/.exec(location.hash); if (!m) { if (location.hash === "#gb") { tab = "gb"; draw(); } return; }
    if (tab !== m[1]) { tab = m[1]; draw(); }
    const el = $(`${m[1]}-${m[2]}`); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2500); }
    history.replaceState(null, "", location.pathname);
  }
  document.querySelector(".tabs").addEventListener("click", ev => { const b = ev.target.closest("[data-tab]"); if (!b) return; tab = b.dataset.tab; draw(); scrollTo(0, 0); setTimeout(markSeen, 1500); });
  $("refresh").addEventListener("click", load);
  $("list").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-hide]"); if (!b) return;
    const off = b.dataset.off === "1";
    if (!off && !confirm("이 방명록을 숨길까요?\n사이트에서 바로 사라지고, ‘다시 보이기’로 되돌릴 수 있어요.")) return;
    b.disabled = true; b.textContent = "저장 중…";
    try { const j = await api("hide", { row: +b.dataset.hide, hidden: !off }); if (!j.ok) throw 0; const x = data.guestbook.find(g => g.row === +b.dataset.hide); if (x) x.hidden = off ? "" : "숨김"; draw(); }
    catch { b.disabled = false; b.textContent = "다시 눌러 주세요"; }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && pass) load(); });
  addEventListener("hashchange", jump);
  navigator.serviceWorker?.addEventListener("message", ev => { if (ev.data && ev.data.url) { history.replaceState(null, "", ev.data.url); load(); } });

  /* ── 알림 ── */
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent), standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const b64 = s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  async function paintBell() {
    const hint = $("bell-hint"); hint.hidden = true; $("bell").classList.remove("on");
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      $("bell-t").textContent = "알림 안내"; hint.hidden = false;
      hint.innerHTML = isIOS && !standalone ? "아이폰은 <b>홈 화면에 추가</b>한 앱에서만 알림을 받을 수 있어요. 사파리 아래 <b>공유 버튼 → 홈 화면에 추가</b>를 누른 뒤, 홈 화면의 ‘파르라니 관리’로 열어 주세요." : "이 브라우저에서는 알림을 받을 수 없어요. 크롬이나 사파리(홈 화면 앱)로 열어 주세요.";
      return; }
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") { $("bell-t").textContent = "알림 켜짐"; $("bell").classList.add("on"); }
    else if (Notification.permission === "denied") { $("bell-t").textContent = "알림 꺼짐"; hint.hidden = false; hint.textContent = "알림이 막혀 있어요. 핸드폰 설정 → 앱(또는 브라우저) → 알림에서 허용해 주세요."; }
    else $("bell-t").textContent = "알림 켜기";
  }
  $("bell").addEventListener("click", async () => {
    if (!("PushManager" in window)) { paintBell(); return; }
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") {
      if (!confirm("이 핸드폰의 알림을 끌까요?")) return;
      await api("unsubscribe", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); paintBell(); return; }
    const perm = await Notification.requestPermission(); if (perm !== "granted") { paintBell(); return; }
    try {
      const { key } = await (await fetch("/api/vapid")).json();
      sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
      const dev = (navigator.userAgentData && navigator.userAgentData.platform) || (isIOS ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "PC");
      const j = await api("subscribe", { sub: sub.toJSON(), device: dev }); if (!j.ok) throw 0;
      $("note").className = "note"; $("note").textContent = "알림을 켰어요. ‘알림 테스트’로 확인해 보세요.";
    } catch { $("note").className = "note err"; $("note").textContent = "알림을 켜지 못했어요. 다시 눌러 주세요."; }
    paintBell();
  });
  $("test").addEventListener("click", async () => {
    const reg = await navigator.serviceWorker?.ready, sub = reg && await reg.pushManager?.getSubscription();
    if (!sub) { $("note").className = "note err"; $("note").textContent = "먼저 ‘알림 켜기’를 눌러 주세요."; return; }
    const j = await api("test", { endpoint: sub.endpoint }).catch(() => ({}));
    $("note").className = j.sent ? "note" : "note err"; $("note").textContent = j.sent ? "테스트 알림을 보냈어요. 몇 초 안에 와요." : "테스트 알림을 보내지 못했어요.";
  });

  function start() { $("login").hidden = true; $("app").hidden = false; load(); paintBell(); }
  if (pass) start(); else showLogin();
})();

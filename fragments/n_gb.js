
/* 다른 페이지에서 works 메뉴(by material · all works)를 누르면, 첫 화면이 다시 보인 뒤에 그 자리로 내려간다 */
addEventListener("hashchange", () => {
  const id = location.hash.slice(1); if (id !== "posters" && id !== "room") return;
  const go = () => { const el = document.getElementById(id); if (el && Math.abs(el.getBoundingClientRect().top) > 2) el.scrollIntoView(); };
  requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 350);
});

/* ───────── 방명록 (Guestbook) ─────────
   방문자: #guestbook 페이지에서 프로필(동물 · 색)을 고르거나 주사위로 랜덤으로 뽑고 한마디를 남긴다.
   저장: 작가님 Apps Script → 구글 시트 ‘방명록’ 탭. 읽기도 같은 스크립트(GET ?type=guestbook)로 한다.
   작가: 작품 관리 → 방명록 탭에서 글을 숨기거나 다시 보이게 한다(시트의 ‘숨김’ 칸). */
(() => {
  const SCRIPT = "https://script.google.com/macros/s/AKfycbwG3xdE-V2UO_5J6fPNooJOo-YbCld-IXHzX1Dnjuj3UMgCnt6Afsn0HSHz1TxioAdT/exec";
  const SHEET = "18LiQBcW7E1A_0lXvUlk_LBEVeyG4XnxqHsTI9h085lI", TAB = "방명록";
  const COL = { pink: "#ffe3ea", yellow: "#fff4c9", mint: "#dff5e8", sky: "#dcefff", lilac: "#ebe3ff", peach: "#ffe6d2" };
  const CK = Object.keys(COL);
  const A = id => document.getElementById(id);
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const tilt = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) | 0; return ((Math.abs(h) % 7) - 3) * .45; };
  const when = t => { const d = new Date(t); if (isNaN(d)) return ""; const m = (Date.now() - d) / 6e4;
    return m < 1 ? "방금" : m < 60 ? Math.floor(m) + "분 전" : m < 1440 ? Math.floor(m / 60) + "시간 전" : d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); };
  const face = (code, c) => PrAva.svg(PrAva.valid(code) ? code : "0.1.0.0.1.0.0.0", c);
  const MINE = () => { try { return JSON.parse(localStorage.getItem("pr-gb-mine") || "{}") || {}; } catch { return {}; } };
  const workOf = id => id && typeof WORKS !== "undefined" ? WORKS.find(w => w.id === id) : null;
  const wNo = w => String(workNo(w)).padStart(2, "0");
  const workChip = x => { const w = workOf(x.w); if (!w) return "";
    return `<button type="button" class="gb-fav" data-work="${e(w.id)}"><img src="${e(thumbSrc(w))}" alt="" loading="lazy"><span><small>♥ 마음에 든 그림</small>No. ${wNo(w)} ${e(w.title || "")}</span></button>`; };
  const note = (x, fresh) => { const c = COL[x.c] || COL.yellow, mine = x.id && MINE()[x.id];
    return `<article class="gb-note${fresh ? " fresh" : ""}" style="--c:${c};--r:${tilt((x.id || x.t || "") + x.msg)}deg"><header><span class="gb-ava" aria-hidden="true">${face(x.s, "rgba(255,255,255,.7)")}</span><div><b>${e(x.name || "익명의 관람객")}</b><time>${e(when(x.t))}${x.e ? " · 고침" : ""}</time></div></header><p>${e(x.msg)}</p>${workChip(x)}${x.id ? `<div class="gb-mine${mine ? "" : " pw"}"><button type="button" data-edit="${e(x.id)}">고치기</button><button type="button" data-del="${e(x.id)}">지우기</button></div>` : ""}</article>`; };

  /* ── 방문자 페이지 ── */
  const page = A("gb-page");
  if (page) {
    const form = A("gb-form"), board = A("gb-board"), more = A("gb-more"), msg = A("gb-msg"), ava = A("gb-ava"), pick = A("gb-pick"), cols = A("gb-colors");
    const btn = form.querySelector("button[type=submit]"), ta = form.elements.msg;
    let me = { s: PrAva.random(), c: rnd(CK) }, items = null, shown = 24, loading = false, part = "hair", fav = "", editing = null;
    try { const sv = JSON.parse(localStorage.getItem("pr-gb-me") || "null"); if (sv && PrAva.valid(sv.s) && COL[sv.c]) me = sv; } catch {}
    const TABS = [["hair", "머리"], ["hairColor", "머리색"], ["face", "표정"], ["skin", "피부"], ["outfit", "옷"], ["color", "옷 색"], ["hat", "모자"], ["glasses", "안경"], ["item", "소품"], ["bg", "배경"]];
    cols.innerHTML = TABS.map(([k, l]) => `<button type="button" role="tab" data-p="${k}">${l}</button>`).join("");
    const SKI = PrAva.KEYS.indexOf("skin");
    const setPart = (k, v) => { const a = PrAva.parse(me.s);
      if (k === "face") a[SKI] = a[SKI] % 4 + 4 * v; else if (k === "skin") a[SKI] = v + 4 * Math.floor(a[SKI] / 4); else a[PrAva.KEYS.indexOf(k)] = v;
      me.s = PrAva.join(a); };
    const drawPick = () => {
      cols.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.p === part));
      if (part === "bg") { pick.innerHTML = CK.map(k => `<button type="button" role="radio" class="sw" data-v="${k}" style="--c:${COL[k]}" aria-checked="${me.c === k}" aria-label="배경 ${k}"></button>`).join(""); return; }
      if (part === "face") { const cur = Math.floor(PrAva.parse(me.s)[SKI] / 4);
        pick.innerHTML = PrAva.FACE.map((n, v) => { const a = PrAva.parse(me.s); a[SKI] = a[SKI] % 4 + 4 * v; return `<button type="button" role="radio" class="op" data-v="${v}" aria-checked="${v === cur}" title="${n}">${PrAva.svg(PrAva.join(a), COL[me.c], true)}<span>${n}</span></button>`; }).join(""); return; }
      const i = PrAva.KEYS.indexOf(part), raw = PrAva.parse(me.s)[i], cur = part === "skin" ? raw % 4 : raw, names = PrAva.PARTS[part];
      if (part === "hairColor" || part === "skin" || part === "color") {
        pick.innerHTML = names.map((n, v) => `<button type="button" role="radio" class="sw" data-v="${v}" style="--c:${(part === "hairColor" ? PrAva.HAIR : part === "skin" ? PrAva.SKIN : PrAva.CLO)[v]}" aria-checked="${v === cur}" aria-label="${n}" title="${n}"></button>`).join(""); return; }
      const zoom = part === "hair" || part === "hat" || part === "glasses";
      const opt = v => { const a = PrAva.parse(me.s); a[i] = v; if (part === "hair") a[PrAva.KEYS.indexOf("hat")] = 0; return `<button type="button" role="radio" class="op" data-v="${v}" aria-checked="${v === cur}" title="${names[v]}">${PrAva.svg(PrAva.join(a), COL[me.c], zoom)}<span>${names[v]}</span></button>`; };
      pick.innerHTML = part === "hair" ? [["짧은 머리", [1, 7, 8, 9, 10, 11, 13, 6, 14]], ["긴 머리", [0, 3, 2, 5, 4, 12]]].map(([t, vs]) => `<p class="gb-grp">${t}</p>${vs.map(opt).join("")}`).join("") : names.map((n, v) => opt(v)).join("");
    };
    const paintMe = pop => {
      ava.innerHTML = PrAva.svg(me.s, COL[me.c]); drawPick();
      if (pop) { ava.classList.remove("pop"); void ava.offsetWidth; ava.classList.add("pop"); }
      try { localStorage.setItem("pr-gb-me", JSON.stringify(me)); } catch {}
      dispatchEvent(new CustomEvent("pr-me", { detail: me }));
    };
    addEventListener("pr-me", ev => { if (ev.detail && ev.detail !== me && !editing) { me = { ...ev.detail }; paintMe(false); } });
    const roll = () => { me = { s: PrAva.random(), c: rnd(CK) }; paintMe(true); };
    A("gb-dice").addEventListener("click", roll); ava.addEventListener("click", roll);
    cols.addEventListener("click", ev => { const b = ev.target.closest("button[data-p]"); if (b) { part = b.dataset.p; drawPick(); } });
    pick.addEventListener("click", ev => { const b = ev.target.closest("button[data-v]"); if (!b) return; if (part === "bg") me.c = b.dataset.v; else setPart(part, +b.dataset.v); paintMe(part !== "bg"); });
    paintMe(false);
    ta.addEventListener("input", () => { A("gb-count").textContent = ta.value.length + " / 140"; if (msg.dataset.err) { msg.textContent = ""; msg.dataset.err = ""; } });

    const rank = A("gb-rank");
    const drawRank = () => {
      if (!items || typeof WORKS === "undefined") return;
      const n = new Map(); items.forEach(x => { if (workOf(x.w)) n.set(x.w, (n.get(x.w) || 0) + 1); });
      const top = [...n].sort((a, b) => b[1] - a[1]).slice(0, 8);
      rank.hidden = !top.length;
      A("gb-rank-list").innerHTML = top.map(([id, k], i) => { const w = workOf(id);
        return `<button type="button" class="gb-rk" data-work="${e(id)}"><span class="gb-rk-n">${i + 1}</span><img src="${e(thumbSrc(w))}" alt="" loading="lazy"><span class="gb-rk-t">No. ${wNo(w)}<b>${e(w.title || "")}</b></span><span class="gb-rk-c">♥ ${k}</span></button>`; }).join("");
    };
    const draw = () => {
      if (!items) return; drawRank(); A("gb-cnt").textContent = items.length ? items.length : "";
      board.innerHTML = items.length ? items.slice(0, shown).map(x => note(x, x.fresh)).join("")
        : `<p class="gb-empty"><span aria-hidden="true">🌱</span>아직 남겨진 글이 없어요.<br><a class="gb-chip" href="#guestbook-write">✏️ 첫 번째 방명록 남기기</a></p>`;
      items.forEach(x => delete x.fresh); more.hidden = items.length <= shown;
    };
    more.addEventListener("click", () => { shown += 24; draw(); });
    let inClaude = false;
    async function fromSheet() {
      try {
        const mcp = await (window.claude?.use?.("mcp") || Promise.resolve(null)).catch(() => null); if (!mcp) return null;
        const r = await mcp.callTool("Google Sheets", "get_values", { spreadsheetId: SHEET, range: `'${TAB}'!A1:J3000` }, { cache: { refresh: true } });
        const v = (r.payload && r.payload.values) || [];
        return v.slice(1).filter(x => x[2] && !String(x[5] || "").trim()).reverse().map(x => ({ id: x[7] || "", t: x[0], name: x[1], msg: x[2], s: x[3], c: x[4], w: x[6] || "", e: x[9] ? 1 : 0 }));
      } catch { return null; }
    }
    async function load() {
      if (loading) return; loading = true;
      if (!items) board.innerHTML = '<div class="gb-skel"></div>'.repeat(4);
      try {
        const r = await fetch(SCRIPT + "?type=guestbook&_=" + Date.now()), j = await r.json();
        if (!j || !j.ok) throw 0; items = Array.isArray(j.items) ? j.items : [];
      } catch {
        /* claude.ai 안(관리용 페이지)에서는 바깥 주소로 요청할 수 없어서, 로그인한 작가님의 구글 시트 연결로 읽어 온다 */
        const got = await fromSheet();
        if (got) { items = got; inClaude = true; }
        else { if (!items) board.innerHTML = `<p class="gb-empty"><span aria-hidden="true">🍃</span>방명록은 <a href="https://parranii.com/#guestbook" target="_blank" rel="noopener">parranii.com</a>에서 볼 수 있어요.</p>`; loading = false; return; }
      }
      loading = false; draw();
    }
    /* 마음에 든 그림 고르기 */
    const favBox = A("gb-favpick");
    const paintFav = () => { const w = workOf(fav);
      favBox.innerHTML = w ? `<span class="gb-fav sel"><img src="${e(thumbSrc(w))}" alt=""><span><small>No. ${wNo(w)}</small>${e(w.title || "")}</span></span><button type="button" class="gb-mini" data-fav="pick">바꾸기</button><button type="button" class="gb-mini" data-fav="none">빼기</button>`
        : `<button type="button" class="gb-mini strong" data-fav="pick">＋ 그림 고르기</button><span class="gb-hint">고르지 않아도 돼요</span>`; };
    let pk = null;
    function openPicker() {
      if (typeof WORKS === "undefined" || !WORKS.length) return;
      pk = document.createElement("div"); pk.className = "gb-pk"; pk.setAttribute("role", "dialog"); pk.setAttribute("aria-modal", "true"); pk.setAttribute("aria-label", "마음에 든 그림 고르기");
      pk.innerHTML = `<div class="gb-pk-in"><div class="gb-pk-h"><b>마음에 든 그림을 골라 주세요</b><button type="button" class="gb-pk-x" aria-label="닫기">✕</button></div>
        <input type="search" class="gb-pk-q" placeholder="제목 · 작품 번호로 찾기" aria-label="제목 또는 작품 번호로 찾기"><div class="gb-pk-g"></div></div>`;
      page.appendChild(pk); document.body.classList.add("pk-open");
      const g = pk.querySelector(".gb-pk-g"), q = pk.querySelector(".gb-pk-q");
      const fill = () => { const t = q.value.trim().toLowerCase().replace(/^no\.?\s*|^#/, "");
        const list = WORKS.filter(w => !t || String(workNo(w)) === t.replace(/^0+/, "") || (w.title || "").toLowerCase().includes(t));
        g.innerHTML = list.length ? list.map(w => `<button type="button" data-id="${e(w.id)}" aria-pressed="${w.id === fav}"><img src="${e(thumbSrc(w))}" alt="" loading="lazy"><span>No. ${wNo(w)}</span><b>${e(w.title || "")}</b></button>`).join("") : `<p class="gb-pk-none">찾는 그림이 없어요.</p>`; };
      fill(); q.addEventListener("input", fill); setTimeout(() => q.focus({ preventScroll: true }), 50);
      g.addEventListener("click", ev => { const b = ev.target.closest("button[data-id]"); if (!b) return; fav = b.dataset.id; paintFav(); closePicker(); });
      pk.addEventListener("click", ev => { if (ev.target === pk || ev.target.closest(".gb-pk-x")) closePicker(); });
    }
    function closePicker() { if (!pk) return; pk.remove(); pk = null; document.body.classList.remove("pk-open"); favBox.querySelector("button")?.focus({ preventScroll: true }); }
    addEventListener("keydown", ev => { if (ev.key === "Escape" && pk) closePicker(); });
    favBox.addEventListener("click", ev => { const b = ev.target.closest("[data-fav]"); if (!b) return; if (b.dataset.fav === "none") fav = ""; else { openPicker(); return; } paintFav(); });
    if (typeof onWorks === "function") onWorks(() => { paintFav(); draw(); });
    paintFav();

    /* 내가 쓴 글: 고치기 · 지우기, 고른 그림 크게 보기 */
    const setEditing = x => {
      editing = x;
      A("gb-editbar").hidden = !x; btn.textContent = x ? "고치기" : "남기기";
      if (x) { form.elements.name.value = x.name || ""; ta.value = x.msg || ""; fav = x.w || ""; if (PrAva.valid(x.s)) me.s = x.s; if (COL[x.c]) me.c = x.c; paintMe(false); paintFav(); A("gb-count").textContent = ta.value.length + " / 140";
        if (location.hash !== "#guestbook-write") location.hash = "guestbook-write";
        setTimeout(() => { form.scrollIntoView({ behavior: "smooth", block: "start" }); ta.focus({ preventScroll: true }); }, 120); }
      else { ta.value = ""; fav = ""; paintFav(); A("gb-count").textContent = "0 / 140"; }
    };
    A("gb-editx").addEventListener("click", () => { setEditing(null); msg.textContent = ""; });
    board.parentElement.addEventListener("click", async ev => {
      const wb = ev.target.closest("[data-work]"); if (wb) { const w = workOf(wb.dataset.work); if (w && typeof lb !== "undefined") lb.open(w, wb.querySelector("img") || wb); return; }
      const eb = ev.target.closest("[data-edit]"); if (eb) { const x = items.find(i => i.id === eb.dataset.edit); if (!x) return; const key = MINE()[x.id] || await askPw("글을 고치려면 남길 때 정한 비밀번호를 적어 주세요."); if (key) { x.key = key; setEditing(x); } return; }
      const db = ev.target.closest("[data-del]"); if (!db) return;
      const id = db.dataset.del, saved = MINE()[id];
      const key = saved || await askPw("글을 지우려면 남길 때 정한 비밀번호를 적어 주세요."); if (!key) return;
      if (saved && typeof askConfirm === "function" && !(await askConfirm({ title: "이 방명록을 지울까요?", body: "지운 글은 다시 볼 수 없어요.", ok: "지우기" }))) return;
      db.disabled = true;
      try { const j = await post({ type: "guestbook_delete", id, key }); if (!j.ok) throw new Error(j.error);
        items = items.filter(i => i.id !== id); const m = MINE(); delete m[id]; localStorage.setItem("pr-gb-mine", JSON.stringify(m)); if (editing && editing.id === id) setEditing(null); draw(); }
      catch (err) { db.disabled = false; toast(String(err && err.message) === "not yours" ? "비밀번호가 맞지 않아요." : "지우지 못했어요. 잠시 뒤 다시 눌러 주세요."); }
    });
    /* 비밀번호 묻는 작은 창 */
    const toast = t => { msg.textContent = t; msg.dataset.err = "1"; msg.scrollIntoView({ behavior: "smooth", block: "center" }); };
    const askPw = text => new Promise(res => {
      const d = document.createElement("div"); d.className = "gb-pk"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", "비밀번호");
      d.innerHTML = `<form class="gb-pw"><p>${e(text)}</p><input type="password" maxlength="20" autocomplete="current-password" aria-label="비밀번호" placeholder="비밀번호"><div><button type="button" class="gb-mini" data-x>취소</button><button type="submit" class="gb-mini strong2">확인</button></div></form>`;
      page.appendChild(d); const f = d.querySelector("form"), inp = d.querySelector("input"); setTimeout(() => inp.focus(), 30);
      const done = v => { d.remove(); res(v); };
      f.addEventListener("submit", ev => { ev.preventDefault(); const v = inp.value.trim(); done(v ? "pw:" + v : null); });
      d.addEventListener("click", ev => { if (ev.target === d || ev.target.closest("[data-x]")) done(null); });
      d.addEventListener("keydown", ev => { if (ev.key === "Escape") done(null); });
    });
    /* 저장한 뒤에는 방명록 보기로 가서, 방금 쓴 쪽지를 보여 준다 */
    const showDone = t => {
      location.hash = "guestbook";
      setTimeout(() => { draw(); const n = board.querySelector(".gb-note.fresh") || board.querySelector(".gb-note");
        const tip = document.createElement("p"); tip.className = "gb-done"; tip.textContent = t; board.before(tip); setTimeout(() => tip.remove(), 4000);
        n && n.scrollIntoView({ behavior: "smooth", block: "center" }); }, 150);
    };
    const post = async body => { const r = await fetch(SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }); const j = await r.json().catch(() => null); if (!r.ok || !j) throw new Error("status " + r.status); return j; };
    const newKey = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); };

    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (form.elements.website.value) return;
      const text = ta.value.trim(), name = form.elements.name.value.trim();
      const bad = t => { msg.textContent = t; msg.dataset.err = "1"; };
      if (!text) { bad("한마디를 적어 주세요."); ta.focus(); return; }
      if (inClaude) { msg.innerHTML = `이 화면(claude.ai)에서는 남길 수 없어요. <a href="https://parranii.com/#guestbook" target="_blank" rel="noopener">parranii.com</a>에서 남겨 주세요.`; msg.dataset.err = "1"; return; }
      if (editing) {
        const key = editing.key || MINE()[editing.id]; if (!key) { setEditing(null); return; }
        btn.disabled = true; msg.dataset.err = ""; msg.textContent = "고치는 중…";
        try { const j = await post({ type: "guestbook_edit", id: editing.id, key, name, msg: text, sticker: me.s, color: me.c, work: fav });
          if (!j.ok) throw new Error(j.error);
          try { const m = MINE(); m[editing.id] = key; localStorage.setItem("pr-gb-mine", JSON.stringify(m)); } catch {}
          Object.assign(editing, { name, msg: text, s: me.s, c: me.c, w: fav, e: 1, fresh: true }); delete editing.key; setEditing(null); msg.textContent = "";
          showDone("고쳤어요! ✏️"); }
        catch (err) { console.warn("방명록 고치기 실패:", err); bad(String(err && err.message) === "not yours" ? "비밀번호가 맞지 않아요. 다시 확인해 주세요." : "고치지 못했어요. 잠시 뒤 다시 눌러 주세요."); if (String(err && err.message) === "not yours") setEditing(null); }
        btn.disabled = false; return;
      }
      const pw0 = (form.elements.pw.value || "").trim(); if (pw0 && pw0.length < 4) { bad("비밀번호는 4자 이상으로 정해 주세요."); form.elements.pw.focus(); return; }
      const last = +localStorage.getItem("pr-gb-last") || 0;
      if (Date.now() - last < 30e3) { bad("조금 뒤에 다시 남겨 주세요."); return; }
      btn.disabled = true; msg.dataset.err = ""; msg.textContent = "남기는 중…";
      try {
        const pw = (form.elements.pw.value || "").trim(), key = pw ? "pw:" + pw : newKey();
        const j = await post({ type: "guestbook", name, msg: text, sticker: me.s, color: me.c, work: fav, key, website: "" });
        if (!j.ok) throw new Error(j.error);
        try { localStorage.setItem("pr-gb-last", String(Date.now())); if (j.id) { const m = MINE(); m[j.id] = key; localStorage.setItem("pr-gb-mine", JSON.stringify(m)); } } catch {}
        (items = items || []).unshift({ id: j.id, t: new Date().toISOString(), name, msg: text, s: me.s, c: me.c, w: fav, fresh: true }); draw();
        ta.value = ""; form.elements.pw.value = ""; fav = ""; paintFav(); A("gb-count").textContent = "0 / 140"; msg.textContent = "";
        showDone("남겨 주셔서 고마워요! 💌");
      } catch (err) { console.warn("방명록 저장 실패:", err); bad("남기지 못했어요. 잠시 뒤 다시 눌러 주세요."); }
      finally { btn.disabled = false; }
    });

    function route() {
      const h = location.hash, on = h === "#guestbook" || h === "#guestbook-write"; document.body.classList.toggle("guest", on); page.hidden = !on;
      if (!on) return;
      const mode = h === "#guestbook-write" ? "write" : "list"; page.dataset.mode = mode;
      page.querySelectorAll(".gb-chip").forEach(c => c.toggleAttribute("aria-current", c.dataset.m === mode));
      if (mode === "list" && editing) setEditing(null);
      if (mode === "list") msg.textContent = msg.dataset.err ? "" : msg.textContent;
      scrollTo(0, 0); document.title = (mode === "write" ? "방명록 남기기" : "Guestbook") + " · Gallery Parranii"; load();
    }
    addEventListener("hashchange", route); route();
  }

  /* ── 작품 관리 → 방명록 탭 ── */
  const list = A("gba-list"); if (!list) return;
  const say = (t, err) => { const n = A("gba-note"); n.hidden = !t; n.textContent = t || ""; n.dataset.err = err ? "1" : ""; };
  let rows = [], busy = false;
  const paint = () => {
    list.innerHTML = rows.length ? rows.slice().reverse().map(x => `<div class="gba-item${x.off ? " off" : ""}"><span class="gb-ava" aria-hidden="true">${face(x.s, COL[x.c] || COL.yellow)}</span>
      <div><b>${e(x.name || "익명의 관람객")}</b><time>${e(x.t)}</time>${x.off ? ` <small>· ${e(x.offWhy === "본인 삭제" ? "본인이 지움" : "숨김")}</small>` : ""}<p>${e(x.msg)}</p>${(() => { const w = workOf(x.w); return w ? `<small class="gba-w">♥ No. ${wNo(w)} ${e(w.title || "")}</small>` : ""; })()}</div>
      <button type="button" data-row="${x.row}">${x.off ? "다시 보이기" : "숨기기"}</button></div>`).join("") : "";
    if (!rows.length) say("아직 남겨진 방명록이 없어요.");
  };
  async function mcpOf() { return await (window.claude?.use?.("mcp") || Promise.resolve(null)).catch(() => null); }
  const errText = c => ({
    server_not_connected: "claude.ai에 Google Sheets 연결이 없어요. claude.ai 설정 → 커넥터에서 Google Sheets를 추가해 주세요.",
    needs_reauth: "Google Sheets 연결이 만료됐어요. claude.ai 설정 → 커넥터에서 다시 연결해 주세요.",
    approval_required: "Google Sheets를 쓰려면 허락이 필요해요. ‘새로고침’을 눌러 허락해 주세요.",
    consent_required: "Google Sheets를 쓰려면 허락이 필요해요. ‘새로고침’을 눌러 허락해 주세요.",
    not_in_manifest: "이 페이지에서 Google Sheets 사용이 꺼져 있어요. ‘새로고침’을 눌러 다시 허락해 주세요.",
    tool_error: "아직 방명록이 없어요. 첫 글이 남겨지면 시트에 ‘방명록’ 탭이 생겨요."
  }[c] || "방명록을 불러오지 못했어요. 잠시 뒤 ‘새로고침’을 눌러 주세요.");
  async function load(fresh) {
    if (busy) return; busy = true; say("방명록을 불러오는 중…");
    const mcp = await mcpOf();
    if (!mcp) { say("방명록은 claude.ai에 로그인한 상태로 작품 관리를 열면 볼 수 있어요.", true); busy = false; return; }
    try {
      const r = await mcp.callTool("Google Sheets", "get_values", { spreadsheetId: SHEET, range: `'${TAB}'!A1:J3000` }, fresh ? { cache: { refresh: true } } : undefined);
      const v = (r.payload && r.payload.values) || [];
      rows = v.slice(1).map((x, i) => ({ row: i + 2, t: x[0], name: x[1], msg: x[2], s: x[3], c: x[4], off: !!String(x[5] || "").trim(), offWhy: String(x[5] || "").trim(), w: x[6] })).filter(x => x.msg);
      say(""); paint();
    } catch (err) { say(errText(err && err.code), err && err.code !== "tool_error"); }
    finally { busy = false; }
  }
  list.addEventListener("click", async ev => {
    const b = ev.target.closest("button[data-row]"); if (!b) return;
    const x = rows.find(r => r.row === +b.dataset.row); if (!x) return;
    const off = !x.off;
    if (off && typeof askConfirm === "function" && !(await askConfirm({ title: "이 방명록을 숨길까요?", body: "사이트에서 바로 사라져요. 지워지지는 않아서 ‘다시 보이기’로 되돌릴 수 있어요.", ok: "숨기기" }))) return;
    b.disabled = true; b.textContent = "저장 중…";
    try {
      const mcp = await mcpOf(); if (!mcp) throw { code: "none" };
      await mcp.callTool("Google Sheets", "update_values", { spreadsheetId: SHEET, range: `'${TAB}'!F${x.row}`, values: [[off ? "숨김" : ""]] });
      x.off = off; paint();
    } catch (err) { say(err && err.code === "none" ? "claude.ai에 로그인한 상태에서만 바꿀 수 있어요." : errText(err && err.code), true); paint(); }
  });
  A("gba-refresh").addEventListener("click", () => load(true));
  document.querySelectorAll('.adm-tab[data-tab="gb"]').forEach(b => b.addEventListener("click", () => load(false)));
})();


/* ───────── 새 첫 화면(Line) + 재료별 전시 포스터(Works) ─────────
   첫 화면: 실제 전시 포스터가 줄에 걸려 있고, 끌면 줄을 따라 움직이며 속도만큼 흔들린다. 스크롤하면 배경이 검정에서 흰색으로 번진다.
   Works: 작품의 ‘재료’ 칸을 읽어 다섯 묶음으로 나누고, 묶음마다 포스터 한 장. 포스터를 누르면 포스터가 왼쪽으로 밀리고 그 안의 작품이 오른쪽에 펼쳐진다. */
(() => {
  const $ = gid, p2 = n => String(n).padStart(2, "0");
  const stairsEl = document.getElementById("stairs");

  let NX = 0; const rail = $("h-rail"), strp = $("h-strp"), hero = $("hero"), wrap = $("hero-wrap");
  let cards = [], sw = [];
  function buildHero() {
    rail.querySelectorAll(".pc").forEach(x => x.remove()); NX = EXH.length;
    cards = EXH.map((e, i) => { const el = document.createElement("div"); el.className = "pc"; el.dataset.poster = i; el.setAttribute("role", "button"); el.tabIndex = 0; el.setAttribute("aria-label", `${e.title} 포스터, 눌러서 전시 작품 보기`);
      el.innerHTML = `<i class="peg"></i><div class="pl"><img src="${esc(e.src)}" alt="${esc(e.title)} 포스터" draggable="false"><div class="cap"><span>${p2(i + 1)}</span><span>${esc(e.period || "—")}</span></div></div>`; rail.appendChild(el);
      el.addEventListener("keydown", ev => { if (ev.key === "Enter") openPv(i); }); return el; });
    sw = EXH.map(() => ({ a: (Math.random() < .5 ? -1 : 1) * (.45 + Math.random() * .3), v: 0 }));
    ti = clampN(ti, 0, Math.max(0, NX - 1)); pos = ti; prevPos = pos; lastCi = -1; layout(); if (NX) showCur(Math.round(pos)); else { $("h-no").textContent = ""; $("h-t").textContent = ""; $("h-p").textContent = ""; }
  }
  const born = performance.now();
  let W = 0, Hv = 0, SP = 400, pos = 0, ti = 0, prevPos = 0, drag = null, moved = 0, lastAct = Date.now(), lastCi = -1, heroOn = true;
  function showCur(i) { const e = EXH[i]; if (!e) return; $("h-no").textContent = `${p2(i + 1)} / ${p2(NX)}`; $("h-t").textContent = e.title; $("h-p").innerHTML = [e.sub, [e.period, e.venue].filter(Boolean).join("  ·  ")].filter(Boolean).map(esc).join("<br>"); }
  function layout() {
    const r = rail.getBoundingClientRect(); W = r.width; Hv = r.height; if (!W) return; const narrow = W < 700;
    const tb = textBottom(); EDGE = tb ? tb + 30 : 0;
    const room = EDGE ? (Hv - EDGE - 100) * .9 : Hv; /* 줄 아래 ~ 화면 아래 버튼 위까지 */
    /* 휴대폰: 포스터가 아래 전시 정보 글을 덮지 않게 */
    const hcTop = narrow ? hero.querySelector(".h-cur").getBoundingClientRect().top - r.top : 0;
    const nroom = narrow ? Math.max(120, hcTop - Hv * (.245 + .075) - 92) : 1e9;
    const S = Math.min(W * (narrow ? .6 : .36), Hv * (narrow ? .38 : .5), EDGE ? room * .92 : 1e9); SP = Math.min(W * (narrow ? .78 : .5), 560);
    EXH.forEach((e, i) => { let pw = S * Math.sqrt(e.ar), ph = S / Math.sqrt(e.ar); if (pw > W * .8) { ph *= W * .8 / pw; pw = W * .8; } const mh = Math.min(Hv * (narrow ? .35 : .56), EDGE ? room : 1e9, nroom); if (ph > mh) { pw *= mh / ph; ph = mh; } const im = cards[i].querySelector("img"); im.style.width = pw + "px"; im.style.height = ph + "px"; cards[i].style.width = (pw + 20) + "px"; cards[i].dataset.w = pw + 20; });
    let d = ""; for (let x = -30; x <= W + 30; x += 30) d += (d ? " L" : "M") + x + " " + sy(x).toFixed(1); strp.setAttribute("d", d);
  }
  /* 넓은 화면: 줄을 위쪽 글(소개 · 전시 정보) 아래로 내려 포스터가 글과 겹치지 않게 */
  let EDGE = 0;
  function textBottom() { if (W < 700 || innerWidth <= 820) return 0; const r0 = rail.getBoundingClientRect().top; return Math.max(...["h-cur", "h-tag"].map(id => { const el = hero.querySelector("." + id); if (!el) return 0; const b = el.getBoundingClientRect(); return Math.max(b.bottom, b.top + (id === "h-cur" ? 165 : 0)) - r0; })); }
  function sy(x) { const u = (x - W / 2) / (W * .66), edge = Math.max(Hv * (W < 700 ? .245 : .2), EDGE); return edge + Hv * .075 * (1 - u * u) * (EDGE ? .45 : 1); }
  function frame(t) {
    requestAnimationFrame(frame); if (!W && cards.length && rail.getClientRects().length && rail.getBoundingClientRect().width) layout(); if (!W || !heroOn || !cards.length) return;
    const dt = Math.min(.05, (t - (frame.t || t)) / 1000 || .016); frame.t = t;
    if (!drag) pos += (ti - pos) * Math.min(1, dt * 6.5);
    const shift = (pos - prevPos) * SP; prevPos = pos; const age = (t - born) / 1000;
    cards.forEach((el, i) => {
      const s = sw[i]; s.v += -shift * .014; s.v += (-26 * s.a - 2.1 * s.v) * dt; s.a += s.v * dt; s.a = Math.max(-.42, Math.min(.42, s.a));
      const off = i - pos, x = W / 2 + off * SP, y = sy(x), dist = Math.min(Math.abs(off), 2);
      const w = +el.dataset.w, drop = reduce ? 1 : Math.min(1, Math.max(0, (age - .5 - i * .18) / .9)), e = 1 - Math.pow(1 - drop, 3);
      el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - (1 - e) * 360).toFixed(1)}px) rotate(${s.a.toFixed(4)}rad) scale(${(1 - dist * .08).toFixed(3)})`;
      el.style.opacity = (e * (1 - dist * .3)).toFixed(3); el.style.zIndex = 10 - Math.round(dist * 3);
    });
    const c = Math.max(0, Math.min(NX - 1, Math.round(pos))); if (c !== lastCi) { lastCi = c; showCur(c); }
  }
  const cur = () => Math.max(0, Math.min(NX - 1, Math.round(pos)));
  function step(d) { if (!NX) return; ti = (ti + d + NX) % NX; lastAct = Date.now(); }
  rail.addEventListener("pointerdown", e => { if (!heroOn || detailOn()) return; drag = { x: e.clientX, p: pos, lx: e.clientX, lt: performance.now(), vx: 0 }; moved = 0; lastAct = Date.now(); rail.setPointerCapture(e.pointerId); });
  rail.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x; moved = Math.max(moved, Math.abs(dx)); const now = performance.now(); drag.vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now; pos = Math.max(-.3, Math.min(NX - .7, drag.p - dx / SP)); });
  function endDrag(e) { if (!drag) return; const d = drag; drag = null; if (moved < 6) { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(".pc"); if (el) { const i = +el.dataset.poster; if (i === cur()) openPv(i); else { ti = i; lastAct = Date.now(); } } return; } ti = Math.max(0, Math.min(NX - 1, Math.round(pos - d.vx * 240 / SP))); }
  rail.addEventListener("pointerup", endDrag); rail.addEventListener("pointercancel", () => { drag = null; });
  $("h-prev").addEventListener("click", () => step(-1)); $("h-next").addEventListener("click", () => step(1)); $("h-open").addEventListener("click", () => NX && openPv(cur()));
  addEventListener("keydown", e => { if (!heroOn || detailOn()) return; if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); });
  addEventListener("resize", layout); requestAnimationFrame(frame); onExh(buildHero);
  /* About · Contact에서 돌아오거나 새로고침했을 때: 첫 화면이 숨겨져 있던 동안 못 한 크기 계산을 다시 한다 */
  addEventListener("hashchange", () => { requestAnimationFrame(() => { layout(); }); setTimeout(layout, 300); });
  addEventListener("pageshow", () => setTimeout(layout, 50)); document.fonts?.ready.then(layout);
  setInterval(() => { if (heroOn && !detailOn() && Date.now() - lastAct > 5200) step(1); }, 5600);

  /* 스크롤하면 검정 → 흰색 그라데이션, 첫 화면 글자와 포스터는 끝에서 사라진다 */
  const smooth = (a, b, v) => { const t = clampN((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const HOLD = 0;
  /* 넘기기 화살표는 아래에서 올라오는 흰 Works 영역에 가려지지 않게 화면에 고정해 둔다 */
  const BAR = hero.querySelector(".h-bar"); document.body.appendChild(BAR); addEventListener("hashchange", () => { onScroll(); setTimeout(onScroll, 60); setTimeout(onScroll, 400); });
  function onScroll() {
    /* 처음 한두 번 스크롤하는 동안은 검은 첫 화면을 그대로 두고(화살표를 볼 수 있게), 그 뒤에 흰색으로 번진다 */
    const max = Math.max(1, wrap.offsetHeight - innerHeight), raw = clampN(scrollY / max, 0, 1), p = clampN((raw - HOLD) / (1 - HOLD), 0, 1);
    hero.style.setProperty("--bgp", (p * 100).toFixed(2) + "%");
    { /* 화살표 자리의 배경 밝기를 계산해(검정→흰색 그라데이션) 절반보다 밝으면 짙은 화살표로 */
      const hb = hero.getBoundingClientRect(), bb = BAR.getBoundingClientRect();
      const f = (bb.top + bb.height / 2 - hb.top) / Math.max(1, hb.height), g = (f + 2 * p) / 3, t = clampN((g - .3) / .36, 0, 1);
      { /* 머리글 자리(화면 맨 위)의 배경이 어두우면 흰 로고 */ const fh = 40 / Math.max(1, hb.height), gh = (fh + 2 * p) / 3, th = clampN((gh - .3) / .36, 0, 1);
        const onHero = hb.bottom > 60 && !["#about", "#contact", "#guestbook", "#guestbook-write", "#news", "#admin"].includes(location.hash) && !document.body.classList.contains("about") && !document.body.classList.contains("contact") && !document.body.classList.contains("guest") && !document.body.classList.contains("newsp");
        document.body.classList.toggle("hdr-dark", onHero && th < .5); }
      BAR.classList.toggle("dark", t > .5); BAR.classList.toggle("off", raw > .42 || document.body.classList.contains("about") || document.body.classList.contains("contact") || document.body.classList.contains("guest") || document.body.classList.contains("newsp") || location.hash === "#admin"); }
    const f = smooth(.5, .86, p); hero.style.setProperty("--hf", (1 - f).toFixed(3)); hero.style.setProperty("--hr", (1 - f).toFixed(3));
    heroOn = p < .98;
    stairsEl.classList.toggle("show", p >= .95);
  }
  addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); onScroll();

  /* 전시 포스터를 누르면: 포스터는 왼쪽으로 밀리고, 그 전시에 나온 작품이 오른쪽에 펼쳐진다 */
  const exWorks = e => (e.workIds || []).map(id => WORKS.find(w => w.id === id)).filter(Boolean);
  function openPv(i) { const e = EXH[i]; if (!e) return; const from = (cards[i] && cards[i].querySelector("img")) || null;
    openDetail({ img: e.src, k: `Exhibition ${p2(i + 1)} / ${p2(EXH.length)}`, title: e.title, desc: [e.sub, [e.period, e.venue].filter(Boolean).join("  ·  ")].filter(Boolean), list: exWorks(e), empty: "이 전시에 나온 작품은 아직 등록되지 않았어요." }, from); }

  /* ── Works: 묶음마다 포스터 한 장. 묶음(포스터)은 관리자 페이지에서 만들고, 작품을 넣고 뺄 수 있다 ── */
  const board = $("pz-board"); let byGroup = {}; board.classList.add("pz-flow");
  let cpos = 2, ctarget = 2, cdrag = null, cmoved = 0, craf = 0, fcards = [];
  const GN = () => GROUPS.length;
  function buildBoard() {
    byGroup = {}; GROUPS.forEach(g => byGroup[g.id] = []); WORKS.forEach(w => { const g = groupOf(w); if (byGroup[g]) byGroup[g].push(w); });
    cpos = ctarget = clampN(Math.round(cpos), 0, Math.max(0, GN() - 1));
    if (!GN()) { board.innerHTML = ""; return; }
    board.innerHTML = `<div class="fl-stage" id="fl-stage" tabindex="0" aria-label="Works 포스터. 좌우로 넘기고, 가운데 포스터를 누르면 작품이 열려요"></div><div class="fl-bar"><button type="button" id="fl-prev" aria-label="이전 포스터">←</button><span id="fl-name"></span><button type="button" id="fl-next" aria-label="다음 포스터">→</button></div>`;
    const st = $("fl-stage");
    fcards = GROUPS.map((g, i) => { const el = document.createElement("button"); el.type = "button"; el.className = "fl-card"; el.dataset.i = i; el.setAttribute("aria-label", `${g.name}, 작품 ${byGroup[g.id].length}점`); el.innerHTML = `<img src="${esc(g.src)}" alt="" draggable="false">`; st.appendChild(el); return el; });
    flLayout(); flName();
    $("fl-prev").onclick = () => flGo(-1); $("fl-next").onclick = () => flGo(1);
    st.addEventListener("keydown", e => { if (e.key === "ArrowLeft") flGo(-1); if (e.key === "ArrowRight") flGo(1); if (e.key === "Enter") openGroup(Math.round(cpos), fcards[Math.round(cpos)].querySelector("img")); });
    st.addEventListener("pointerdown", e => { cdrag = { x: e.clientX, p: cpos, lx: e.clientX, lt: performance.now(), vx: 0 }; cmoved = 0; st.setPointerCapture(e.pointerId); });
    st.addEventListener("pointermove", e => { if (!cdrag) return; const dx = e.clientX - cdrag.x; cmoved = Math.max(cmoved, Math.abs(dx)); const now = performance.now(); cdrag.vx = (e.clientX - cdrag.lx) / Math.max(1, now - cdrag.lt); cdrag.lx = e.clientX; cdrag.lt = now; cpos = clampN(cdrag.p - dx / flSP(), -.3, GN() - .7); flDraw(); });
    const end = e => { if (!cdrag) return; const d = cdrag; cdrag = null;
      if (cmoved < 6) { const c = document.elementFromPoint(e.clientX, e.clientY)?.closest(".fl-card"); if (c) { const i = +c.dataset.i; if (i === Math.round(cpos)) openGroup(i, c.querySelector("img")); else { ctarget = i; flAnim(); } } return; }
      ctarget = clampN(Math.round(cpos - d.vx * 220 / flSP()), 0, GN() - 1); flAnim(); };
    st.addEventListener("pointerup", end); st.addEventListener("pointercancel", () => { cdrag = null; ctarget = Math.round(cpos); flAnim(); });
  }
  const flSP = () => { const w = ($("fl-stage") || board).clientWidth; return Math.min(w * (w < 700 ? .5 : .26), 300); };
  function flGo(d) { ctarget = clampN(Math.round(cpos) + d, 0, GN() - 1); flAnim(); }
  function flName() { const i = Math.round(cpos), g = GROUPS[i], n = $("fl-name"); if (n && g) n.textContent = `${p2(i + 1)} · ${g.name}  (${(byGroup[g.id] || []).length}점)`; }
  function flAnim() { cancelAnimationFrame(craf); const step = () => { cpos += (ctarget - cpos) * .18; if (Math.abs(ctarget - cpos) < .002) { cpos = ctarget; flDraw(); flName(); return; } flDraw(); craf = requestAnimationFrame(step); }; reduce ? (cpos = ctarget, flDraw(), flName()) : step(); }
  function flLayout() { const st = $("fl-stage"); if (!st) return; const H = st.clientHeight; fcards.forEach((el, i) => { const g = GROUPS[i]; let h = H * .88, w = h * g.ar; const mw = st.clientWidth * (st.clientWidth < 700 ? .62 : .34); if (w > mw) { w = mw; h = w / g.ar; } el.style.width = w + "px"; el.style.height = h + "px"; }); flDraw(); }
  function flDraw() { const st = $("fl-stage"); if (!st) return; const W = st.clientWidth, H = st.clientHeight, SP = flSP();
    fcards.forEach((el, i) => { const off = i - cpos, a = Math.abs(off), x = W / 2 + off * SP, w = el.offsetWidth, h = el.offsetHeight;
      el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${((H - h) / 2).toFixed(1)}px) perspective(1200px) rotateY(${clampN(-off * 38, -52, 52).toFixed(1)}deg) scale(${(1 - Math.min(a, 2.5) * .12).toFixed(3)})`;
      el.style.zIndex = 50 - Math.round(a * 10); el.style.opacity = (1 - Math.min(a, 3) * .2).toFixed(2); el.style.filter = a > .4 ? `brightness(${(1 - Math.min(a, 2) * .1).toFixed(2)})` : ""; el.style.pointerEvents = a > 2.6 ? "none" : ""; }); }
  addEventListener("resize", flLayout);
  /* 다른 페이지(News · About · Guestbook …)에 있는 동안 숨겨져서 크기가 0으로 잡힌 포스터를, 돌아오면 다시 맞춘다 */
  addEventListener("hashchange", () => { requestAnimationFrame(flLayout); setTimeout(flLayout, 300); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { const st = $("fl-stage"); if (st && st.clientWidth && fcards.some(el => !el.offsetWidth)) flLayout(); }).observe(board);
  onWorks(buildBoard); onGroups(buildBoard);
  function openGroup(i, from) { const g = GROUPS[i]; if (!g) return;
    openDetail({ img: g.src, k: `Works ${p2(i + 1)} / ${p2(GN())}${g.en ? "  ·  " + g.en : ""}`, title: g.name, desc: [g.desc].filter(Boolean), list: byGroup[g.id] || [], empty: "이 묶음에는 아직 작품이 없어요." }, from); }

  /* 포스터 상세(전시 · Works 공통) */
  const pzd = $("pzd"), pzdImg = $("pzd-img"); let detailList = [], pzPrev = null;
  const detailOn = () => pzd.classList.contains("on");
  function openDetail(o, from) {
    detailList = o.list || []; pzPrev = document.activeElement;
    pzdImg.src = o.img; pzdImg.alt = o.title + " 포스터";
    $("pzd-k").textContent = o.k; $("pzd-t").textContent = o.title; $("pzd-d").innerHTML = (o.desc || []).map(esc).join("<br>");
    $("pzd-grid").innerHTML = detailList.length ? `<span class="cnt">작품 ${detailList.length}점 · 눌러서 크게 보기</span>` + detailList.map((w, i) => `<button class="pzw" type="button" data-i="${i}" style="--d:${Math.min(i, 40)}"><span class="ph"><img src="${esc(thumbSrc(w))}" alt="${esc(w.title)}" loading="lazy" decoding="async" style="${imgFit(w)}"></span><span class="t">${esc(w.title)}</span></button>`).join("") : `<span class="cnt">${esc(o.empty || "작품이 없어요.")}</span>`;
    $("pzd-grid").scrollTop = 0; pzd.scrollTop = 0;
    const src = (from || board).getBoundingClientRect();
    pzd.classList.add("on"); pzd.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
    const go = () => { const to = pzdImg.getBoundingClientRect(); if (!to.width || reduce || !src.width) return; pzdImg.animate([{ transform: `translate(${src.left - to.left}px, ${src.top - to.top}px) scale(${src.width / to.width}, ${src.height / to.height})` }, { transform: "none" }], { duration: 950, easing: "cubic-bezier(.65,0,.2,1)" }); };
    pzdImg.complete ? go() : (pzdImg.onload = go);
    $("pzd-x").focus({ preventScroll: true });
  }
  function closePz() { if (!detailOn()) return; pzd.classList.remove("on"); pzd.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; pzPrev && pzPrev.focus && pzPrev.focus({ preventScroll: true }); }
  $("pzd-x").addEventListener("click", closePz);
  $("pzd-grid").addEventListener("click", e => { const b = e.target.closest(".pzw"); if (b) lb.open(detailList[+b.dataset.i], b); });
  addEventListener("keydown", e => { if (e.key === "Escape" && detailOn() && !document.getElementById("lightbox").classList.contains("on")) closePz(); });
})();

/* 넓은 화면: 로고 · 첫 화면 글 · 화살표를 큰 ‘Parranii’의 P 왼쪽 선에 맞춘다 */
(() => {
  const g = document.querySelector(".giant span"); if (!g) return;
  const set = () => { if (innerWidth <= 820) { document.documentElement.style.removeProperty("--gl"); return; }
    if (!g.getClientRects().length) { /* About · Contact 페이지: 로고를 본문 왼쪽 선에 맞춘다 */ const pg = [...document.querySelectorAll(".about-page:not([hidden]) .ab-in")][0]; if (pg) document.documentElement.style.setProperty("--gl", Math.round(pg.getBoundingClientRect().left) + "px"); else document.documentElement.style.removeProperty("--gl"); return; }
    const x = g.getBoundingClientRect().left + Math.max(0, parseFloat(getComputedStyle(g).fontSize) * .02); if (x > 0) document.documentElement.style.setProperty("--gl", Math.round(x) + "px"); };
  set(); addEventListener("resize", set); addEventListener("hashchange", () => setTimeout(set, 50)); document.fonts?.ready.then(set); setTimeout(set, 1500);
})();

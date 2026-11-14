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
    $("pzd-grid").innerHTML = detailList.length ? `<span class="cnt">작품 ${detailList.length}점 · 눌러서 크게 보기</span>` + detailList.map((w, i) => `<button class="pzw" type="button" data-i="${i}" style="--d:${Math.min(i, 40)}"><span class="ph"><img src="${esc(thumbSrc(w))}" alt="${esc(w.title)}" loading="lazy" decoding="async"></span><span class="t">${esc(w.title)}</span></button>`).join("") : `<span class="cnt">${esc(o.empty || "작품이 없어요.")}</span>`;
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

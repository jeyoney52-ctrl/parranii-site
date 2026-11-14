
/* ───────── 픽셀 관람객 (PC: 예전 계단 자리) ─────────
   오른쪽 점선 길을 따라, 스크롤한 만큼 픽셀 관람객이 걸어 내려간다.
   처음엔 랜덤 관람객 · 말풍선 ‘DIY ME!’를 누르면 방명록과 같은 꾸미기 창이 열리고, 저장하면 그 모습으로 걷는다.
   꾸민 모습은 방명록 캐릭터(pr-gb-me)와 같이 쓴다. */
(() => {
  const stairs = document.getElementById("stairs"); if (!stairs || typeof PrAva === "undefined") return;
  const BG = { pink: "#ffe3ea", yellow: "#fff4c9", mint: "#dff5e8", sky: "#dcefff", lilac: "#ebe3ff", peach: "#ffe6d2" }, BK = Object.keys(BG);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const load = () => { try { const v = JSON.parse(localStorage.getItem("pr-gb-me") || "null"); if (v && PrAva.valid(v.s) && BG[v.c]) return v; } catch {} return null; };
  let me = load() || { s: PrAva.random(), c: rnd(BK) };
  const SECS = [["top", null, "top"], ["posters", "posters", "works"], ["room", "room", "all works"]];

  const wk = document.createElement("div"); wk.className = "wk"; wk.id = "wk";
  wk.innerHTML = `<span class="wk-line" aria-hidden="true"></span><div class="wk-dots"></div>
    <div class="wk-me" id="wk-me"><button type="button" class="wk-bub" id="wk-bub" aria-label="내 관람객 꾸미기">DIY ME!</button><button type="button" class="wk-ava" id="wk-ava" aria-label="내 관람객 꾸미기"></button></div>`;
  document.body.appendChild(wk);
  const meEl = wk.querySelector("#wk-me"), ava = wk.querySelector("#wk-ava"), bub = wk.querySelector("#wk-bub"), dots = wk.querySelector(".wk-dots");
  const paintAva = () => { ava.innerHTML = PrAva.svg(me.s, ""); };
  paintAva();

  /* 위치: 구간(처음 → works → all works → 끝)마다 길을 같은 길이로 나눠서, 그 구간을 지나는 만큼 내려간다 */
  let idle = 0;
  const STOPS = [0, .32, .64, 1]; // 처음 · works · all works · 끝 이 길 위에 놓이는 자리
  const maxY = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const secY = () => [0, ...["posters", "room"].map(id => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + scrollY : 0; }), maxY()];
  function prog() {
    const ys = secY(), y = Math.min(scrollY, ys[3]);
    for (let i = 0; i < 3; i++) if (y <= ys[i + 1] || i === 2) { const span = Math.max(1, ys[i + 1] - ys[i]); return STOPS[i] + (STOPS[i + 1] - STOPS[i]) * Math.min(1, Math.max(0, (y - ys[i]) / span)); }
    return 0;
  }
  function drawDots() {
    const H = wk.clientHeight; if (!H) return;
    dots.innerHTML = SECS.map(([k, id, label], i) => `<button type="button" class="wk-dot" data-k="${k}" style="top:${(STOPS[i] * H).toFixed(1)}px" title="${e(label)}"><span>${e(label)}</span></button>`).join("");
  }
  /* 꽤 내려와서 작품을 많이 봤으면, 방명록을 부탁한다 (이미 남긴 사람에게는 묻지 않음) */
  let ask = false, idleT = 0, sleepy = false;
  const LS = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const wrote = () => !!LS("pr-gb-last");
  const diy = () => !!LS("pr-wk-diy");               // ‘DIY ME’에서 저장을 한 번이라도 했는지
  let visits = 1; try { visits = (+localStorage.getItem("pr-wk-visits") || 0) + 1; localStorage.setItem("pr-wk-visits", String(visits)); } catch {}
  /* 상황별 말풍선 */
  function say(p) {
    if (bub.dataset.hold) return;
    let t, a = false;
    if (p > .8 && !wrote()) { t = "방명록도 남겨주실거죠? 💌"; a = true; }
    else if (!diy()) t = "DIY ME!";
    else if (sleepy) t = "쉬었다 가요 💤";
    else if (scrollY >= maxY() - 40 && p > .9) t = "끝까지 봐 주셨네요! 👏";
    else if (p >= .64) t = wrote() ? "다녀가 줘서 고마워요 💕" : "천천히 보고 가요 ☕";
    else if (p >= .3) t = "포스터를 눌러 보세요 👆";
    else t = visits > 1 ? "또 오셨네요! 반가워요 🙌" : "안녕하세요! 👋";
    ask = a;
    if (bub.textContent !== t) { bub.textContent = t; bub.classList.toggle("talk", t !== "DIY ME!"); }
    bub.setAttribute("aria-label", a ? "방명록 남기러 가기" : "내 관람객 꾸미기");
  }
  function place() {
    const H = wk.clientHeight; if (!H) return;
    const p = prog();
    meEl.style.transform = `translateY(${(p * H).toFixed(1)}px)`;
    sleepy = false; clearTimeout(idleT); idleT = setTimeout(() => { sleepy = true; say(prog()); }, 25000);
    say(p);
    const curK = p >= STOPS[2] - .001 ? "room" : p >= STOPS[1] - .001 ? "posters" : "top";
    const ay = p * H; // 관람객 바로 위 이정표는 말풍선과 겹치지 않게 잠깐 숨긴다
    dots.querySelectorAll(".wk-dot").forEach(d => { d.classList.toggle("on", d.dataset.k === curK); const dy = ay - parseFloat(d.style.top); d.classList.toggle("near", dy > -20 && dy < 130); });
    meEl.classList.add("walking"); clearTimeout(idle); idle = setTimeout(() => meEl.classList.remove("walking"), 380);
  }
  dots.addEventListener("click", ev => { const b = ev.target.closest(".wk-dot"); if (!b) return; const id = SECS.find(s => s[0] === b.dataset.k)[1];
    scrollTo({ top: id ? document.getElementById(id).getBoundingClientRect().top + scrollY - 8 : 0, behavior: "smooth" }); });
  addEventListener("scroll", place, { passive: true });
  addEventListener("resize", () => { drawDots(); place(); });
  if (typeof onWorks === "function") onWorks(() => setTimeout(drawDots, 300));
  setTimeout(() => { drawDots(); place(); meEl.classList.remove("walking"); }, 600); setInterval(drawDots, 4000);
  /* 예전 계단이 보이고 숨는 때(첫 화면을 지나면 보임)를 그대로 따른다 */
  const sync = () => wk.classList.toggle("show", stairs.classList.contains("show"));
  new MutationObserver(sync).observe(stairs, { attributes: true, attributeFilter: ["class"] }); sync();

  /* 꾸미기 창 */
  const TABS = [["hair", "머리"], ["hairColor", "머리색"], ["face", "표정"], ["skin", "피부"], ["outfit", "옷"], ["color", "옷 색"], ["hat", "모자"], ["glasses", "안경"], ["item", "소품"], ["bg", "배경"]];
  const SKI = PrAva.KEYS.indexOf("skin");
  let pop = null, draft = null, part = "hair";
  function setPart(k, v) { const a = PrAva.parse(draft.s);
    if (k === "face") a[SKI] = a[SKI] % 4 + 4 * v; else if (k === "skin") a[SKI] = v + 4 * Math.floor(a[SKI] / 4); else a[PrAva.KEYS.indexOf(k)] = v;
    draft.s = PrAva.join(a); }
  function drawPick() {
    const pick = pop.querySelector(".wkp-pick");
    pop.querySelectorAll(".wkp-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.p === part));
    if (part === "bg") { pick.innerHTML = BK.map(k => `<button type="button" class="sw" data-v="${k}" style="--c:${BG[k]}" aria-checked="${draft.c === k}" aria-label="배경 ${k}"></button>`).join(""); return; }
    const raw = PrAva.parse(draft.s);
    if (part === "face") { const cur = Math.floor(raw[SKI] / 4);
      pick.innerHTML = PrAva.FACE.map((n, v) => { const a = raw.slice(); a[SKI] = a[SKI] % 4 + 4 * v; return `<button type="button" class="op" data-v="${v}" aria-checked="${v === cur}">${PrAva.svg(PrAva.join(a), BG[draft.c], true)}<span>${n}</span></button>`; }).join(""); return; }
    const i = PrAva.KEYS.indexOf(part), cur = part === "skin" ? raw[i] % 4 : raw[i], names = PrAva.PARTS[part];
    if (part === "hairColor" || part === "skin" || part === "color") {
      pick.innerHTML = names.map((n, v) => `<button type="button" class="sw" data-v="${v}" style="--c:${(part === "hairColor" ? PrAva.HAIR : part === "skin" ? PrAva.SKIN : PrAva.CLO)[v]}" aria-checked="${v === cur}" aria-label="${n}" title="${n}"></button>`).join(""); return; }
    const zoom = part === "hair" || part === "hat" || part === "glasses";
    const opt = v => { const a = raw.slice(); a[i] = v; if (part === "hair") a[PrAva.KEYS.indexOf("hat")] = 0; return `<button type="button" class="op" data-v="${v}" aria-checked="${v === cur}" title="${names[v]}">${PrAva.svg(PrAva.join(a), BG[draft.c], zoom)}<span>${names[v]}</span></button>`; };
    pick.innerHTML = part === "hair" ? [["짧은 머리", [1, 7, 8, 9, 10, 11, 13, 6, 14]], ["긴 머리", [0, 3, 2, 5, 4, 12]]].map(([t, vs]) => `<p class="gb-grp">${t}</p>${vs.map(opt).join("")}`).join("") : names.map((n, v) => opt(v)).join("");
  }
  const paintDraft = popAnim => { const big = pop.querySelector(".wkp-big"); big.innerHTML = PrAva.svg(draft.s, BG[draft.c]); drawPick();
    if (popAnim) { big.classList.remove("pop"); void big.offsetWidth; big.classList.add("pop"); } };
  function openPop() {
    if (pop) return; draft = { ...me }; part = "hair";
    pop = document.createElement("div"); pop.className = "wkp"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true"); pop.setAttribute("aria-label", "내 관람객 꾸미기");
    pop.innerHTML = `<div class="wkp-in"><div class="wkp-h"><b>내 관람객 꾸미기</b><button type="button" class="wkp-x" aria-label="닫기">✕</button></div>
      <div class="wkp-body"><div class="wkp-me"><div class="wkp-big gb-ava big"></div><button type="button" class="gb-dice wkp-dice"><span aria-hidden="true">🎲</span> 랜덤</button></div>
        <div class="gb-dress"><div class="gb-tabs wkp-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-p="${k}">${l}</button>`).join("")}</div><div class="gb-pick wkp-pick"></div></div></div>
      <div class="wkp-foot"><span class="wkp-note">방명록 캐릭터에도 같이 쓰여요</span><button type="button" class="gb-mini" data-x>취소</button><button type="button" class="inq-send wkp-save">저장</button></div></div>`;
    document.body.appendChild(pop); document.body.classList.add("pk-open");
    paintDraft(false);
    pop.querySelector(".wkp-tabs").addEventListener("click", ev => { const b = ev.target.closest("[data-p]"); if (b) { part = b.dataset.p; drawPick(); } });
    pop.querySelector(".wkp-pick").addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (!b) return; if (part === "bg") draft.c = b.dataset.v; else setPart(part, +b.dataset.v); paintDraft(part !== "bg"); });
    const roll = () => { draft = { s: PrAva.random(), c: rnd(BK) }; paintDraft(true); };
    pop.querySelector(".wkp-dice").addEventListener("click", roll); pop.querySelector(".wkp-big").addEventListener("click", roll);
    pop.querySelector(".wkp-save").addEventListener("click", () => {
      me = { ...draft }; try { localStorage.setItem("pr-gb-me", JSON.stringify(me)); } catch {}
      dispatchEvent(new CustomEvent("pr-me", { detail: me }));
      closePop(); paintAva(); meEl.classList.remove("saved"); void meEl.offsetWidth; meEl.classList.add("saved");
      try { localStorage.setItem("pr-wk-diy", "1"); } catch {}
      bub.dataset.hold = "1"; bub.textContent = "짠! 어때요? ✨"; bub.classList.add("talk"); setTimeout(() => { delete bub.dataset.hold; say(prog()); }, 2600);
    });
    pop.addEventListener("click", ev => { if (ev.target === pop || ev.target.closest(".wkp-x") || ev.target.closest("[data-x]")) closePop(); });
    setTimeout(() => pop && pop.querySelector(".wkp-save").focus({ preventScroll: true }), 50);
  }
  function closePop() { if (!pop) return; pop.remove(); pop = null; document.body.classList.remove("pk-open"); bub.focus({ preventScroll: true }); }
  addEventListener("keydown", ev => { if (ev.key === "Escape" && pop) closePop(); });
  bub.addEventListener("click", () => { if (ask) { location.hash = "guestbook-write"; return; } openPop(); }); ava.addEventListener("click", openPop);
  /* 방명록에서 캐릭터를 바꾸면 걷는 관람객도 같이 바뀐다 */
  addEventListener("pr-me", ev => { if (ev.detail && ev.detail !== me) { me = { ...ev.detail }; paintAva(); } });
})();

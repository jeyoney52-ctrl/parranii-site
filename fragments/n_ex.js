/* ───────── 한 점씩 천천히: 제목·번호로 찾기, 연도, ALL 만 남긴다. 서른 점씩 이어서 본다 ───────── */
(() => {
  const list = gid("works"), more = gid("xf-more"), count = gid("xf-count"), allBtn = gid("xf-all"), ysel = gid("xf-year-sel"), qx = gid("xf-q"), sent = gid("xf-sentinel");
  const flt = { year: "" }, NONE = "__none";
  const PAGE = () => (isNarrow() ? 16 : 30);
  let shown = PAGE(), drawn = 0, current = [];
  const yearOf = w => String(w.year || "").trim();
  function buildYears() {
    const years = {}; let noYear = 0;
    WORKS.forEach(w => { const y = yearOf(w); y ? years[y] = (years[y] || 0) + 1 : noYear++; });
    ysel.innerHTML = `<option value="">연도 전체</option>` + Object.keys(years).sort().reverse().map(y => `<option value="${esc(y)}">${esc(y)} (${years[y]})</option>`).join("") + (noYear ? `<option value="${NONE}">연도 없음 (${noYear})</option>` : "");
    ysel.value = flt.year;
    allBtn.setAttribute("aria-pressed", !flt.year && !qx.value.trim());
  }
  const filtered = () => WORKS.filter(w => (!flt.year || (flt.year === NONE ? !yearOf(w) : yearOf(w) === flt.year)) && workMatch(w, qx.value));
  /* 같은 작품 칸은 다시 만들지 않고 그대로 쓴다(사진이 다시 불러와지며 깜빡이지 않게) */
  const cache = new Map();
  const sigOf = w => [w.title, thumbSrc(w), imgFit(w), workNo(w)].join("\u0001");
  function gitem(w) {
    const k = sigOf(w), c = cache.get(w.id); if (c && c.k === k) return c.el;
    const el = gitemNew(w); cache.set(w.id, { k, el }); return el;
  }
  function gitemNew(w) {
    const a = document.createElement("article"); a.className = "gitem";
    a.innerHTML = `<figure><img src="${esc(thumbSrc(w))}" alt="${esc(w.title)}" loading="lazy" decoding="async" style="${imgFit(w)}"></figure><p><span class="no">No. ${String(workNo(w)).padStart(2, "0")}</span>${esc(w.title)}</p>`;
    a.querySelector("figure").addEventListener("click", () => lb.open(w, a.querySelector("figure")));
    return a;
  }
  function render(append) {
    const part = current.slice(0, shown);
    if (!current.length) { list.innerHTML = `<p class="xf-empty">${WORKS.length ? "조건에 맞는 작품이 없어요. ‘ALL’을 눌러 처음으로 돌아가 보세요." : "아직 전시된 작품이 없어요."}</p>`; drawn = 0; }
    else if (!append) { list.replaceChildren(...part.map(gitem)); drawn = part.length; }
    else { part.slice(drawn).forEach(w => list.appendChild(gitem(w))); drawn = part.length; }
    const f = flt.year || qx.value.trim();
    count.innerHTML = `총 <b>${WORKS.length}</b>점` + (f ? ` · 조건에 맞는 작품 ${current.length}점` : "") + (current.length > part.length ? ` · ${part.length}점 보는 중` : "");
    list.classList.add("grid");
    more.hidden = !!sentIO || current.length <= part.length; if (sentIO) { sentIO.unobserve(sent); sentIO.observe(sent); }
    more.textContent = `다음 ${Math.min(PAGE(), current.length - part.length)}점 더 보기 (남은 ${current.length - part.length}점)`;
  }
  function reset() { shown = PAGE(); current = filtered(); render(false); }
  const clearAll = () => { flt.year = ""; qx.value = ""; buildYears(); reset(); };
  allBtn.addEventListener("click", clearAll);
  ysel.addEventListener("change", () => { flt.year = ysel.value; buildYears(); reset(); });
  let qt; qx.addEventListener("input", e => { if (e.isComposing) return; clearTimeout(qt); qt = setTimeout(() => { buildYears(); reset(); }, 200); });
  qx.addEventListener("compositionend", () => { buildYears(); reset(); });
  more.addEventListener("click", () => { shown += PAGE(); current = filtered(); render(true); });
  // 바닥 근처에 오면 다음 작품을 자동으로 이어 붙인다
  const sentIO = "IntersectionObserver" in window ? new IntersectionObserver(es => {
    if (es[0].isIntersecting && drawn && current.length > shown) { shown += PAGE(); render(true); }
  }, { rootMargin: "900px 0px" }) : null;
  /* 작품 데이터가 바뀌어도(작품 관리에서 저장 등) 보던 개수와 스크롤 위치는 그대로 두고, 바뀐 칸만 고친다 */
  let lastSig = null;
  onWorks(() => {
    buildYears(); const next = filtered(), sig = next.map(w => w.id + "\u0002" + sigOf(w)).join("\u0003");
    if (sig === lastSig) return; const first = lastSig === null; lastSig = sig; current = next;
    if (first) shown = PAGE(); render(false);
  });
})();

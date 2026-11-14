
/* ───────── 작은 사진(목록 · 전시 안 작품) 보이는 모양 ─────────
   작품마다 fit(꽉 차게 cover / 비율 유지 contain), focusX · focusY(어느 쪽을 보여 줄지, %), zoom(확대, 1~3)을 저장할 수 있다.
   저장된 값이 없으면 예전처럼 가운데를 꽉 차게 보여 준다(도자기 · 오브제 재료는 비율 유지). */
const fitOf = w => w.fit || (isWhole(w) ? "contain" : "cover");
function imgFit(w) {
  const fit = fitOf(w), x = w.focusX ?? 50, y = w.focusY ?? THUMB_Y[w.id] ?? 50, z = Math.max(.5, Math.min(3, +w.zoom || 1));
  const custom = w.fit || w.focusX != null || w.focusY != null || (w.zoom && w.zoom != 1) || THUMB_Y[w.id] != null || fit === "contain";
  if (!custom) return "";
  const base = "max-width:none;max-height:none;height:auto;aspect-ratio:1;display:block;margin:auto;";
  return fit === "contain"
    ? base + `width:86%;object-fit:contain;object-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%`
    : base + `width:100%;object-fit:cover;object-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%`;
}

/* ───────── 사진 편집 팝업 (작품 관리) ─────────
   openPhotoEditor({ src, w, onSave(patch), onReplace() }) */
function openPhotoEditor({ src, w, onSave, onReplace }) {
  const st = { fit: fitOf(w), x: w.focusX ?? 50, y: w.focusY ?? THUMB_Y[w.id] ?? 50, zoom: +w.zoom || 1 };
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = document.createElement("div"); el.className = "pe"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "사진 편집");
  const POS = [[0, 0, "↖", "왼쪽 위"], [50, 0, "↑", "위"], [100, 0, "↗", "오른쪽 위"], [0, 50, "←", "왼쪽"], [50, 50, "•", "가운데"], [100, 50, "→", "오른쪽"], [0, 100, "↙", "왼쪽 아래"], [50, 100, "↓", "아래"], [100, 100, "↘", "오른쪽 아래"]];
  el.innerHTML = `<div class="pe-box">
    <div class="pe-head"><b>사진 편집 · ${e(w.title || "제목 없는 작품")}</b><button type="button" class="pe-x" data-a="cancel" aria-label="닫기">닫기</button></div>
    <div class="pe-body">
      <div class="pe-left">
        <div class="pe-stage" title="끌어서 위치를 옮길 수 있어요"><img alt="" draggable="false"></div>
        <p class="pe-hint">사진을 끌어서 보이는 부분을 옮길 수 있어요.</p>
      </div>
      <div class="pe-right">
        <div class="pe-group"><span class="pe-lab">맞춤</span><div class="pe-seg"><button type="button" data-fit="cover">꽉 차게</button><button type="button" data-fit="contain">비율 유지 (전체 보기)</button></div></div>
        <div class="pe-group"><span class="pe-lab">확대 · 축소 <em class="pe-zv"></em></span><div class="pe-zoom"><button type="button" data-z="-1" aria-label="축소">−</button><input type="range" min="50" max="300" step="5" aria-label="확대 비율"><button type="button" data-z="1" aria-label="확대">+</button></div></div>
        <div class="pe-group"><span class="pe-lab">정렬 (보여 줄 쪽)</span><div class="pe-pos">${POS.map(([x, y, s, t]) => `<button type="button" data-x="${x}" data-y="${y}" title="${t}" aria-label="${t}">${s}</button>`).join("")}</div></div>
        <div class="pe-group"><span class="pe-lab">미리보기</span><div class="pe-prev"><div class="pe-card"><div class="pe-mini"><img alt=""></div><span>목록 · 전시에서</span></div><div class="pe-card sm"><div class="pe-mini"><img alt=""></div><span>휴대폰 크기</span></div></div></div>
        <div class="pe-tools"><button type="button" class="btn quiet" data-a="replace">사진 바꾸기</button><button type="button" class="btn quiet" data-a="reset">처음 상태로</button></div>
      </div>
    </div>
    <div class="pe-foot"><span class="pe-msg"></span><button type="button" class="btn quiet" data-a="cancel">취소</button><button type="button" class="btn primary" data-a="save">저장</button></div>
  </div>`;
  const stage = el.querySelector(".pe-stage"), imgs = [...el.querySelectorAll(".pe-stage img, .pe-mini img")], range = el.querySelector("input[type=range]");
  imgs.forEach(i => i.src = src);
  const cur = () => ({ id: w.id, medium: w.medium, fit: st.fit, focusX: Math.round(st.x), focusY: Math.round(st.y), zoom: Math.round(st.zoom * 100) / 100 });
  function paint() {
    const style = imgFit(cur()); imgs.forEach(i => i.setAttribute("style", style));
    el.querySelectorAll("[data-fit]").forEach(b => b.setAttribute("aria-pressed", b.dataset.fit === st.fit));
    el.querySelectorAll(".pe-pos button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.x === Math.round(st.x) && +b.dataset.y === Math.round(st.y)));
    range.value = Math.round(st.zoom * 100); el.querySelector(".pe-zv").textContent = Math.round(st.zoom * 100) + "%";
    el.querySelectorAll(".pe-stage, .pe-mini").forEach(m => m.classList.toggle("whole", st.fit === "contain"));
  }
  const close = () => { el.remove(); removeEventListener("keydown", key, true); document.body.classList.remove("pk-open"); };
  const key = ev => { if (ev.key === "Escape") { ev.stopPropagation(); close(); } };
  el.addEventListener("click", async ev => {
    const t = ev.target.closest("button"); if (!t) { if (ev.target === el) close(); return; }
    if (t.dataset.fit) { st.fit = t.dataset.fit; if (st.fit === "contain") { st.x = 50; st.y = 50; } paint(); }
    if (t.dataset.z) { st.zoom = Math.max(.5, Math.min(3, st.zoom + (+t.dataset.z) * .1)); paint(); }
    if (t.dataset.x != null) { st.x = +t.dataset.x; st.y = +t.dataset.y; paint(); }
    const a = t.dataset.a;
    if (a === "cancel") close();
    if (a === "reset") { st.fit = isWhole(w) ? "contain" : "cover"; st.x = 50; st.y = THUMB_Y[w.id] ?? 50; st.zoom = 1; paint(); }
    if (a === "replace") { close(); onReplace && onReplace(); }
    if (a === "save") { t.disabled = true; el.querySelector(".pe-msg").textContent = "저장 중…"; try { const c = cur(); await onSave({ fit: c.fit, focusX: c.focusX, focusY: c.focusY, zoom: c.zoom }); close(); } catch { el.querySelector(".pe-msg").textContent = "저장하지 못했어요. 다시 눌러 주세요."; t.disabled = false; } }
  });
  range.addEventListener("input", () => { st.zoom = range.value / 100; paint(); });
  /* 끌어서 위치 옮기기: 끄는 방향으로 사진이 따라오게 */
  stage.addEventListener("pointerdown", ev => {
    ev.preventDefault(); stage.setPointerCapture(ev.pointerId); let lx = ev.clientX, ly = ev.clientY; const size = stage.clientWidth;
    const mv = m => { const dx = m.clientX - lx, dy = m.clientY - ly; lx = m.clientX; ly = m.clientY; const k = 100 / size * (st.fit === "contain" ? 1 : 1.6) / st.zoom; st.x = Math.max(0, Math.min(100, st.x - dx * k)); st.y = Math.max(0, Math.min(100, st.y - dy * k)); paint(); };
    const up = () => { stage.removeEventListener("pointermove", mv); stage.removeEventListener("pointerup", up); stage.removeEventListener("pointercancel", up); };
    stage.addEventListener("pointermove", mv); stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  });
  stage.addEventListener("wheel", ev => { ev.preventDefault(); st.zoom = Math.max(.5, Math.min(3, st.zoom - Math.sign(ev.deltaY) * .05)); paint(); }, { passive: false });
  addEventListener("keydown", key, true); document.body.classList.add("pk-open");
  (document.body.classList.contains("admin") && document.getElementById("admin") || document.body).appendChild(el);
  paint(); el.querySelector(".pe-x").focus();
}

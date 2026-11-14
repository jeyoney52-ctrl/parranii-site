
/* ───────── 소식 (News) ─────────
   데이터: 클라우드 db의 news 모음 { title, date:"2026-11-14", tag, body, link, imageId }
   방문자: #news 페이지에서 최근 날짜 순으로 본다. 공개 사이트에는 ‘사이트 반영하기’ 때 함께 올라간다.
   작가: 작품관리 → 소식 탭에서 쓰고 고치고 지운다. */
(() => {
  const A = id => document.getElementById(id);
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const blob = id => id ? "/_blob/" + id : "";
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const fmt = s => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || ""); return m ? `${m[1]}. ${+m[2]}. ${+m[3]}.` : (s || ""); };
  const byDate = (a, b) => String(b.data().date || "").localeCompare(String(a.data().date || "")) || (b.data().at || 0) - (a.data().at || 0);
  const TAGS = ["전시", "소식", "작업 노트", "언론", "수상", "행사"];
  let docs = [], loaded = false;

  /* ── 방문자 페이지 ── */
  const page = A("news-page"), list = A("nw-list"), tagsEl = A("nw-tags");
  let tag = "", open = new Set();
  function paint() {
    if (!list) return;
    const all = docs.filter(d => !d.data().hidden && (d.data().title || d.data().body));
    const tags = [...new Set(all.map(d => (d.data().tag || "").trim()).filter(Boolean))];
    if (tag && !tags.includes(tag)) tag = "";
    tagsEl.innerHTML = tags.length > 1 ? [["", "All"], ...tags.map(t => [t, t])].map(([v, l]) => `<button type="button" data-t="${e(v)}" aria-pressed="${v === tag}">${e(l)}</button>`).join("") : "";
    const rows = all.filter(d => !tag || (d.data().tag || "").trim() === tag);
    list.innerHTML = !loaded ? `<p class="nw-empty">불러오는 중…</p>` : rows.length ? rows.map(d => { const x = d.data(), long = (x.body || "").length > 260 || (x.body || "").split("\n").length > 5;
      return `<article class="nw-post" id="news-${e(d.id)}">
        <div class="nw-meta"><time datetime="${e(x.date)}">${e(fmt(x.date))}</time>${x.tag ? `<span class="tag">${e(x.tag)}</span>` : ""}</div>
        <div class="nw-main"><div><h2>${e(x.title || "")}</h2>${x.body ? `<div class="txt${long && !open.has(d.id) ? " clip" : ""}">${e(x.body)}</div>` : ""}
          ${long ? `<button class="nw-more" type="button" data-open="${e(d.id)}">${open.has(d.id) ? "접기" : "더 읽기"}</button>` : ""}
          ${/^https?:\/\//i.test(x.link || "") ? `<div><a class="nw-link" href="${e(x.link)}" target="_blank" rel="noopener">${e(x.linkLabel || "자세히 보기")} ↗</a></div>` : ""}</div>
          ${x.imageId ? `<figure class="nw-fig"><img src="${e(blob(x.imageId))}" alt="${e(x.title || "")}" loading="lazy" data-zoom="${e(blob(x.imageId))}"></figure>` : ""}</div>
      </article>`; }).join("") : `<p class="nw-empty">아직 올라온 소식이 없어요.</p>`;
  }
  if (page) {
    tagsEl.addEventListener("click", ev => { const b = ev.target.closest("button[data-t]"); if (b) { tag = b.dataset.t; paint(); } });
    list.addEventListener("click", ev => {
      const m = ev.target.closest("[data-open]"); if (m) { const id = m.dataset.open; open.has(id) ? open.delete(id) : open.add(id); paint(); return; }
      const z = ev.target.closest("[data-zoom]"); if (z) window.open(z.dataset.zoom, "_blank", "noopener");
    });
    const route = () => { const on = location.hash === "#news"; document.body.classList.toggle("newsp", on); page.hidden = !on; if (on) { scrollTo(0, 0); document.title = "News · Gallery Parranii"; paint(); } };
    addEventListener("hashchange", route); route();
  }

  /* ── 데이터 받기(방문자 · 작가 공통) ── */
  let unsub = null, adm = null;
  async function sub(db) {
    if (!db) { loaded = true; paint(); return; }
    try { unsub && unsub(); } catch {}
    unsub = db.collection("news").onSnapshot(s => { docs = s.docs.slice().sort(byDate); loaded = true; paint(); adm && adm(); }, () => { loaded = true; paint(); });
  }
  (async () => { sub(await DB); })();
  addEventListener("parranii:reconnect", ev => { if (ev.detail && ev.detail.db) sub(ev.detail.db); });

  /* ── 작품관리 → 소식 탭 ── */
  const alist = A("nw-alist"); if (!alist) return;
  let db = null, assets = null, can = false, started = false;
  const note = t => { A("nw-note").hidden = !t; A("nw-note").textContent = t || ""; };
  const stat = (row, t, err) => { const s = row.querySelector(".adm-status"); if (s) { s.textContent = t; s.classList.toggle("err", !!err); } };
  async function start() {
    if (started) return; started = true;
    db = await DB; const user = await window.claude?.use?.("user"); can = !!(user && await user.canEdit()); assets = can ? await window.claude.use("assets").catch(() => null) : null;
    if (!db || !can) { note(!db ? "이 화면에서는 데이터를 불러올 수 없어요. claude.ai에서 로그인한 상태로 열어 주세요." : "관리는 이 갤러리의 소유자와 편집자만 할 수 있어요."); return; }
    adm = render; render();
  }
  document.querySelectorAll('.adm-tab[data-tab="news"]').forEach(b => b.addEventListener("click", start));
  const shrink = file => new Promise(res => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { try { const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); c.toBlob(b => { URL.revokeObjectURL(u); res(b); }, "image/jpeg", .86); } catch { URL.revokeObjectURL(u); res(null); } }; im.onerror = () => { URL.revokeObjectURL(u); res(null); }; im.src = u; });
  const save = async (row, id, patch) => { stat(row, "저장 중…"); try { await db.collection("news").doc(id).update(patch); stat(row, "저장됨"); } catch { stat(row, "저장하지 못했어요. 다시 시도해 주세요.", true); } };
  function render() {
    if (!can) return;
    if (alist.contains(document.activeElement)) { setTimeout(() => { if (!alist.contains(document.activeElement)) render(); }, 400); return; }
    note(!loaded ? "불러오는 중…" : docs.length ? "" : "아직 쓴 소식이 없어요. ‘소식 쓰기’를 눌러 첫 소식을 써 보세요.");
    alist.innerHTML = "";
    docs.forEach(d => { const x = d.data(), row = document.createElement("article"); row.className = "adm-item";
      row.innerHTML = `<div class="adm-thumb"><div class="nw-ph${x.imageId ? " has" : ""}" style="${x.imageId ? `background-image:url('${e(blob(x.imageId))}')` : ""}">사진 없음</div>
          <div class="nw-phb"><label>${x.imageId ? "사진 바꾸기" : "사진 넣기"}<input type="file" accept="image/*"></label>${x.imageId ? `<button type="button" data-noimg>사진 빼기</button>` : ""}</div></div>
        <div class="adm-fields">
          <label class="full">제목<input name="title" type="text"></label>
          <label>날짜<input name="date" type="date"></label>
          <label>분류 (골라 쓰거나 직접 쓰기)<input name="tag" type="text" list="nw-tag-list"></label>
          <label class="chk" style="align-self:end"><input name="hidden" type="checkbox"> 잠시 숨기기</label>
          <label class="full">내용<textarea name="body" class="big"></textarea></label>
          <label class="full">링크 (선택 · https:// 로 시작)<input name="link" type="url" placeholder="https://"></label>
          <label class="full">링크 글자 (비워 두면 ‘자세히 보기’)<input name="linkLabel" type="text"></label>
          <div class="adm-rowbar full" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="adm-status"></span><button class="btn quiet" type="button" data-del style="margin-left:auto">소식 지우기</button></div>
        </div>`;
      const f = n => row.querySelector(`[name="${n}"]`);
      ["title", "date", "tag", "body", "link", "linkLabel"].forEach(k => { f(k).value = x[k] || ""; f(k).addEventListener("change", async () => {
        const v = f(k).value.trim();
        if (!v && x[k] && (k === "title" || k === "body") && typeof askConfirm === "function" && !(await askConfirm({ title: "내용을 모두 지울까요?", body: "이 칸의 글이 사라져요.", ok: "지우기" }))) { f(k).value = x[k]; return; }
        x[k] = v; save(row, d.id, { [k]: v }); }); });
      f("hidden").checked = !!x.hidden; f("hidden").addEventListener("change", () => save(row, d.id, { hidden: f("hidden").checked }));
      row.querySelector("input[type=file]").addEventListener("change", async ev => {
        const file = ev.target.files[0]; ev.target.value = ""; if (!file) return;
        if (!assets) { stat(row, "이 화면에서는 사진을 올릴 수 없어요.", true); return; }
        if (x.imageId && typeof askConfirm === "function" && !(await askConfirm({ title: "사진을 바꿀까요?", body: "지금 사진이 새 사진으로 바뀌어요.", ok: "바꾸기", danger: false }))) return;
        stat(row, "사진 올리는 중…");
        try { const b = await shrink(file); if (!b) throw 0; const up = await assets.upload(b, { type: "image/jpeg" }); const old = x.imageId; await save(row, d.id, { imageId: up.id }); if (old && old !== up.id) assets.delete(old).catch(() => {}); }
        catch { stat(row, "사진을 올리지 못했어요.", true); }
      });
      row.querySelector("[data-noimg]")?.addEventListener("click", async () => {
        if (typeof askConfirm === "function" && !(await askConfirm({ title: "사진을 뺄까요?", body: "올려 둔 사진이 지워져요.", ok: "사진 빼기" }))) return;
        const old = x.imageId; await save(row, d.id, { imageId: "" }); if (assets && old) assets.delete(old).catch(() => {});
      });
      row.querySelector("[data-del]").addEventListener("click", async () => {
        if (typeof askConfirm === "function" && !(await askConfirm({ title: `‘${x.title || "이 소식"}’을(를) 지울까요?`, body: "지운 소식은 되돌릴 수 없어요. (지우기 전에 자동으로 백업해 둬요)", ok: "지우기" }))) return;
        stat(row, "지우는 중…");
        try { await window.__backupNow?.("소식 지우기 전"); await db.collection("news").doc(d.id).delete(); if (assets && x.imageId) assets.delete(x.imageId).catch(() => {}); } catch { stat(row, "지우지 못했어요.", true); }
      });
      alist.appendChild(row); });
    if (!A("nw-tag-list")) { const dl = document.createElement("datalist"); dl.id = "nw-tag-list"; dl.innerHTML = TAGS.map(t => `<option value="${t}">`).join(""); document.body.appendChild(dl); }
  }
  A("nw-add").addEventListener("click", async () => {
    await start(); if (!can) return;
    try { await db.collection("news").add({ title: "새 소식", date: today(), tag: "소식", body: "", link: "", linkLabel: "", imageId: "", hidden: false, at: Date.now() }); scrollTo({ top: A("nw-alist").getBoundingClientRect().top + scrollY - 120 }); }
    catch { note("소식을 추가하지 못했어요. 위쪽 연결 상태를 확인해 주세요."); }
  });
})();

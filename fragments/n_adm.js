
/* ───────── 관리자: 전시(첫 화면 포스터)와 Works 묶음 ───────── */
(() => {
  const sec = document.getElementById("admin"), A = id => document.getElementById(id), P2 = n => String(n).padStart(2, "0");
  let exLoaded = false, grLoaded = false; let db = null, assets = null, can = false, started = false, exDocs = [], grDocs = [], wDocs = [];
  const ph = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e6e5ea"/></svg>');
  sec.dataset.tab = "works";
  function setTab(t) { sec.dataset.tab = t; document.querySelectorAll(".adm-tab").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === t)); if (t !== "works") start(); }
  document.querySelectorAll(".adm-tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  addEventListener("hashchange", () => { if (location.hash !== "#admin") setTab("works"); });
  async function start() {
    if (started) return; started = true;
    db = await DB; const user = await window.claude?.use?.("user"); can = !!(user && await user.canEdit()); assets = can ? await window.claude.use("assets") : null;
    if (!db || !can) { ["ex-note", "gr-note"].forEach(i => A(i).textContent = !db ? "이 화면에서는 데이터를 불러올 수 없어요. claude.ai에서 로그인한 상태로 열어 주세요." : "관리는 이 갤러리의 소유자와 편집자만 할 수 있어요."); return; }
    subscribe();
  }
  let unsubs = [];
  function subscribe() {
    unsubs.forEach(u => { try { u(); } catch {} }); unsubs = [];
    const bad = () => { window.__conn?.fail("목록을 받지 못했어요"); ["ex-note", "gr-note"].forEach(i => { A(i).hidden = false; A(i).textContent = "불러오지 못했어요. 위쪽의 ‘연결하기’를 눌러 주세요."; }); };
    unsubs.push(db.collection("settings").onSnapshot(s => { const ab = s.docs.find(x => x.id === "about"); fillAbout(ab ? ab.data() : null); const ct = s.docs.find(x => x.id === "contact"); fillContact(ct ? ct.data() : null); const d = s.docs.find(x => x.id === "site"); A("ex-sort").value = d && d.data().exSort === "manual" ? "manual" : "date"; }, () => {}));
    unsubs.push(db.collection("exhibitions").orderBy("order").onSnapshot(s => { exDocs = s.docs; exLoaded = true; renderEx(); }, bad));
    unsubs.push(db.collection("groups").orderBy("order").onSnapshot(s => { grDocs = s.docs; grLoaded = true; renderGr(); }, bad));
    unsubs.push(db.collection("works").orderBy("order").onSnapshot(s => { wDocs = s.docs; renderEx(); renderGr(); }, bad));
  }
  addEventListener("parranii:reconnect", e => { if (!started || !can) return; db = e.detail.db || db; subscribe(); });
  const wTitle = d => (d.data().title || "(제목 없음)");
  const wThumb = d => webSrc(d.id, d.data()) || ph;
  const wNo = id => { const i = wDocs.findIndex(d => d.id === id); return i < 0 ? "" : P2(i + 1); };
  /* 작품 고르기: 작은 그림과 번호 · 제목을 보면서 검색하고, 눌러서 넣는다 */
  let pk = null;
  function picker(o) { // o: { title, items:[{id,no,title,thumb,note,done}], onPick(id) }
    closePicker();
    const el = document.createElement("div"); el.className = "pk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", o.title);
    el.innerHTML = `<div class="pk-box"><div class="pk-head"><b>${esc(o.title)}</b><button type="button" class="pk-x">닫기</button></div><input class="pk-q" type="search" placeholder="제목 · 번호로 찾기" autocomplete="off" aria-label="작품 찾기"><div class="pk-grid"></div><p class="pk-foot"></p></div>`;
    sec.appendChild(el); document.body.classList.add("pk-open"); pk = el;
    const grid = el.querySelector(".pk-grid"), q = el.querySelector(".pk-q"), foot = el.querySelector(".pk-foot"); let added = 0;
    const draw = () => { const t = q.value.trim().toLowerCase(); const l = o.items.filter(x => !t || (x.title + " " + x.no).toLowerCase().includes(t));
      grid.innerHTML = l.map(x => `<button type="button" class="pk-item${x.done ? " done" : ""}" data-id="${esc(x.id)}" ${x.done ? "disabled" : ""}><img src="${esc(x.thumb)}" alt="" loading="lazy"><span class="n">${esc(x.no)}</span><span class="t">${esc(x.title)}</span>${x.note ? `<span class="o">${esc(x.note)}</span>` : ""}${x.done ? `<i>추가됨</i>` : ""}</button>`).join("") || `<p class="pk-empty">찾는 작품이 없어요.</p>`;
      foot.textContent = added ? `${added}점을 넣었어요. 더 넣으려면 계속 눌러 주세요.` : "눌러서 넣어요. 여러 점을 이어서 넣을 수 있어요."; };
    q.addEventListener("input", draw);
    grid.addEventListener("click", e => { const b = e.target.closest(".pk-item"); if (!b || b.disabled) return; const x = o.items.find(i => i.id === b.dataset.id); if (!x) return; x.done = true; added++; draw(); o.onPick(x.id); });
    el.querySelector(".pk-x").addEventListener("click", closePicker); el.addEventListener("click", e => { if (e.target === el) closePicker(); });
    draw(); q.focus({ preventScroll: true });
  }
  function closePicker() { if (!pk) return; pk.remove(); pk = null; document.body.classList.remove("pk-open"); }
  addEventListener("keydown", e => { if (e.key === "Escape" && pk) { e.stopPropagation(); closePicker(); } }, true);
  const stat = (row, t, err) => { const s = row.querySelector(".adm-status"); if (s) { s.textContent = t; s.classList.toggle("err", !!err); } };
  async function upd(coll, id, row, patch) { stat(row, "저장 중…"); try { await db.collection(coll).doc(id).update(patch); stat(row, "저장됨"); } catch { stat(row, "저장하지 못했어요. 다시 시도해 주세요.", true); } }
  // 포스터 사진: 긴 변 1400px JPEG로 줄여서 올린다
  function posterBlob(file) { return new Promise(res => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { try { const k = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); c.toBlob(b => { URL.revokeObjectURL(u); res(b ? { blob: b, ar: c.width / c.height } : null); }, "image/jpeg", .86); } catch { URL.revokeObjectURL(u); res(null); } }; im.onerror = () => { URL.revokeObjectURL(u); res(null); }; im.src = u; }); }
  // 입력 칸: 한글 조합 중에는 저장하지 않고, 입력 중에는 목록을 다시 그리지 않는다
  const pending = new Map();
  function guarded(listEl, key, fn) {
    const f = document.activeElement; if (f && listEl.contains(f) && /^(INPUT|TEXTAREA)$/.test(f.tagName) && f.type !== "file") { pending.set(key, fn); return; }
    pending.delete(key); fn();
  }
  ["ex-list", "gr-list"].forEach(id => A(id).addEventListener("focusout", () => setTimeout(() => { const f = document.activeElement; if (f && A(id).contains(f) && /^(INPUT|TEXTAREA)$/.test(f.tagName)) return; const fn = pending.get(id); if (fn) { pending.delete(id); fn(); } }, 0)));
  function bind(row, coll, id, data, keys) {
    keys.forEach(k => { const el = row.querySelector(`[name=${k}]`); el.value = data[k] ?? ""; let t, comp = false;
      const commit = async fin => { clearTimeout(t); const old = data[k] ?? ""; if (el.value === old) return; const g = await guardText(old, el.value, fin, el.closest("label")?.firstChild?.textContent?.trim() || "내용"); if (g === "wait") return; if (g === "revert") { el.value = old; stat(row, "되돌렸어요."); return; } data[k] = el.value; upd(coll, id, row, { [k]: el.value }); };
      el.addEventListener("compositionstart", () => { comp = true; clearTimeout(t); });
      el.addEventListener("compositionend", () => { comp = false; clearTimeout(t); t = setTimeout(commit, 900); });
      el.addEventListener("input", e => { clearTimeout(t); stat(row, "입력 중…"); if (comp || e.isComposing) return; t = setTimeout(commit, 900); });
      el.addEventListener("blur", () => { if (!comp) commit(true); }); });
  }
  function bindPoster(row, coll, id, data) {
    row.querySelector("input[type=file]").addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return; if (!assets) { stat(row, "이 화면에서는 사진을 올릴 수 없어요.", true); return; }
      if ((data.posterId || data.poster) && !(await askConfirm({ title: "포스터를 바꿀까요?", body: "지금 포스터가 새 사진으로 바뀌어요.", ok: "바꾸기", danger: false }))) { e.target.value = ""; return; }
      stat(row, "포스터 올리는 중…");
      try { const pb = await posterBlob(file); if (!pb) throw 0; const up = await assets.upload(pb.blob, { type: "image/jpeg" }); const old = data.posterId;
        await upd(coll, id, row, { posterId: up.id, ar: pb.ar }); if (old && old !== up.id) assets.delete(old).catch(() => {}); }
      catch (err) { stat(row, { too_large: "사진이 너무 커요 (20MB 이하).", unsupported_type: "JPG, PNG, WEBP, GIF 사진만 올릴 수 있어요." }[err?.code] || "포스터를 올리지 못했어요. 다시 시도해 주세요.", true); }
    });
  }
  async function swap(coll, docs, i, j, row) { const a = docs[i], b = docs[j]; if (!a || !b) return; const oa = a.data().order ?? i, ob = b.data().order ?? j; stat(row, "순서 바꾸는 중…");
    try { await db.collection(coll).doc(a.id).update({ order: ob === oa ? j : ob }); await db.collection(coll).doc(b.id).update({ order: ob === oa ? i : oa }); } catch { stat(row, "순서를 바꾸지 못했어요.", true); } }
  function delBtn(row, doc, coll, onDone) { const del = row.querySelector("[data-del]"); del.addEventListener("click", async () => {
    const t = doc.data().title || doc.data().name || "이 항목", what = coll === "exhibitions" ? "전시" : "Works 묶음";
    if (!(await askConfirm({ title: `‘${t}’ ${what}${coll === "exhibitions" ? "를" : "을"} 정말 지울까요?`, body: coll === "exhibitions" ? "포스터와 이 전시에 넣은 작품 목록이 함께 사라져요. (작품 자체는 지워지지 않아요) 지우기 전에 자동으로 백업해 둘게요." : "묶음만 사라지고 작품은 지워지지 않아요. 지우기 전에 자동으로 백업해 둘게요." }))) return;
    stat(row, "지우는 중…"); try { await window.__backupNow?.("지우기 전"); await db.collection(coll).doc(doc.id).delete(); const pid = doc.data().posterId; if (assets && pid) assets.delete(pid).catch(() => {}); onDone && onDone(); } catch { stat(row, "지우지 못했어요.", true); } }); }
  const head = (d, i, n, pic) => `<div class="adm-thumb"><div class="ph" style="background-image:url('${pic ? String(pic).replace(/'/g, "%27") : ""}')"></div><label class="btn quiet" for="pf-${d.id}">포스터 바꾸기</label><input type="file" id="pf-${d.id}" accept="image/png,image/jpeg,image/webp,image/gif"></div>`;
  const rowBar = (i, n) => `<div class="adm-row"><div class="left"><span class="adm-num">${P2(i + 1)}</span><button class="btn quiet" type="button" data-move="-1" ${i === 0 ? "disabled" : ""} aria-label="앞으로">↑</button><button class="btn quiet" type="button" data-move="1" ${i === n - 1 ? "disabled" : ""} aria-label="뒤로">↓</button><span class="adm-status"></span></div><div class="right"><button class="btn danger" type="button" data-del>삭제</button></div></div>`;

  /* ── 전시 ── */
  const pend = {};
  function renderEx(force) { if (!force) { guarded(A("ex-list"), "ex-list", () => renderEx(true)); return; }
    const list = A("ex-list"), note = A("ex-note"); list.innerHTML = ""; note.hidden = exDocs.length > 0; note.textContent = "아직 저장된 전시가 없어요. ‘전시 추가’로 만들거나, 지금 걸려 있는 전시를 불러올 수 있어요.";
    A("ex-seed").hidden = !exLoaded || exDocs.length > 0; if (!exLoaded) { note.hidden = false; note.textContent = "불러오는 중…"; return; }
    exDocs.forEach((d, i) => { const e = d.data(), ids = Array.isArray(e.workIds) ? e.workIds.slice() : [];
      const row = document.createElement("article"); row.className = "adm-item"; row.dataset.id = d.id;
      const avail = wDocs.filter(w => !ids.includes(w.id));
      row.innerHTML = head(d, i, exDocs.length, posterOf(e)) + `<div class="adm-fields">
        <label class="full">제목<input name="title" type="text"></label><label class="full">부제 (예: 김성순 개인전 · The 3rd Solo Exhibition)<input name="sub" type="text"></label>
        <label>전시 기간 (예: 2017.9.9 – 9.14)<input name="period" type="text"></label><label>장소<input name="venue" type="text"></label>
        <div class="sub"><b>이 전시에 나온 작품 ${ids.length}점</b>
          <div class="sub-add"><button class="btn quiet" type="button" data-pick>＋ 작품 고르기</button></div>
          <div class="chips2">${ids.map(id => { const w = wDocs.find(x => x.id === id); return w ? `<span class="chip2"><img src="${esc(wThumb(w))}" alt=""><span>${wNo(id)} ${esc(wTitle(w))}</span><button type="button" data-rm="${esc(id)}" aria-label="${esc(wTitle(w))} 빼기">×</button></span>` : ""; }).join("") || `<span style="color:var(--mute);font-size:13px">아직 넣은 작품이 없어요.</span>`}</div></div>
        ${rowBar(i, exDocs.length)}</div>`;
      bind(row, "exhibitions", d.id, e, ["title", "sub", "period", "venue"]); bindPoster(row, "exhibitions", d.id, e);
      row.querySelector("[data-pick]").addEventListener("click", () => picker({ title: `‘${e.title || "전시"}’에 작품 넣기`,
        items: wDocs.map(w => ({ id: w.id, no: wNo(w.id), title: wTitle(w), thumb: wThumb(w), done: ids.includes(w.id) })),
        onPick: id => { const cur = exDocs.find(x => x.id === d.id); const have = cur && Array.isArray(cur.data().workIds) ? cur.data().workIds : []; pend[d.id] = [...new Set([...(pend[d.id] || have), ...have, id])]; upd("exhibitions", d.id, row, { workIds: pend[d.id] }); } }));
      row.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", async () => { const w = wDocs.find(x => x.id === b.dataset.rm); if (!(await askConfirm({ title: `‘${w ? wTitle(w) : "이"}’ 작품을 이 전시에서 뺄까요?`, body: "작품 자체는 지워지지 않고, 이 전시 목록에서만 빠져요.", ok: "빼기" }))) return; pend[d.id] = (pend[d.id] || ids).filter(x => x !== b.dataset.rm); upd("exhibitions", d.id, row, { workIds: pend[d.id] }); }));
      row.querySelectorAll("[data-move]").forEach(b => b.addEventListener("click", () => swap("exhibitions", exDocs, i, i + +b.dataset.move, row)));
      delBtn(row, d, "exhibitions"); list.appendChild(row); });
  }
  A("ex-sort").addEventListener("change", async e => { try { await db.collection("settings").doc("site").set({ exSort: e.target.value }); } catch { A("ex-note").hidden = false; A("ex-note").textContent = "정렬을 저장하지 못했어요."; } });
  A("ex-add").addEventListener("click", async () => { const order = exDocs.reduce((m, d) => Math.max(m, d.data().order ?? 0), 0) + 1; try { await db.collection("exhibitions").add({ title: "새 전시", sub: "", period: "", venue: "", poster: "", ar: .75, workIds: [], order }); } catch { A("ex-note").hidden = false; A("ex-note").textContent = "전시를 추가하지 못했어요."; } });
  A("ex-seed").addEventListener("click", async () => { try { for (const d of EXH_DEFAULT) if (!exDocs.some(x => x.id === d.id)) await db.collection("exhibitions").doc(d.id).set({ title: d.title, sub: d.sub, period: d.period, venue: d.venue, poster: d.poster, ar: d.ar, workIds: d.workIds, order: d.order }); } catch { A("ex-note").hidden = false; A("ex-note").textContent = "불러오지 못했어요."; } });

  /* ── Works 묶음 ── */
  function renderGr(force) { if (!force) { guarded(A("gr-list"), "gr-list", () => renderGr(true)); return; }
    const list = A("gr-list"), note = A("gr-note"); list.innerHTML = ""; note.hidden = grDocs.length > 0; note.textContent = "아직 저장된 묶음이 없어요. ‘묶음 추가’로 만들거나, 지금 묶음을 불러올 수 있어요.";
    A("gr-seed").hidden = !grLoaded || grDocs.length > 0; if (!grLoaded) { note.hidden = false; note.textContent = "불러오는 중…"; return; }
    const live = grDocs.map(d => ({ id: d.id, name: d.data().name || "(이름 없음)" }));
    const gOf = w => { const g = w.data().group; if (g && live.some(x => x.id === g)) return g; const a = autoGroup(w.data()); return live.some(x => x.id === a) ? a : (live.length ? live[live.length - 1].id : ""); };
    grDocs.forEach((d, i) => { const g = d.data(), mem = wDocs.filter(w => gOf(w) === d.id), others = wDocs.filter(w => gOf(w) !== d.id);
      const row = document.createElement("article"); row.className = "adm-item"; row.dataset.id = d.id;
      const opts = cur => live.map(x => `<option value="${esc(x.id)}" ${x.id === cur ? "selected" : ""}>${esc(x.name)}</option>`).join("");
      row.innerHTML = head(d, i, grDocs.length, posterOf(g)) + `<div class="adm-fields">
        <label class="full">이름<input name="name" type="text"></label><label>영문 이름<input name="en" type="text"></label><label class="full">설명 (포스터를 열었을 때 나와요)<input name="desc" type="text"></label>
        <div class="sub"><b>이 묶음의 작품 ${mem.length}점</b>
          <div class="sub-add"><button class="btn quiet" type="button" data-pick>＋ 다른 묶음의 작품 가져오기</button></div>
          <div class="members">${mem.map(w => `<div class="member"><img src="${esc(wThumb(w))}" alt=""><span>${wNo(w.id)} ${esc(wTitle(w))}</span><select data-w="${esc(w.id)}" aria-label="${esc(wTitle(w))} 옮기기">${opts(d.id)}</select></div>`).join("") || `<span style="color:var(--mute);font-size:13px">아직 작품이 없어요.</span>`}</div></div>
        ${rowBar(i, grDocs.length)}</div>`;
      bind(row, "groups", d.id, g, ["name", "en", "desc"]); bindPoster(row, "groups", d.id, g);
      const move = async (wid, to) => { stat(row, "옮기는 중…"); try { await db.collection("works").doc(wid).update({ group: to }); stat(row, "옮겼어요"); } catch { stat(row, "옮기지 못했어요.", true); } };
      row.querySelector("[data-pick]").addEventListener("click", () => picker({ title: `‘${g.name || "묶음"}’으로 작품 가져오기`,
        items: others.map(w => ({ id: w.id, no: wNo(w.id), title: wTitle(w), thumb: wThumb(w), note: "지금: " + ((live.find(x => x.id === gOf(w)) || {}).name || "-") })), onPick: id => move(id, d.id) }));
      row.querySelectorAll(".member select").forEach(s => s.addEventListener("change", () => move(s.dataset.w, s.value)));
      row.querySelectorAll("[data-move]").forEach(b => b.addEventListener("click", () => swap("groups", grDocs, i, i + +b.dataset.move, row)));
      delBtn(row, d, "groups"); list.appendChild(row); });
  }
  A("gr-add").addEventListener("click", async () => { const order = grDocs.reduce((m, d) => Math.max(m, d.data().order ?? 0), 0) + 1; try { await db.collection("groups").add({ name: "새 묶음", en: "", desc: "", poster: "", ar: .8, order }); } catch { A("gr-note").hidden = false; A("gr-note").textContent = "묶음을 추가하지 못했어요."; } });
  A("gr-seed").addEventListener("click", async () => { try { for (const d of GROUPS_DEFAULT) if (!grDocs.some(x => x.id === d.id)) await db.collection("groups").doc(d.id).set({ name: d.name, en: d.en, desc: d.desc, poster: d.poster, ar: d.ar, order: d.order }); } catch { A("gr-note").hidden = false; A("gr-note").textContent = "불러오지 못했어요."; } });

  /* ── Contact ── */
  const ctRow = A("ct-form"), ctList = A("ct-list"); let ctData = { ...CONTACT_DEFAULT }, ctItems = [];
  const OTHER = "__other";
  function ctRender() {
    ctList.innerHTML = ctItems.length ? ctItems.map((it, i) => { const known = CT_KINDS.includes(it.k), custom = !known;
      return `<div class="ct-it" data-i="${i}"><select data-f="kind" aria-label="종류">${CT_KINDS.map(k => `<option${k === it.k ? " selected" : ""}>${esc(k)}</option>`).join("")}<option value="${OTHER}"${custom ? " selected" : ""}>직접 입력…</option></select>
        <input data-f="k" type="text" placeholder="이름 (예: 카카오톡)" aria-label="항목 이름" value="${esc(custom ? it.k : "")}"${custom ? "" : " hidden"}>
        <input data-f="v" type="text" aria-label="내용" placeholder="${esc({ 연락처: "010-0000-0000", 이메일: "name@example.com", 위치: "서울시 …", 인스타그램: "https://instagram.com/계정", 웹사이트: "https://", 블로그: "https://" }[it.k] || "내용")}" value="${esc(it.v)}">
        <span class="ct-ops"><button type="button" data-op="up" aria-label="위로"${i ? "" : " disabled"}>↑</button><button type="button" data-op="down" aria-label="아래로"${i < ctItems.length - 1 ? "" : " disabled"}>↓</button><button type="button" data-op="del" aria-label="지우기">✕</button></span></div>`; }).join("")
      : `<p class="ct-none">아직 항목이 없어요. 아래 ‘+ 항목 추가’를 눌러 주세요.</p>`;
  }
  function fillContact(d) { ctData = { ...CONTACT_DEFAULT, ...(d || {}) };
    ["title", "intro"].forEach(k => { const el = ctRow.querySelector(`[name=${k}]`); if (document.activeElement !== el) el.value = ctData[k] || ""; });
    const next = contactItems(ctData), same = x => JSON.stringify(x.map(y => [y.k.trim(), y.v.trim()]));
    if (same(next) === same(ctItems)) return;
    setTimeout(() => { if (!ctList.contains(document.activeElement)) { ctItems = contactItems(ctData); ctRender(); } }, 0); }
  const ctSave = async patch => { Object.assign(ctData, patch); stat(ctRow, "저장 중…"); try { await db.collection("settings").doc("contact").set(ctData); stat(ctRow, "저장됨"); } catch { stat(ctRow, "저장하지 못했어요. 다시 시도해 주세요.", true); } };
  const ctCommit = () => { const items = ctItems.map(x => ({ k: x.k.trim(), v: x.v.trim() })); if (!db || !can) return;
    ctSave({ items, lines: items.filter(x => x.v).map(x => (x.k ? x.k + " | " : "") + x.v).join("\n") }); };
  ["title", "intro"].forEach(k => { const el = ctRow.querySelector(`[name=${k}]`); let t, comp = false;
    const commit = async fin => { clearTimeout(t); const old = ctData[k] || ""; if (!(db && can) || el.value === old) return; const g = await guardText(old, el.value, fin, k === "title" ? "제목" : "안내 문구"); if (g === "wait") return; if (g === "revert") { el.value = old; return; } ctSave({ [k]: el.value }); };
    el.addEventListener("compositionstart", () => { comp = true; clearTimeout(t); }); el.addEventListener("compositionend", () => { comp = false; clearTimeout(t); t = setTimeout(commit, 900); });
    el.addEventListener("input", e => { clearTimeout(t); stat(ctRow, "입력 중…"); if (comp || e.isComposing) return; t = setTimeout(commit, 900); }); el.addEventListener("blur", () => { if (!comp) commit(true); }); });
  { let t, comp = false;
    ctList.addEventListener("compositionstart", () => { comp = true; clearTimeout(t); });
    ctList.addEventListener("compositionend", () => { comp = false; clearTimeout(t); t = setTimeout(ctCommit, 900); });
    ctList.addEventListener("input", e => { const el = e.target, row = el.closest(".ct-it"); if (!row || el.tagName !== "INPUT") return; const it = ctItems[+row.dataset.i];
      it[el.dataset.f] = el.value; clearTimeout(t); stat(ctRow, "입력 중…"); if (comp || e.isComposing) return; t = setTimeout(ctCommit, 900); });
    ctList.addEventListener("focusout", e => { if (e.target.tagName === "INPUT" && !comp) { clearTimeout(t); ctCommit(); } });
    ctList.addEventListener("change", e => { const el = e.target; if (el.dataset.f !== "kind") return; const row = el.closest(".ct-it"), it = ctItems[+row.dataset.i];
      if (el.value === OTHER) { it.k = ""; ctRender(); ctList.querySelector(`.ct-it[data-i="${row.dataset.i}"] [data-f=k]`).focus(); }
      else { it.k = el.value; ctRender(); ctCommit(); } });
    ctList.addEventListener("click", e => { const b = e.target.closest("[data-op]"); if (!b) return; const i = +b.closest(".ct-it").dataset.i;
      if (b.dataset.op === "del") { if ((ctItems[i].v || "").trim() && !confirm(`‘${ctItems[i].k || "항목"}: ${ctItems[i].v}’을(를) 지울까요?`)) return; ctItems.splice(i, 1); }
      else { const j = b.dataset.op === "up" ? i - 1 : i + 1; [ctItems[i], ctItems[j]] = [ctItems[j], ctItems[i]]; }
      ctRender(); ctCommit(); });
    A("ct-add").addEventListener("click", () => { const used = ctItems.map(x => x.k); ctItems.push({ k: CT_KINDS.find(k => !used.includes(k)) || CT_KINDS[0], v: "" }); ctRender(); ctList.querySelector(".ct-it:last-child [data-f=v]").focus(); });
  }

  /* ── About ── */
  const abRow = A("ab-form"); let abData = { ...ABOUT_DEFAULT };
  function fillAbout(d) { abData = { ...ABOUT_DEFAULT, ...(d || {}) };
    ["title", "body"].forEach(k => { const el = abRow.querySelector(`[name=${k}]`); if (document.activeElement !== el) el.value = abData[k] || ""; });
    const next = abParse(abData.lines); if (JSON.stringify(next) !== JSON.stringify(abItems) && !abList.contains(document.activeElement)) { abItems = next; abRender(); }
    A("ab-ph").style.backgroundImage = abData.imageId ? `url('/_blob/${abData.imageId}')` : ""; A("ab-nophoto").hidden = !abData.imageId; }
  const abSave = async patch => { Object.assign(abData, patch); stat(abRow, "저장 중…"); try { await db.collection("settings").doc("about").set(abData); stat(abRow, "저장됨"); } catch { stat(abRow, "저장하지 못했어요. 다시 시도해 주세요.", true); } };
  /* 약력 · 상세: 한 줄씩 [왼쪽 | 오른쪽] 칸으로. 저장은 예전처럼 "왼쪽 | 오른쪽" 줄글로 */
  const abList = A("ab-list"); let abItems = [];
  const abParse = v => String(v || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf("|"); return i < 0 ? { k: "", v: l } : { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() }; });
  const abJoin = () => abItems.filter(x => x.k.trim() || x.v.trim()).map(x => (x.k.trim() ? x.k.trim() + " | " : "") + x.v.trim()).join("\n");
  function abRender() {
    abList.innerHTML = abItems.length ? abItems.map((it, i) => `<div class="ct-it ab-it" data-i="${i}"><input data-f="k" type="text" placeholder="예: 2016" aria-label="연도 · 항목" value="${esc(it.k)}"><input data-f="v" type="text" placeholder="예: 첫 개인전 ‘기다리니, 아직도?’" aria-label="내용" value="${esc(it.v)}">
      <span class="ct-ops"><button type="button" data-op="up" aria-label="위로"${i ? "" : " disabled"}>↑</button><button type="button" data-op="down" aria-label="아래로"${i < abItems.length - 1 ? "" : " disabled"}>↓</button><button type="button" data-op="del" aria-label="이 줄 지우기">✕</button></span></div>`).join("")
      : `<p class="ct-none">아직 약력이 없어요. 아래 ‘+ 한 줄 추가’를 눌러 주세요.</p>`;
  }
  const abCommit = () => { if (!(db && can)) return; const v = abJoin(); if (v !== (abData.lines || "")) abSave({ lines: v }); };
  { let t, comp = false;
    abList.addEventListener("compositionstart", () => { comp = true; clearTimeout(t); });
    abList.addEventListener("compositionend", () => { comp = false; clearTimeout(t); t = setTimeout(abCommit, 900); });
    abList.addEventListener("input", e => { const row = e.target.closest(".ab-it"); if (!row) return; abItems[+row.dataset.i][e.target.dataset.f] = e.target.value; clearTimeout(t); stat(abRow, "입력 중…"); if (comp || e.isComposing) return; t = setTimeout(abCommit, 900); });
    abList.addEventListener("focusout", () => { if (!comp) { clearTimeout(t); abCommit(); } });
    abList.addEventListener("click", async e => { const b = e.target.closest("[data-op]"); if (!b) return; const i = +b.closest(".ab-it").dataset.i;
      if (b.dataset.op === "del") { const it = abItems[i]; if ((it.k + it.v).trim() && !(await askConfirm({ title: "이 약력 줄을 지울까요?", body: [it.k, it.v].filter(Boolean).join("  ·  ") }))) return; abItems.splice(i, 1); }
      else { const j = b.dataset.op === "up" ? i - 1 : i + 1; [abItems[i], abItems[j]] = [abItems[j], abItems[i]]; }
      abRender(); abCommit(); });
    A("ab-add").addEventListener("click", () => { abItems.push({ k: "", v: "" }); abRender(); abList.querySelector(".ab-it:last-child [data-f=k]").focus(); });
  }
  ["title", "body"].forEach(k => { const el = abRow.querySelector(`[name=${k}]`); let t, comp = false;
    const commit = async fin => { clearTimeout(t); const old = abData[k] || ""; if (!(db && can) || el.value === old) return; const g = await guardText(old, el.value, fin, { title: "제목", body: "본문", lines: "약력" }[k] || "내용"); if (g === "wait") return; if (g === "revert") { el.value = old; return; } abSave({ [k]: el.value }); };
    el.addEventListener("compositionstart", () => { comp = true; clearTimeout(t); }); el.addEventListener("compositionend", () => { comp = false; clearTimeout(t); t = setTimeout(commit, 900); });
    el.addEventListener("input", e => { clearTimeout(t); stat(abRow, "입력 중…"); if (comp || e.isComposing) return; t = setTimeout(commit, 900); }); el.addEventListener("blur", () => { if (!comp) commit(true); }); });
  A("ab-file").addEventListener("change", async e => { const file = e.target.files[0]; if (!file) return; if (abData.imageId && !(await askConfirm({ title: "About 사진을 바꿀까요?", body: "지금 사진이 새 사진으로 바뀌어요.", ok: "바꾸기", danger: false }))) { e.target.value = ""; return; } if (!assets) { stat(abRow, "이 화면에서는 사진을 올릴 수 없어요.", true); return; }
    stat(abRow, "사진 올리는 중…"); try { const pb = await posterBlob(file); if (!pb) throw 0; const up = await assets.upload(pb.blob, { type: "image/jpeg" }); const old = abData.imageId; await abSave({ imageId: up.id }); A("ab-ph").style.backgroundImage = `url('/_blob/${up.id}')`; A("ab-nophoto").hidden = false; if (old && old !== up.id) assets.delete(old).catch(() => {}); }
    catch (err) { stat(abRow, { too_large: "사진이 너무 커요 (20MB 이하).", unsupported_type: "JPG, PNG, WEBP, GIF 사진만 올릴 수 있어요." }[err?.code] || "사진을 올리지 못했어요.", true); } });
  A("ab-nophoto").addEventListener("click", async () => { if (!(await askConfirm({ title: "About 사진을 뺄까요?", body: "올려 둔 사진이 지워져요." , ok: "사진 빼기" }))) return; const old = abData.imageId; await abSave({ imageId: "" }); A("ab-ph").style.backgroundImage = ""; A("ab-nophoto").hidden = true; if (assets && old) assets.delete(old).catch(() => {}); });
})();

/* ───────── About 페이지 보기 ───────── */
(() => {
  const A = id => document.getElementById(id), page = A("about-page");
  function paint() {
    A("ab-t").textContent = ABOUT.title || "About"; A("ab-body").textContent = ABOUT.body || "";
    A("ab-lines").innerHTML = String(ABOUT.lines || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf("|"); return i < 0 ? `<dt></dt><dd>${esc(l)}</dd>` : `<dt>${esc(l.slice(0, i).trim())}</dt><dd>${esc(l.slice(i + 1).trim())}</dd>`; }).join("");
    const src = ABOUT.imageId ? "/_blob/" + ABOUT.imageId : (ABOUT.image || ""); A("ab-fig").hidden = !src; if (src) A("ab-img").src = src;
    const ex = EXH.slice().sort((a, b) => exStart(b) - exStart(a));
    A("ab-hist").innerHTML = ex.length ? `<h2>Exhibitions</h2>` + ex.map(e => `<div class="r"><span>${esc(e.period || "—")}</span><span>${esc(e.title)}<small>${esc([e.sub, e.venue].filter(Boolean).join(" · "))}</small></span></div>`).join("") : "";
  }
  function route() { const on = location.hash === "#about"; document.body.classList.toggle("about", on); page.hidden = !on; if (on) { scrollTo(0, 0); document.title = (ABOUT.title || "About") + " · Gallery Parranii"; } else if (document.title.indexOf(" · Gallery") > 0) document.title = "Gallery Parranii"; }
  onAbout(paint); onExh(paint); addEventListener("hashchange", route); route();
})();

/* ───────── Contact 페이지 보기 ───────── */
(() => {
  const A = id => document.getElementById(id), page = A("contact-page");
  function paint() {
    A("ct-t").textContent = CONTACT.title || "Contact"; A("ct-intro").textContent = CONTACT.intro || "";
    const rows = contactItems(CONTACT).filter(x => x.v).map(x => [x.k, x.v]);
    const link = (k, v) => /^https?:\/\//i.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""))}</a>`
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `<a href="mailto:${esc(v)}">${esc(v)}</a>`
      : (k === "연락처" || /^[+\d][\d\s().-]{6,}$/.test(v)) && /^[+\d][\d\s().-]{6,}$/.test(v) ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ""))}">${esc(v)}</a>`
      : k === "위치" ? `<a href="https://map.naver.com/p/search/${encodeURIComponent(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v);
    A("ct-rows").innerHTML = rows.length ? rows.map(([k, v], i) => `<div class="ct-row"><span class="k">${esc(k)}</span><span class="v">${link(k, v)}</span><button class="cp" type="button" data-i="${i}">Copy</button></div>`).join("") : `<p class="ct-empty">연락처가 아직 없어요.</p>`;
    A("ct-rows").dataset.vals = JSON.stringify(rows.map(r => r[1]));
  }
  A("ct-rows").addEventListener("click", e => { const b = e.target.closest(".cp"); if (!b) return; const v = JSON.parse(A("ct-rows").dataset.vals || "[]")[+b.dataset.i] || ""; const done = () => { b.textContent = "Copied"; setTimeout(() => b.textContent = "Copy", 1400); };
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(done, () => { const r = document.createRange(); r.selectNodeContents(b.closest(".ct-row").querySelector(".v")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }); });
  function route() { const on = location.hash === "#contact"; document.body.classList.toggle("contact", on); page.hidden = !on; if (on) { scrollTo(0, 0); document.title = (CONTACT.title || "Contact") + " · Gallery Parranii"; } }
  onContact(paint); addEventListener("hashchange", route); route();
})();

/* ───────── 모바일 햄버거 메뉴 ───────── */
(() => {
  const A = id => document.getElementById(id), menu = A("menu"), btn = A("menu-btn"), nav = A("menu-nav");
  const lk = (a, cls) => `<a href="${esc(a.getAttribute("href"))}" class="${cls}">${esc(a.textContent)}</a>`;
  function open() { nav.innerHTML = [...document.querySelector(".top nav").children].filter(el => !el.hidden).map(el => el.classList.contains("nv-g")
      ? lk(el.querySelector(".nv-p"), "") + `<div class="menu-sub">${[...el.querySelectorAll(".nv-sub a")].map(a => lk(a, "")).join("")}</div>`
      : lk(el, el.id === "admin-link" ? "sm" : "")).join("");
    menu.hidden = false; btn.setAttribute("aria-expanded", "true"); document.body.classList.add("menu-open"); const f = nav.querySelector("a"); f && f.focus({ preventScroll: true }); }
  function close() { if (menu.hidden) return; menu.hidden = true; btn.setAttribute("aria-expanded", "false"); document.body.classList.remove("menu-open"); }
  btn.addEventListener("click", open); A("menu-x").addEventListener("click", close);
  nav.addEventListener("click", e => { if (e.target.closest("a")) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape") close(); }); addEventListener("hashchange", close); addEventListener("resize", () => { if (innerWidth > 820) close(); });
})();

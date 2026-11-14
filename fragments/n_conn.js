
/* ───────── 관리자: 클라우드 연결 표시 · 자동 백업 · 복구 ─────────
   연결: 15초마다 저장 공간에 작은 읽기를 보내 살아 있는지 확인한다. 살아 있으면 초록불과 계속 도는 표시, 끊기면 빨간불과 ‘연결하기’.
   백업: 관리 화면을 열면(마지막 백업이 1시간보다 오래됐으면) 전체 내용을 저장 공간의 따로 떨어진 곳(backupIndex · backupParts)에 복사해 둔다. 최근 8개를 남긴다.
         사이트 파일(backup/site.json)에도 전시 · 묶음 · 소개 · 연락처 백업이 있다(Claude가 게시할 때 갱신).
   복구: 백업에는 있는데 지금은 없는 것(지워진 전시 · 작품, 전시에서 빠진 작품, 비어 버린 글)을 찾아 하나씩 물어본다. */
(() => {
  const A = id => document.getElementById(id), sec = A("admin");
  let db = null, can = false, okAt = 0, state = "init", hb = null, busy = false;
  const P2 = n => String(n).padStart(2, "0");
  const fmt = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${P2(d.getHours())}:${P2(d.getMinutes())}`; };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  /* ── 연결 표시 ── */
  function show(s, msg) {
    state = s; const box = A("cn"); box.dataset.state = s;
    A("cn-text").textContent = msg || { ok: "클라우드 연결됨", bad: "연결 끊김", try: "연결 중…", none: "연결할 수 없어요", init: "연결 중…" }[s];
    A("cn-btn").hidden = !(s === "bad" || s === "none"); A("cn-reload").hidden = s !== "bad";
    tick();
  }
  function tick() { const el = A("cn-when"); if (state === "ok" && okAt) el.textContent = `${Math.max(0, Math.round((Date.now() - okAt) / 1000))}초 전 확인`; else if (state !== "ok") el.textContent = ""; }
  setInterval(tick, 1000);
  const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r({ code: "timeout" }), ms))]);
  async function ping() { if (!db) return false; try { await timeout(db.collection("settings").doc("site").get(), 9000); okAt = Date.now(); if (state !== "ok") show("ok"); return true; } catch { show("bad"); return false; } }
  window.__conn = { fail: () => { if (state === "ok") show("bad"); } };
  async function connect(retry) {
    show("try");
    try { db = await timeout(window.claude?.use?.("db") || Promise.resolve(null), 10000); } catch { db = null; }
    if (!db) { show(retry ? "bad" : "none", retry ? "연결 끊김" : "이 화면에서는 클라우드에 연결할 수 없어요 · claude.ai에 로그인한 상태로 열어 주세요"); return false; }
    const ok = await ping();
    if (ok && retry) dispatchEvent(new CustomEvent("parranii:reconnect", { detail: { db } }));
    clearInterval(hb); hb = setInterval(() => { if (location.hash === "#admin" && !document.hidden) ping(); }, 15000);
    return ok;
  }
  addEventListener("online", () => { if (location.hash === "#admin") ping(); });
  addEventListener("offline", () => show("bad", "인터넷 연결이 끊겼어요"));
  addEventListener("visibilitychange", () => { if (!document.hidden && location.hash === "#admin" && db) ping(); });

  /* ── 백업 만들기 ── */
  const COLL = ["exhibitions", "groups", "settings", "works", "news"], KEEP = 8;
  const hash = o => { const s = JSON.stringify(o); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  async function readAll() { const out = {}; for (const c of COLL) { const s = await db.collection(c).get(); out[c] = s.docs.map(d => ({ id: d.id, data: d.data() })); } return out; }
  async function makeBackup(reason) {
    const all = await readAll(), id = "b" + Date.now();
    const small = { exhibitions: all.exhibitions, groups: all.groups, settings: all.settings, works: all.works.map(w => ({ id: w.id, title: w.data.title || "", h: hash(w.data) })) };
    const items = all.works.map(w => ({ c: "works", id: w.id, data: w.data })), parts = []; let cur = [], size = 0;
    for (const it of items) { const n = JSON.stringify(it).length; if (size + n > 60000 && cur.length) { parts.push(cur); cur = []; size = 0; } cur.push(it); size += n; }
    if (cur.length) parts.push(cur);
    for (let i = 0; i < parts.length; i++) await db.collection("backupParts").doc(`${id}-p${i}`).set({ backup: id, docs: parts[i] });
    await db.collection("backupIndex").doc(id).set({ at: Date.now(), reason: reason || "", parts: parts.length, counts: { works: all.works.length, exhibitions: all.exhibitions.length, groups: all.groups.length }, data: small });
    // 오래된 백업 정리
    const idx = (await db.collection("backupIndex").get()).docs.map(d => ({ id: d.id, at: d.data().at || 0, parts: d.data().parts || 0 })).sort((a, b) => b.at - a.at);
    for (const old of idx.slice(KEEP)) { for (let i = 0; i < old.parts; i++) await db.collection("backupParts").doc(`${old.id}-p${i}`).delete().catch(() => {}); await db.collection("backupIndex").doc(old.id).delete().catch(() => {}); }
    return id;
  }
  window.__backupNow = reason => db && can ? makeBackup(reason).catch(() => null) : Promise.resolve(null);

  /* ── 백업 목록 ── */
  async function sources() {
    const list = [];
    try { const s = await db.collection("backupIndex").get(); s.docs.forEach(d => { const v = d.data(); list.push({ kind: "auto", id: d.id, at: v.at || 0, data: v.data || {}, parts: v.parts || 0, label: `자동 백업 · ${fmt(v.at)}` }); }); } catch {}
    try { const r = await fetch("backup/site.json", { cache: "no-store" }); if (r.ok) { const v = await r.json(); list.push({ kind: "site", id: "site", at: v.at || 0, data: v, parts: 0, label: `사이트 파일 백업 · ${fmt(v.at)}` }); } } catch {}
    return list.sort((a, b) => b.at - a.at);
  }
  function paintInfo(list) {
    const a = list.find(x => x.kind === "auto"), s = list.find(x => x.kind === "site");
    A("cn-bk").textContent = [a ? `마지막 자동 백업 ${fmt(a.at)}` : "자동 백업 없음", s ? `사이트 파일 백업 ${fmt(s.at)}` : ""].filter(Boolean).join(" · ");
  }

  /* ── 사라진 것 찾기 ── */
  const label = { exhibitions: "전시", groups: "Works 묶음", settings: "설정", news: "소식" };
  const FN = { title: "제목", sub: "부제", period: "기간", venue: "장소", body: "본문", intro: "첫 문장", lines: "연락처 줄", name: "이름", en: "영문 이름", desc: "설명" };
  const sname = { about: "About", contact: "Contact", site: "사이트 설정" };
  const titleOf = (c, id, d) => c === "settings" ? (sname[id] || id) : (d.title || d.name || id);
  async function current() { const out = {}; for (const c of COLL) { const s = await db.collection(c).get(); out[c] = new Map(s.docs.map(d => [d.id, d.data()])); } return out; }
  function findLosses(cur, list) {
    const found = new Map(); // key → item (가장 최근 백업 것만)
    const titles = id => { const d = cur.works.get(id); return d ? (d.title || "(제목 없음)") : null; };
    for (const src of list) {
      for (const c of ["exhibitions", "groups", "settings", "news"]) {
        for (const { id, data } of (src.data[c] || [])) {
          const now = cur[c] && cur[c].get(id);
          if (!cur[c]) continue;
          if (!now) { const k = `${c}/${id}:doc`; if (!found.has(k)) found.set(k, { key: k, src, kind: "doc", c, id, data, text: `${label[c]} ‘${titleOf(c, id, data)}’이(가) 지금 없어요.` }); continue; }
          if (c === "exhibitions") {
            const lost = (data.workIds || []).filter(w => !(now.workIds || []).includes(w) && cur.works.has(w));
            if (lost.length) { const k = `${c}/${id}:workIds`; if (!found.has(k)) found.set(k, { key: k, src, kind: "ids", c, id, ids: lost, order: data.workIds, text: `전시 ‘${titleOf(c, id, now)}’에서 작품 ${lost.length}점이 빠져 있어요.`, detail: lost.map(titles).filter(Boolean).join(", ") }); }
          }
          for (const f of Object.keys(data)) {
            if (["workIds", "order", "ar", "poster", "posterId", "image", "imageId"].includes(f)) continue;
            const b = data[f], n = now[f];
            if (typeof b === "string" && b.trim() && !String(n ?? "").trim()) { const k = `${c}/${id}:${f}`; if (!found.has(k)) found.set(k, { key: k, src, kind: "field", c, id, field: f, value: b, text: `${label[c]} ‘${titleOf(c, id, now)}’의 ${FN[f] || f}이(가) 비어 있어요.`, detail: b.length > 80 ? b.slice(0, 80) + "…" : b }); }
          }
        }
      }
      if (src.kind === "auto") for (const w of (src.data.works || [])) {
        if (!cur.works.has(w.id)) { const k = `works/${w.id}:doc`; if (!found.has(k)) found.set(k, { key: k, src, kind: "work", c: "works", id: w.id, text: `작품 ‘${w.title || w.id}’이(가) 지금 없어요.` }); }
      }
    }
    return [...found.values()];
  }
  async function workData(src, id) {
    for (let i = 0; i < src.parts; i++) { const d = await db.collection("backupParts").doc(`${src.id}-p${i}`).get(); const hit = d.exists && (d.data().docs || []).find(x => x.id === id); if (hit) return hit.data; }
    return null;
  }
  async function restore(it) {
    if (it.kind === "doc") return db.collection(it.c).doc(it.id).set(it.data);
    if (it.kind === "field") return db.collection(it.c).doc(it.id).update({ [it.field]: it.value });
    if (it.kind === "ids") { const now = (await db.collection(it.c).doc(it.id).get()).data() || {}; const have = now.workIds || []; const merged = [...it.order.filter(x => have.includes(x) || it.ids.includes(x)), ...have.filter(x => !it.order.includes(x))]; return db.collection(it.c).doc(it.id).update({ workIds: merged }); }
    if (it.kind === "work") { const d = await workData(it.src, it.id); if (!d) throw new Error("no data"); return db.collection("works").doc(it.id).set(d); }
  }
  const skipKey = it => "pr-skip:" + it.key + ":" + hash(it.kind === "ids" ? it.ids : it.kind === "field" ? it.value : it.src.id);

  /* ── 팝업: 하나씩 묻기 ── */
  let queue = [], qi = 0, done = 0;
  function openModal(items, manual) {
    queue = items; qi = 0; done = 0; A("rs-close").textContent = "나중에"; const m = A("rs"); m.hidden = false; document.body.classList.add("pk-open");
    A("rs-lead").textContent = items.length ? `백업에는 있는데 지금 사이트에는 없는 것이 ${items.length}건 있어요. 하나씩 물어볼게요.` : (manual ? "백업과 비교해 보니 사라진 것이 없어요." : "");
    step();
  }
  function step() {
    const it = queue[qi], card = A("rs-card");
    A("rs-all").hidden = !it; A("rs-prog").textContent = it ? `${qi + 1} / ${queue.length}` : "";
    if (!it) { card.innerHTML = queue.length ? `<p class="rs-end">끝났어요. 복구 ${done}건${queue.length - done ? ` · 건너뜀 ${queue.length - done}건` : ""}.</p>` : ""; A("rs-close").textContent = "닫기"; return; }
    card.innerHTML = `<p class="rs-what">${esc(it.text)}</p>${it.detail ? `<p class="rs-detail">${esc(it.detail)}</p>` : ""}<p class="rs-src">${esc(it.src.label)}에 저장된 기록</p>
      <div class="rs-btns"><button class="btn primary" type="button" id="rs-yes">복구하기</button><button class="btn quiet" type="button" id="rs-no">건너뛰기</button></div><p class="rs-msg" id="rs-msg"></p>`;
    A("rs-yes").onclick = async () => { A("rs-yes").disabled = true; A("rs-msg").textContent = "복구하는 중…"; try { await restore(it); done++; qi++; step(); } catch { A("rs-msg").textContent = "복구하지 못했어요. 연결을 확인하고 다시 눌러 주세요."; A("rs-yes").disabled = false; } };
    A("rs-no").onclick = () => { ls.set(skipKey(it), "1"); qi++; step(); };
  }
  function closeModal() { A("rs").hidden = true; document.body.classList.remove("pk-open"); }
  async function restoreAll() {
    A("rs-all").disabled = true; A("rs-card").innerHTML = `<p class="rs-what">전체 복구하는 중… (${queue.length - qi}건)</p>`;
    let fail = 0; for (; qi < queue.length; qi++) { try { await restore(queue[qi]); done++; } catch { fail++; } }
    A("rs-all").disabled = false; step(); if (fail) A("rs-card").insertAdjacentHTML("beforeend", `<p class="rs-msg">${fail}건은 복구하지 못했어요.</p>`);
  }
  async function check(manual) {
    if (!db || !can || busy) return; busy = true;
    try {
      const [list, cur] = await Promise.all([sources(), current()]); paintInfo(list);
      let items = findLosses(cur, list); if (!manual) items = items.filter(it => !ls.get(skipKey(it)));
      if (items.length || manual) openModal(items, manual);
    } catch { if (manual) { openModal([], true); A("rs-lead").textContent = "백업을 읽지 못했어요. 연결을 확인해 주세요."; } }
    finally { busy = false; }
  }

  /* ── parranii.com에 반영하기: 지금 저장된 내용을 구글 시트 ‘사이트’ 탭에 적어 두면, parranii.com이 열릴 때 그 내용을 받아 바로 보여 준다 ── */
  const SHEET_ID = "18LiQBcW7E1A_0lXvUlk_LBEVeyG4XnxqHsTI9h085lI";
  let pub = {}, pubUnsub = null;
  function paintPub() {
    const box = A("pb"); box.hidden = false;
    const done = +pub.publishedAt || 0;
    A("pb-state").textContent = done ? `마지막 반영 ${fmt(done)}` : "아직 반영한 적이 없어요";
    A("pb-btn").textContent = "parranii.com에 반영하기";
  }
  function watchPub() { try { pubUnsub && pubUnsub(); } catch {} pubUnsub = db.collection("settings").onSnapshot(s => { const d = s.docs.find(x => x.id === "publish"); pub = d ? d.data() : {}; paintPub(); }, () => {}); }
  A("pb-btn").addEventListener("click", async () => {
    const b = A("pb-btn"), st = A("pb-state");
    if (typeof askConfirm === "function" && !(await askConfirm({ title: "parranii.com에 반영할까요?", body: "지금 관리에 저장된 작품 · 전시 · 묶음 · News · About · Contact가 parranii.com에 바로 보여요.", ok: "반영하기", danger: false }))) return;
    b.disabled = true; st.textContent = "반영하는 중… 창을 닫지 말아 주세요";
    try {
      const mcp = await window.claude?.use?.("mcp"); if (!mcp) throw new Error("mcp");
      const data = {};
      for (const c of ["works", "exhibitions", "groups", "settings", "news"]) {
        const sn = await db.collection(c).get();
        data[c] = sn.docs.filter(d => c !== "settings" || ["about", "contact", "site"].includes(d.id)).map(d => ({ id: d.id, data: d.data() }));
      }
      const at = Date.now(), text = JSON.stringify({ at, data }), N = 40000, rows = [];
      for (let i = 0; i < text.length; i += N) rows.push(["~" + text.slice(i, i + N)]);
      rows.unshift(["~" + JSON.stringify({ n: rows.length, at, len: text.length })]);
      await mcp.callTool("Google Sheets", "update_values", { spreadsheetId: SHEET_ID, range: `'사이트'!A1:A${rows.length}`, values: rows });
      try { await db.collection("settings").doc("publish").set({ ...pub, publishedAt: at }); } catch {}
      pub.publishedAt = at; paintPub(); st.textContent = `반영했어요 ✓ ${fmt(at)} · parranii.com을 새로고침하면 보여요`;
    } catch (err) {
      const c = err && err.code;
      st.textContent = c === "server_not_connected" || c === "needs_reauth" ? "Google Sheets 연결을 확인해 주세요 (claude.ai 설정 → 커넥터)." : c === "approval_required" || c === "consent_required" ? "Google Sheets 사용 허락이 필요해요. 다시 눌러 허락해 주세요." : "반영하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
    }
    b.disabled = false;
  });
  addEventListener("parranii:reconnect", e => { if (started && can) { db = e.detail.db || db; watchPub(); } });

  /* ── 시작 ── */
  let started = false;
  async function start() {
    if (started) return; started = true;
    const ok = await connect(false);
    const user = await window.claude?.use?.("user"); can = !!(user && await user.canEdit());
    A("cn-tools").hidden = !can || !ok;
    if (!ok || !can) return;
    watchPub();
    await check(false);
    try { const list = await sources(); const a = list.find(x => x.kind === "auto"); if (!a || Date.now() - a.at > 3600e3) { await makeBackup("자동"); paintInfo(await sources()); } } catch {}
    setInterval(async () => { if (location.hash !== "#admin" || state !== "ok") return; try { const a = (await sources()).find(x => x.kind === "auto"); if (!a || Date.now() - a.at > 3600e3) { await makeBackup("자동"); paintInfo(await sources()); } } catch {} }, 600e3);
  }
  A("cn-btn").addEventListener("click", async () => { const ok = await connect(true); if (ok && !started) start(); });
  A("cn-reload").addEventListener("click", () => location.reload());
  A("cn-check").addEventListener("click", () => check(true));
  A("cn-backup").addEventListener("click", async () => { const b = A("cn-backup"); b.disabled = true; b.textContent = "백업하는 중…"; const id = await window.__backupNow("직접"); b.textContent = id ? "백업했어요" : "백업하지 못했어요"; paintInfo(await sources()); setTimeout(() => { b.textContent = "지금 백업"; b.disabled = false; }, 1800); });
  A("rs-close").addEventListener("click", closeModal); A("rs-all").addEventListener("click", restoreAll);
  addEventListener("keydown", e => { if (e.key === "Escape" && !A("rs").hidden) closeModal(); });
  const go = () => { if (location.hash === "#admin") start(); };
  addEventListener("hashchange", go); go();
})();

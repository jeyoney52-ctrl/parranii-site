
/* 로고 · gallery parranii: 주소의 #부분을 지우고 첫 화면부터 새로 불러온다 */
document.querySelectorAll(".home-link").forEach(a => a.addEventListener("click", ev => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button > 0) return; ev.preventDefault();
  try { sessionStorage.setItem("pr-scroll-top", "1"); } catch {}
  location.replace(location.origin + location.pathname);
}));
if (sessionStorage.getItem("pr-scroll-top")) { try { sessionStorage.removeItem("pr-scroll-top"); } catch {} if ("scrollRestoration" in history) history.scrollRestoration = "manual"; scrollTo(0, 0); }

/* ───────── 문의하기 ─────────
   방문자: Contact 페이지 아래 칸에 쓰고 보내면 구글 폼으로 들어가고, 응답은 구글 시트(parranii 문의(응답))에 쌓인다.
   작가: 작품 관리 → 문의 탭에서 그 시트를 claude.ai의 Google Sheets 연결로 읽어 본다(작가님만 볼 수 있음). */
(() => {
  const FORM = "https://docs.google.com/forms/d/e/1FAIpQLScvVe2HHdxsMBOTz2V7pwijecxAU9dG95pk-YoGUpIyiKNIow";
  const F = { name: "entry.1210748974", phone: "entry.138782799", email: "entry.792571696", msg: "entry.2078323694" };
  const SHEET = "18LiQBcW7E1A_0lXvUlk_LBEVeyG4XnxqHsTI9h085lI", RANGE = "'설문지 응답 시트1'!A1:F1000";
  const A = id => document.getElementById(id);
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ── 방문자: 문의 보내기 ── */
  const SCRIPT = "https://script.google.com/macros/s/AKfycbwG3xdE-V2UO_5J6fPNooJOo-YbCld-IXHzX1Dnjuj3UMgCnt6Afsn0HSHz1TxioAdT/exec";
  const MAXF = 3, MAXB = 10 * 1024 * 1024, MAXT = 15 * 1024 * 1024;
  const kb = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + "KB" : (n / 1048576).toFixed(1) + "MB";
  /* 큰 사진은 긴 변 2400px · JPEG로 줄여서 보낸다 */
  async function shrink(f) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) || f.size < 1.5 * 1048576) return f;
    try {
      const bmp = await createImageBitmap(f), k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
      const b = await new Promise(r => c.toBlob(r, "image/jpeg", .86));
      return b && b.size < f.size ? new File([b], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
    } catch { return f; }
  }
  const b64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = no; r.readAsDataURL(f); });

  const form = A("inq-form");
  if (form) {
    const msg = A("inq-msg"), btn = form.querySelector("button[type=submit]");
    const pick = A("inq-file"), flist = A("inq-flist"); let files = [];
    const bad = t => { msg.textContent = t; msg.dataset.err = "1"; };
    const drawFiles = () => { flist.innerHTML = files.map((f, i) => `<li><span>${e(f.name)}</span><em>${kb(f.size)}</em><button type="button" data-i="${i}" aria-label="${e(f.name)} 빼기">×</button></li>`).join(""); };
    pick?.addEventListener("change", async () => {
      const add = [...pick.files]; pick.value = "";
      for (const f0 of add) {
        if (files.length >= MAXF) { bad(`파일은 ${MAXF}개까지 보낼 수 있어요.`); break; }
        const f = await shrink(f0);
        if (f.size > MAXB) { bad(`‘${f0.name}’은(는) 너무 커요. 10MB 이하로 보내 주세요.`); continue; }
        if (files.reduce((a, x) => a + x.size, 0) + f.size > MAXT) { bad("파일을 모두 합쳐 15MB까지 보낼 수 있어요."); continue; }
        files.push(f);
      }
      drawFiles();
    });
    flist?.addEventListener("click", ev => { const b = ev.target.closest("button[data-i]"); if (!b) return; files.splice(+b.dataset.i, 1); drawFiles(); });
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      const v = k => (form.elements[k]?.value || "").trim();
      if (v("website")) return; // 자동 등록 프로그램 막기(사람에게는 안 보이는 칸)
      if (!v("name") || !v("msg")) { msg.textContent = "성함과 문의 내용을 적어 주세요."; msg.dataset.err = "1"; return; }
      if (!v("phone") && !v("email")) { msg.textContent = "답변 받으실 연락처나 이메일 중 하나는 적어 주세요."; msg.dataset.err = "1"; return; }
      if (v("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) { msg.textContent = "이메일 주소를 다시 확인해 주세요."; msg.dataset.err = "1"; return; }
      const body = new URLSearchParams({ [F.name]: v("name"), [F.phone]: v("phone"), [F.email]: v("email"), [F.msg]: v("msg") });
      btn.disabled = true; msg.dataset.err = ""; msg.textContent = files.length ? "파일과 함께 보내는 중… 잠시만 기다려 주세요." : "보내는 중…";
      /* 모든 문의는 작가님 Apps Script로 보낸다(구글 폼은 파일 질문 때문에 로그인이 필요해 바로 제출이 안 됨).
         응답을 읽어서 시트에 실제로 들어갔을 때만 ‘전달됐어요’를 보여 준다. */
      try {
        const payload = { name: v("name"), phone: v("phone"), email: v("email"), msg: v("msg"), website: "",
          files: await Promise.all(files.map(async f => ({ name: f.name, type: f.type || "application/octet-stream", data: await b64(f) }))) };
        const r = await fetch(SCRIPT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "status " + r.status);
        form.reset(); files = []; drawFiles(); form.hidden = true; A("inq-done").hidden = false; msg.textContent = "";
      } catch (err) {
        console.warn("문의 전송 실패:", err);
        msg.innerHTML = `문의를 보내지 못했어요. 잠시 뒤 다시 눌러 주시거나, 위 오픈채팅 · 이메일로 연락 주세요. <a href="${e(FORM + "/viewform?usp=pp_url&" + body.toString())}" target="_blank" rel="noopener">구글 폼으로 보내기</a>`;
        msg.dataset.err = "1";
      } finally { btn.disabled = false; }
    });
    form.addEventListener("input", () => { if (msg.dataset.err === "1") { msg.textContent = ""; msg.dataset.err = ""; } });
    A("inq-again")?.addEventListener("click", () => { A("inq-done").hidden = true; form.hidden = false; });
  }

  /* ── 작가: 작품 관리 → 문의 탭 ── */
  const list = A("inq-list"); if (!list) return;
  const note = A("inq-note"), when = A("inq-when"), SEEN = "pr-inq-seen";
  let loading = false;
  const say = (t, err) => { note.hidden = !t; note.textContent = t || ""; note.dataset.err = err ? "1" : ""; };
  async function load(fresh) {
    if (loading) return; loading = true; say("문의를 불러오는 중…");
    const mcp = await (window.claude?.use?.("mcp") || Promise.resolve(null)).catch(() => null);
    if (!mcp) { say("문의는 claude.ai에 로그인한 상태로 작품 관리를 열면 볼 수 있어요. 구글 시트에서도 바로 볼 수 있어요.", true); loading = false; return; }
    try {
      const r = await mcp.callTool("Google Sheets", "get_values", { spreadsheetId: SHEET, range: RANGE }, fresh ? { cache: { refresh: true } } : undefined);
      const vals = (r.payload && r.payload.values) || [], rows = vals.slice(1).filter(x => x.some(c => String(c || "").trim())).reverse();
      when.textContent = "불러온 시각 " + new Date(r.cache?.storedAt || Date.now()).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit", month: "numeric", day: "numeric" });
      const seen = +localStorage.getItem(SEEN) || 0, total = rows.length;
      A("inq-badge").hidden = total <= seen; A("inq-badge").textContent = total - seen;
      say(total ? "" : "아직 들어온 문의가 없어요.");
      list.innerHTML = rows.map((x, i) => { const [t, name, phone, email, msgv, file] = x; const isNew = i < total - seen;
        return `<article class="inq-item${isNew ? " new" : ""}"><header><b>${e(name || "(이름 없음)")}</b>${isNew ? `<span class="inq-new">새 문의</span>` : ""}<time>${e(t)}</time></header>
          <p class="inq-text">${e(msgv)}</p>
          <p class="inq-meta">${phone ? `<a href="tel:${e(String(phone).replace(/[^\d+]/g, ""))}">${e(phone)}</a>` : ""}${email ? `<a href="mailto:${e(email)}">${e(email)}</a>` : ""}${String(file || "").split(",").map(u => u.trim()).filter(Boolean).map((u, k, all) => `<a href="${e(u)}" target="_blank" rel="noopener">첨부파일${all.length > 1 ? " " + (k + 1) : ""} 보기</a>`).join("")}</p></article>`; }).join("");
      localStorage.setItem(SEEN, String(total));
    } catch (err) {
      const c = err && err.code;
      say({
        server_not_connected: "claude.ai에 Google Sheets 연결이 없어요. claude.ai 설정 → 커넥터에서 Google Sheets를 추가해 주세요.",
        needs_reauth: "Google Sheets 연결이 만료됐어요. claude.ai 설정 → 커넥터에서 Google Sheets를 다시 연결해 주세요.",
        approval_required: "Google Sheets를 읽으려면 허락이 필요해요. 아래 ‘새로고침’을 눌러 허락해 주세요.",
        consent_required: "Google Sheets를 읽으려면 허락이 필요해요. 아래 ‘새로고침’을 눌러 허락해 주세요.",
        not_in_manifest: "이 페이지에서 Google Sheets 사용이 꺼져 있어요. ‘새로고침’을 눌러 다시 허락해 주세요.",
        tool_error: "시트를 읽지 못했어요. 응답 시트가 지워졌거나 이름이 바뀌었는지 확인해 주세요.",
        server_unavailable: "구글 쪽 응답이 늦어요. 잠시 뒤 ‘새로고침’을 눌러 주세요.",
        selection_required: "Google Sheets 연결이 여러 개예요. claude.ai에서 쓸 연결을 하나 골라 주세요."
      }[c] || "문의를 불러오지 못했어요. 잠시 뒤 ‘새로고침’을 눌러 주세요.", true);
    } finally { loading = false; }
  }
  A("inq-refresh").addEventListener("click", () => load(true));
  document.querySelectorAll('.adm-tab[data-tab="inq"]').forEach(b => b.addEventListener("click", () => load(false)));
})();

import re
V = '/tmp/claude-0/-home-user/69ba0a69-48c3-5597-a3c0-8c6bf38773cc/scratchpad/v4/'
s = open('/home/user/parranii/index.backup-before-line-hero.html', encoding='utf-8').read()

def rep(a, b, c=1):
    global s
    assert s.count(a) == c, (s.count(a), a[:80]); s = s.replace(a, b)

def cut(a, b, keep_b=True):
    """a 부터 b 직전까지 지운다."""
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + s[j:]

# 1) 글꼴
rep('family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Italiana&display=swap', 'family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Italiana&family=Instrument+Serif&family=Jost:wght@300;400&display=swap')
rep('/* Layout: 검은 화면 손전등', '/* Layout(새): 검은 화면에 전시 포스터가 줄에 걸린 첫 화면 → 스크롤하면 흰색으로 → 재료별 전시 포스터(Works) → 한 점씩 천천히. 아래는 기존 구성 */\n/* (이전) Layout: 검은 화면 손전등')

# 2) CSS: 옛 인트로, 회전 카드·우표첩 제거 + 새 CSS 추가
cut('/* ───────── 인트로: 선으로 그린 아이가 책을 펼치고', '/* ───────── 공통 섹션 ───────── */')
cut('/* ───────── 회전 카드: 타원 궤도를', '/* ───────── 전시실 ───────── */')
rep('</style>', open(V + 'n_css.css', encoding='utf-8').read() + open(V + 'n_adm.css', encoding='utf-8').read() + '</style>')

# 3) HTML
cut('<!-- ───────── 인트로 ───────── -->', '<!-- ───────── 전시실 ───────── -->')
rep('<!-- ───────── 전시실 ───────── -->', open(V + 'n_html.html', encoding='utf-8').read() + '<!-- ───────── 전시실 ───────── -->')
rep('<!-- ───────── 확대 보기 ───────── -->\n<div class="lightbox"', open(V + 'n_html2.html', encoding='utf-8').read() + '<!-- ───────── 확대 보기 ───────── -->\n<div class="lightbox"')
rep('<button type="button" data-to="browse">작품 둘러보기</button>', '<button type="button" data-to="posters">작품</button>')
rep('<button type="button" data-to="room">전시</button>', '<button type="button" data-to="room">한 점씩</button>')
rep('["browse", "room"].forEach', '["posters", "room"].forEach')

# 3b) 한 점씩 천천히: 검색 · 연도 · ALL 만, 작품 관리 링크는 상단으로
cut('  <div class="xf" id="xf">', '  <div class="works" id="works"></div>')
rep('  <div class="works" id="works"></div>', open(V + 'n_ex.html', encoding='utf-8').read() + '  <div class="works" id="works"></div>')
rep('\n  <br><a class="admin-link" id="admin-link" href="#admin" hidden>작품 관리</a>', '')

rep('    <div class="adm-bar" id="adm-bar" hidden>', open(V + 'n_adm.html', encoding='utf-8').read() + '    <div class="adm-bar" id="adm-bar" hidden>')
# 4) JS: 옛 인트로 · 카드 넘기기 · 우표첩 · 보기 방식 제거
cut('/* ───────── 인트로: 어둠 속에서 한 줄로 그려지는 아이', '/* 검색: 숫자(또는 #7')
cut('/* ───────── 카드 넘기기:', '/* ───────── 전시실:')
rep('const esc = v =>', 'const thumbSrc = w => { const s = SNAPMAP.get(w.id); return s && s.webFile && s.image === w.image ? "t/" + w.id + ".jpg" : (w.web || w.src); }; /* 같은 크기로 잘라 둔 작은 사진 */\nconst esc = v =>')
rep('<figure><img src="${esc(w.web || w.src)}" alt="${esc(w.title)}" loading="lazy" decoding="async"></figure><p><span class="no">', '<figure><img src="${esc(thumbSrc(w))}" alt="${esc(w.title)}" loading="lazy" decoding="async" style="${imgFit(w)}"></figure><p><span class="no">')
# 공개 반영: 로그인하지 않은 방문자가 보는 기본 목록을 클라우드의 현재 내용으로 바꾼다
import json as _j
SN = _j.load(open(V + 'n_snap.json', encoding='utf-8'))
_i = s.index('const SNAPSHOT = ['); _k = s.index('\n];', _i)
s = s[:_i] + 'const SNAPSHOT = [\n' + ',\n'.join('  ' + _j.dumps(w, ensure_ascii=False).replace('</', '<\\/') for w in SN['snapshot']) + s[_k:]
js = open(V + 'n_data.js', encoding='utf-8').read() + '\n' + open(V + 'n_photo.js', encoding='utf-8').read() + '\n' + open(V + 'n_js.js', encoding='utf-8').read() + open(V + 'n_adm.js', encoding='utf-8').read().replace('window.addEventListener("keydown", e => { if (e.key === "Escape" && pzd', 'window.addEventListener("keydown", e => { if (e.key === "Escape" && pzd')
def _swap(src, name, val):
    a = src.index('const ' + name + ' = '); b = src.index(';\n', a)
    return src[:a] + 'const ' + name + ' = ' + _j.dumps(val, ensure_ascii=False).replace('</', '<\\/') + src[b:]
js = _swap(js, 'EXH_DEFAULT', SN['exh']); js = _swap(js, 'GROUPS_DEFAULT', SN['groups']); js = _swap(js, 'ABOUT_DEFAULT', SN['about']); js = _swap(js, 'CONTACT_DEFAULT', SN['contact'])
js = js.replace('addEventListener("keydown", e => { if (e.key === "Escape" && pzd.classList.contains("on") && !document.getElementById("lightbox").classList.contains("on")) closePz(); });', 'addEventListener("keydown", e => { if (e.key === "Escape" && pzd.classList.contains("on") && !document.getElementById("lightbox").classList.contains("on")) closePz(); }, true);')
cut('/* ───────── 전시실: ALL', '/* ───────── 관리자 페이지:')
rep('/* ───────── 관리자 페이지:', open(V + 'n_ex.js', encoding='utf-8').read() + '\n/* ───────── 관리자 페이지:')
rep('''    if (!unsub) unsub = db.collection("works").orderBy("order").onSnapshot(snap => { docs = snap.docs; render(); },
      () => { note.hidden = false; note.textContent = "작품 목록을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요."; });''', '''    if (!unsub) sub();
  }
  function sub() {
    try { unsub && unsub(); } catch {}
    unsub = db.collection("works").orderBy("order").onSnapshot(snap => { docs = snap.docs; render(); },
      () => { window.__conn?.fail(); note.hidden = false; note.textContent = "작품 목록을 불러오지 못했어요. 위쪽의 ‘연결하기’를 눌러 주세요."; });
  }
  addEventListener("parranii:reconnect", e => { if (!unsub || !canEdit) return; db = e.detail.db || db; sub(); });
  {''')
rep('            await db.collection("works").doc(d.id).delete();', '            await window.__backupNow?.("지우기 전"); await db.collection("works").doc(d.id).delete();')

# 작품 순서: 번호를 직접 써서 옮기기 + 손잡이를 끌어서 옮기기
rep('<span class="adm-num">${String(i + 1).padStart(2, "0")}</span>', '<span class="adm-drag" data-drag ${canMove ? "" : "hidden"} title="끌어서 순서 바꾸기" aria-hidden="true"><i></i><i></i><i></i></span><label class="adm-numl" title="번호를 바꾸면 그 자리로 옮겨요">No.<input class="adm-numin" type="number" inputmode="numeric" min="1" max="${docs.length}" value="${i + 1}" ${canMove ? "" : "disabled"} aria-label="작품 번호 (바꾸면 그 자리로 옮겨요)"></label>')
rep('  const saving = new Map(); // 문서별로 한 번에 하나씩 저장', r"""  /* 작품을 from번째에서 to번째 자리로 옮긴다. 사이에 있던 작품들은 한 칸씩 당겨지거나 밀린다 */
  let moving = false;
  async function moveTo(from, to, row) {
    to = clampN(to, 0, docs.length - 1); if (from === to || moving) return false;
    const ids = docs.map(d => d.id), [id] = ids.splice(from, 1); ids.splice(to, 0, id);
    const cur = new Map(docs.map((d, k) => [d.id, d.data().order ?? k + 1]));
    const todo = ids.map((x, k) => [x, k + 1]).filter(([x, o]) => cur.get(x) !== o);
    moving = true; if (row) status(row, `${to + 1}번으로 옮기는 중… (${todo.length}점 번호 정리)`);
    try { for (let k = 0; k < todo.length; k += 12) await Promise.all(todo.slice(k, k + 12).map(([x, o]) => db.collection("works").doc(x).update({ order: o }))); }
    catch { moving = false; if (row) status(row, "순서를 바꾸지 못했어요. 다시 시도해 주세요.", true); return false; }
    moving = false; flashId = id; return true;
  }
  let flashId = null;
  const saving = new Map(); // 문서별로 한 번에 하나씩 저장""")
rep('      // 순서 바꾸기\n', r"""      // 번호를 써서 옮기기 (Enter 또는 칸을 벗어나면)
      const numIn = row.querySelector(".adm-numin");
      const goNum = () => { const n = parseInt(numIn.value, 10); if (!n || n === i + 1) { numIn.value = i + 1; return; } moveTo(i, n - 1, row); };
      numIn.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); numIn.blur(); } if (e.key === "Escape") { numIn.value = i + 1; numIn.blur(); } });
      numIn.addEventListener("change", goNum); numIn.addEventListener("blur", () => { if (+numIn.value !== i + 1) goNum(); });
      // 손잡이를 끌어서 옮기기
      row.querySelector("[data-drag]").addEventListener("pointerdown", e => startDrag(e, row, i));
      if (flashId === d.id) { flashId = null; requestAnimationFrame(() => { row.scrollIntoView({ block: "center", behavior: "smooth" }); row.classList.add("adm-moved"); setTimeout(() => row.classList.remove("adm-moved"), 1600); }); }
      // 순서 바꾸기
""")
rep('  async function open() {', r"""  /* 끌어서 옮기기: 손잡이를 누른 채 위아래로. 화면 끝에 가까우면 저절로 스크롤 */
  function startDrag(e, row, from) {
    if (e.button > 0 || moving) return; e.preventDefault();
    const rows = [...listEl.querySelectorAll(".adm-item")], line = document.createElement("div"); line.className = "adm-dropline"; listEl.appendChild(line);
    const tag = document.createElement("div"); tag.className = "adm-dragtag"; tag.textContent = `No.${from + 1} 옮기는 중`; document.body.appendChild(tag);
    row.classList.add("adm-dragging"); let to = from, y = e.clientY, raf = 0;
    const pick = () => { let k = rows.length; for (let r = 0; r < rows.length; r++) { const b = rows[r].getBoundingClientRect(); if (y < b.top + b.height / 2) { k = r; break; } }
      const ref = rows[k] || null, lb = listEl.getBoundingClientRect(), rb = ref ? ref.getBoundingClientRect() : rows[rows.length - 1].getBoundingClientRect();
      line.style.top = ((ref ? rb.top - 8 : rb.bottom + 8) - lb.top) + "px"; to = k > from ? k - 1 : k; tag.textContent = `No.${from + 1} → ${to + 1}번 자리`; };
    const loop = () => { const edge = 90, v = y < edge ? -(edge - y) / 3 : y > innerHeight - edge ? (y - innerHeight + edge) / 3 : 0; if (v) { scrollBy(0, v); pick(); } raf = requestAnimationFrame(loop); };
    const move = ev => { y = ev.clientY; tag.style.left = ev.clientX + 14 + "px"; tag.style.top = ev.clientY + 14 + "px"; pick(); };
    const end = () => { cancelAnimationFrame(raf); removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end);
      line.remove(); tag.remove(); row.classList.remove("adm-dragging"); if (to !== from) moveTo(from, to, row); };
    addEventListener("pointermove", move); addEventListener("pointerup", end); addEventListener("pointercancel", end); move(e); loop();
  }
  async function open() {""")

# 지우기 · 사진 바꾸기 · 글 비우기는 팝업으로 한 번 더 묻는다 (작품 관리 → 작품)
rep("""        const commit = () => { clearTimeout(timer); if (el.value !== (w[k] ?? "")) { w[k] = el.value; save(d.id, row, { [k]: el.value }); } };""", """        const commit = async fin => { clearTimeout(timer); const old = w[k] ?? ""; if (el.value === old) return;
          const g = await guardText(old, el.value, fin, (FIELDS.find(f => f[0] === k) || [, "내용"])[1]); if (g === "wait") { status(row, "비우거나 크게 지운 내용은 칸을 벗어날 때 확인해요."); return; } if (g === "revert") { el.value = old; if (el.tagName === "TEXTAREA") grow(el); status(row, "되돌렸어요."); return; }
          w[k] = el.value; save(d.id, row, { [k]: el.value }); };""")
rep("""        el.addEventListener("blur", () => { if (!composing) commit(); });""", """        el.addEventListener("blur", () => { if (!composing) commit(true); });""")
rep("""        const file = e.target.files[0]; if (!file) return;
        if (!assets) { status(row, "이 화면에서는 사진을 올릴 수 없어요.", true); return; }""", """        const file = e.target.files[0]; if (!file) return;
        if (!assets) { status(row, "이 화면에서는 사진을 올릴 수 없어요.", true); return; }
        if (w.image && !(await askConfirm({ title: `‘${w.title || "제목 없는"}’ 작품의 사진을 바꿀까요?`, body: "지금 사진이 새 사진으로 바뀌고, 예전 사진은 지워져요.", ok: "바꾸기" }))) { e.target.value = ""; return; }""")
rep("""      del.addEventListener("click", () => {
        const box = del.parentElement;
        box.innerHTML = `<span class="adm-confirm">이 작품을 지울까요? <button class="btn danger" type="button" data-yes>지우기</button><button class="btn quiet" type="button" data-no>취소</button></span>`;
        box.querySelector("[data-no]").addEventListener("click", render);
        box.querySelector("[data-yes]").addEventListener("click", async () => {
          try {""", """      del.addEventListener("click", async () => {
        if (!(await askConfirm({ title: `‘${w.title || "제목 없는"}’ 작품을 정말 지울까요?`, body: "사진과 제목 · 설명이 모두 지워지고, 전시 목록에서도 빠져요. 지우기 전에 자동으로 백업해 둘게요." }))) return;
        status(row, "지우는 중…");
        await (async () => {
          try {""")
rep("""          } catch { status(row, "지우지 못했어요. 다시 시도해 주세요.", true); }
        });
      });""", """          } catch { status(row, "지우지 못했어요. 다시 시도해 주세요.", true); }
        })();
      });""")

# 작품 관리: 사진 편집(맞춤 · 확대 · 위치 · 미리보기) 버튼
rep('<label class="btn quiet" for="file-${d.id}">사진 바꾸기</label>', '<label class="btn quiet" for="file-${d.id}">사진 바꾸기</label><button class="btn quiet" type="button" data-edit ${src ? "" : "hidden"}>사진 편집</button>')
rep('      // 사진 바꾸기\n', """      row.querySelector("[data-edit]").addEventListener("click", () => openPhotoEditor({ src: webSrc(d.id, w), w: { ...w, id: d.id },
        onSave: async patch => { status(row, "저장 중…"); await db.collection("works").doc(d.id).update(patch); Object.assign(w, patch); status(row, "사진 보이는 모양을 저장했어요"); },
        onReplace: () => row.querySelector("input[type=file]").click() }));
      // 사진 바꾸기
""")
js += '\n' + open(V + 'n_conn.js', encoding='utf-8').read() + '\n' + open(V + 'n_inq.js', encoding='utf-8').read() + '\n' + open(V + 'n_ava.js', encoding='utf-8').read() + '\n' + open(V + 'n_gb.js', encoding='utf-8').read() + '\n' + open(V + 'n_news.js', encoding='utf-8').read() + '\n' + open(V + 'n_walk.js', encoding='utf-8').read()
i = s.rindex('</script>'); s = s[:i] + js + s[i:]
assert 'const workNo = w => WORKS.indexOf(w) + 1;' in s
s = s.replace('const workNo = w => WORKS.indexOf(w) + 1;', 'const workNo = w => { const i = WORKS.indexOf(w); return (i >= 0 ? i : WORKS.findIndex(x => x.id === w.id)) + 1; };')
s = s.replace('작품 관리', '관리').replace('작품관리', '관리').replace('data-to="top">맨 위<', 'data-to="top">top<')
open('/home/user/parranii/index.html', 'w', encoding='utf-8').write(s)
print('built', len(s))

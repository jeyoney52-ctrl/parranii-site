# 공개용(정적) 사이트 만들기: claude.ai 클라우드 대신 내보낸 데이터를 읽기 전용으로 쓴다
import json, shutil, os
OUT='/tmp/pub/site'; shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
for d in ['img','t','web']: shutil.copytree('/tmp/site4/'+d, OUT+'/'+d)
shutil.copytree('/tmp/pub/b', OUT+'/b')
site=json.load(open('/home/user/parranii/backup/site.json'))
data={"works":json.load(open('/tmp/pub/works.json')),"exhibitions":site["exhibitions"],"groups":site["groups"],"settings":site["settings"],"news":site.get("news",[])}
# 포스터 그림이 바뀌면 주소 뒤 ?v= 값이 달라져서, 방문자 브라우저에 남은 예전 그림 대신 새 그림을 받는다
import hashlib, copy
def _ver(path):
    try: return hashlib.sha1(open(OUT + '/' + path, 'rb').read()).hexdigest()[:8]
    except Exception: return None
data = copy.deepcopy(data)
for coll in ('exhibitions', 'groups'):
    for d in data[coll]:
        pp = d['data'].get('poster') or ''
        if pp.startswith('img/') and '?' not in pp and _ver(pp): d['data']['poster'] = pp + '?v=' + _ver(pp)
shim='''<script>/* 공개용: 저장된 내용을 읽기만 한다 */
window.__PUBLIC = true;
{ const ADM = "https://claude.ai/artifact/2LBF5iCfRSWjPWF6aK1n4E#admin"; /* 관리는 claude.ai에서 열린다 */
  const noAdm = () => { if (/^#adm(in)?$/i.test(location.hash)) location.replace(ADM); }; noAdm(); addEventListener("hashchange", noAdm); }
(() => { let D = %s; const BAKED = %d;
  const FRAME = "https://0ac69527-0da9-485d-afbc-dbd79ed1300f.frame.claudeusercontent.com/_blob/";
  /* 이 사이트에 아직 복사되지 않은 새 사진은 claude.ai 저장소에서 바로 불러온다 */
  addEventListener("error", e => { const t = e.target; if (!t || t.tagName !== "IMG" || t.dataset.fb) return; const m = /(?:^|\/)b\/([0-9a-f]{20,})/.exec(t.getAttribute("src") || ""); if (m) { t.dataset.fb = "1"; t.src = FRAME + m[1]; } }, true);
  const subs = [];
  const snap = c => { const l = (D[c] || []).slice().sort((a, b) => (a.data.order ?? 1e9) - (b.data.order ?? 1e9)); return { empty: !l.length, size: l.length, docs: l.map(x => ({ id: x.id, exists: true, data: () => JSON.parse(JSON.stringify(x.data)) })) }; };
  const ro = () => Promise.reject({ code: "permission-denied" });
  const coll = c => ({ orderBy() { return coll(c); }, where() { return coll(c); }, limit() { return coll(c); }, get: async () => snap(c),
    onSnapshot(fn) { const s = { c, fn }; subs.push(s); setTimeout(() => fn(snap(c)), 0); return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; },
    doc: id => ({ get: async () => { const x = (D[c] || []).find(x => x.id === id); return { id, exists: !!x, data: () => x && x.data }; }, set: ro, update: ro, delete: ro }), add: ro });
  window.claude = { use: async n => n === "db" ? { collection: coll } : n === "user" ? { canEdit: async () => false } : null };
  /* 관리에서 ‘parranii.com에 반영하기’를 누르면 저장되는 최신 내용을 받아서 바로 바꿔 보여 준다 */
  fetch("https://script.google.com/macros/s/AKfycbwG3xdE-V2UO_5J6fPNooJOo-YbCld-IXHzX1Dnjuj3UMgCnt6Afsn0HSHz1TxioAdT/exec?type=site&_=" + Math.floor(Date.now() / 6e4))
    .then(r => r.json()).then(j => { const site = j && j.ok && j.site; if (!site || !site.data || !(site.at > BAKED)) return;
      D = site.data; const seen = new Set(); subs.slice().forEach(s => { s.fn(snap(s.c)); seen.add(s.c); }); }).catch(() => {});
})();</script>
''' % (json.dumps(data, ensure_ascii=False).replace('<','\\u003c'), int(site.get('at_ms', 0)))
s=open('/home/user/parranii/index.html',encoding='utf-8').read()
s=s.replace('"/_blob/"','"b/"').replace("url('/_blob/","url('b/")
assert '/_blob/' not in s, [s[i-60:i+20] for i in [s.find('/_blob/')]]
i=s.index('<script'); s=s[:i]+shim+s[i:]
# ── 검색(구글 · 네이버)용: 제목 · 소개 · 공유 그림 · 로봇이 바로 읽을 소개 글 ──
import html as _h
SITE = 'https://parranii.com/'
TITLE = '갤러리 파르라니 Gallery Parranii | 김성순 작가 갤러리'
DESC = '시선이 작품이 되는 곳, 파르라니. 김성순 작가가 한지 · 한국화물감, 아크릴릭 · 과슈, 자개, 오일파스텔, 사진, 도자기로 시선이 머무는 곳을 그린 작품을 전시하는 온라인 갤러리입니다.'
shutil.copy('/home/user/parranii/share/parranii-og.jpg', OUT + '/og.jpg')
_ld = {"@context": "https://schema.org", "@graph": [
  {"@type": "WebSite", "name": "갤러리 파르라니 Gallery Parranii", "alternateName": ["파르라니", "Parranii", "gallery parranii"], "url": SITE, "inLanguage": "ko"},
  {"@type": "Person", "name": "김성순", "jobTitle": "작가", "url": SITE, "sameAs": [c["v"] for c in ({x["id"]: x["data"] for x in site["settings"]}.get("contact") or {}).get("items", []) if c.get("v", "").startswith("http")]},
  {"@type": "ArtGallery", "name": "갤러리 파르라니", "url": SITE, "image": SITE + "og.jpg", "email": "parranii@naver.com", "description": DESC}]}
VERIFY = open('/tmp/claude-0/-home-user-parranii-site/69ba0a69-48c3-5597-a3c0-8c6bf38773cc/scratchpad/verify.html', encoding='utf-8').read() if os.path.exists('/tmp/claude-0/-home-user-parranii-site/69ba0a69-48c3-5597-a3c0-8c6bf38773cc/scratchpad/verify.html') else ''
HEAD = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="{_h.escape(DESC)}">
<meta name="keywords" content="파르라니, 갤러리 파르라니, Gallery Parranii, 김성순, 김성순 작가, 한국화, 한지, 자개, 오일파스텔, 아크릴화, 도자기, 온라인 갤러리, 그림 전시">
<meta name="author" content="김성순">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{SITE}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="갤러리 파르라니">
<meta property="og:url" content="{SITE}">
<meta property="og:title" content="갤러리 파르라니 Gallery Parranii · 김성순 작가">
<meta property="og:description" content="시선이 작품이 되는 곳, 파르라니">
<meta property="og:image" content="{SITE}og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
{VERIFY}<script type="application/ld+json">{json.dumps(_ld, ensure_ascii=False)}</script>
"""
s = s.replace('<title>Gallery Parranii</title>', '<title>' + _h.escape(TITLE) + '</title>', 1)
# 로봇이 바로 읽는 소개 글(화면에는 보이지 않음)
_g = [g['data'] for g in sorted(site['groups'], key=lambda g: g['data'].get('order', 0))]
_e = [x['data'] for x in site['exhibitions']]
_st = {x['id']: x['data'] for x in site['settings']}
_ab = (_st.get('about') or {}).get('body', '')
_wt = [w.get('title') for w in sorted(data['works'], key=lambda w: w.get('order', 0)) if w.get('title')]
SEO = ('<div class="seo-txt" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">'
  f'<h1>갤러리 파르라니 (Gallery Parranii) — 김성순 작가</h1><p>시선이 작품이 되는 곳, 파르라니. {_h.escape(_ab)}</p>'
  '<h2>재료별 작품 (Works)</h2><ul>' + ''.join(f'<li>{_h.escape(g.get("name",""))} {_h.escape(g.get("en",""))}</li>' for g in _g) + '</ul>'
  '<h2>전시 (Exhibition)</h2><ul>' + ''.join(f'<li>{_h.escape(x.get("title",""))} {_h.escape(x.get("sub",""))} {_h.escape(x.get("period",""))} {_h.escape(x.get("venue",""))}</li>' for x in _e) + '</ul>'
  '<h2>작품 목록</h2><p>' + ' · '.join(_h.escape(t) for t in _wt) + '</p>'
  '<h2>문의 (Contact)</h2><p>이메일 parranii@naver.com · 카카오톡 오픈채팅으로 전시와 작품 문의를 받아요.</p></div>\n')
assert '<header class="top">' in s
s = s.replace('<header class="top">', SEO + '<header class="top">', 1)
s=HEAD+s
open(OUT + '/robots.txt', 'w').write('User-agent: *\nAllow: /\nDisallow: /adm/\nDisallow: /admin/\n\nSitemap: ' + SITE + 'sitemap.xml\n')
import datetime as _dt
open(OUT + '/sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + SITE + '</loc><lastmod>' + _dt.date.today().isoformat() + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n')
open(OUT+'/index.html','w',encoding='utf-8').write(s)
import os as _os
REDIR = '<!doctype html><meta charset=utf-8><title>관리 · gallery parranii</title><meta name=robots content=noindex><meta http-equiv=refresh content="0;url=https://claude.ai/artifact/2LBF5iCfRSWjPWF6aK1n4E#admin"><script>location.replace("https://claude.ai/artifact/2LBF5iCfRSWjPWF6aK1n4E#admin")</script><p style="font:15px sans-serif;padding:40px">관리로 이동하는 중… <a href="https://claude.ai/artifact/2LBF5iCfRSWjPWF6aK1n4E#admin">바로 가기</a></p>'
for _d in ('adm', 'admin'):
    _os.makedirs(OUT + '/' + _d, exist_ok=True); open(OUT + '/' + _d + '/index.html', 'w', encoding='utf-8').write(REDIR)
open(OUT+'/.nojekyll','w').write(''); open(OUT+'/CNAME','w').write('parranii.com\n')
print('ok', len(s))

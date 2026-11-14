# Gallery Parranii — 작업 파일 (source)

parranii.com(공개 사이트)과 claude.ai 관리 페이지를 만드는 원본 조각과 도구예요.
공개 사이트 파일 자체(사진 `img/ t/ web/ b/`, `index.html`)는 `main` 브랜치에 있어요.

## 구성
- `fragments/` — 화면 조각(HTML · CSS · JS)과 `build.py`, 작품 스냅샷 `n_snap.json`
  - `n_html.html` 머리글 · 첫 화면 · About · Contact · News · Guestbook 페이지
  - `n_js.js` 첫 화면(포스터 줄) · Works 포스터, `n_ex.js` 한 점씩 천천히
  - `n_adm.*` 관리 페이지, `n_conn.js` 연결 상태 · 백업 · **parranii.com에 반영하기**
  - `n_inq.js` 문의하기, `n_gb.js` 방명록, `n_ava.js` 픽셀 캐릭터, `n_news.js` News
- `base/index.backup-before-line-hero.html` — build.py가 조각을 끼워 넣는 바탕 파일
- `data/site.json` — 공개 사이트에 넣는 전시 · 묶음 · 설정(About · Contact) · News
- `data/works.json` — 공개 사이트에 넣는 작품 238점 데이터
- `tools/make_public.py` — 관리 페이지(index.html)를 공개용 정적 사이트로 바꾸는 도구
  (읽기 전용 db 흉내, 검색용 제목 · 소개, robots.txt, sitemap.xml, 썸네일, CNAME)
- `tools/verify.html` — 구글 · 네이버 소유 확인 태그
- `tools/apps-script.gs` — 구글 시트에 붙은 Apps Script 전체(문의 · 첨부 · 방명록 · 사이트 반영)
- `share/` — 공유 썸네일(og), 첫 화면 이미지 / `img/logo/` — 로고

## 만드는 순서 (Claude가 쓰던 방법)
1. `fragments/build.py` → 관리 페이지 `index.html` 생성 (경로는 build.py 위쪽 V, 바탕 파일 경로를 맞춰 쓰기)
2. claude.ai 관리 페이지(artifact `0ac69527-0da9-485d-afbc-dbd79ed1300f`)에 `index.html` 올리기
3. `tools/make_public.py` → 공개 사이트 폴더 생성 → `main` 브랜치에 복사해서 push (GitHub Pages)

## 바로 반영되는 구조
관리의 **parranii.com에 반영하기** → 구글 시트 `사이트` 탭에 내용 저장 →
parranii.com이 열릴 때 Apps Script(`?type=site`)로 받아서 바꿔 보여 줌.
그래서 작품 · 글 수정은 Claude 없이도 바로 반영돼요. 화면 디자인을 바꿀 때만 위 순서로 다시 만들어요.

## 주요 정보
- 응답 시트: `18LiQBcW7E1A_0lXvUlk_LBEVeyG4XnxqHsTI9h085lI` (탭: 설문지 응답 시트1 · 방명록 · 사이트)
- Apps Script 웹 앱: `https://script.google.com/macros/s/AKfycbwG3xdE-V2UO_5J6fPNooJOo-YbCld-IXHzX1Dnjuj3UMgCnt6Afsn0HSHz1TxioAdT/exec`
- 관리 페이지: https://claude.ai/artifact/2LBF5iCfRSWjPWF6aK1n4E (parranii.com/adm 으로도 열림)

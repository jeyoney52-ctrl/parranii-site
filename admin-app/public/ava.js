
/* ───────── 방명록 프로필: 픽셀 옷 입히기 캐릭터 ─────────
   코드 "머리.머리색.피부.옷.옷색.모자.안경.소품" (숫자 8개) 하나로 32×32 픽셀 캐릭터를 그린다.
   부위마다 테두리를 자동으로 둘러서 도트 그림 느낌을 낸다. */
const PrAva = (() => {
  const N = 32, OL = "#3a2f3f";
  const HAIR = ["#2b2430", "#6b4226", "#a0602f", "#e8c25a", "#f29bb8", "#7fb8e8", "#9b7fd6", "#f4f1ea"];
  const SKIN = ["#ffe3cc", "#f7cfa6", "#e0a97f", "#b47a55"];
  const CLO = ["#f27b7b", "#7fb8f0", "#7dd3a8", "#f6d365", "#b9a6f0", "#3d4a7a", "#ffffff", "#2f2b37"];
  const PARTS = {
    hair: ["단발", "짧은 머리", "양갈래", "긴 머리", "뽀글 머리", "똥머리", "삐죽 머리", "가르마", "바가지 머리", "투블럭", "반삭", "올백", "꽁지머리", "짧은 곱슬", "짧은 양갈래"],
    hairColor: ["까망", "갈색", "밤색", "금발", "분홍", "하늘", "보라", "하양"],
    skin: ["밝은 피부", "보통 피부", "구릿빛", "갈색 피부"],
    outfit: ["티셔츠", "줄무늬 티", "원피스", "멜빵바지", "후드티", "화가 앞치마", "세일러복", "니트"],
    color: ["빨강", "하늘", "민트", "노랑", "라일락", "남색", "하양", "까망"],
    hat: ["없음", "베레모", "리본", "꽃핀", "왕관", "비니", "밀짚모자", "고양이 귀", "토끼 귀", "헤드폰"],
    glasses: ["없음", "동그란 안경", "선글라스", "하트 안경"],
    item: ["없음", "붓", "팔레트", "꽃 한 송이", "하트 풍선", "그림 액자", "강아지"]
  };
  /* 표정은 피부 칸에 함께 담는다(피부 + 4 × 표정) — 저장 형식(숫자 8개)을 바꾸지 않으려고 */
  const FACE = ["기본", "방긋", "윙크", "하트 눈", "놀람", "메롱", "행복", "시무룩"];
  const KEYS = Object.keys(PARTS);
  const parse = code => { const n = String(code || "").split(".").map(x => parseInt(x, 10)); return KEYS.map((k, i) => Number.isInteger(n[i]) && n[i] >= 0 && n[i] < (k === "skin" ? PARTS.skin.length * FACE.length : PARTS[k].length) ? n[i] : 0); };
  const join = a => a.join(".");
  const valid = code => /^\d{1,2}(\.\d{1,2}){7}$/.test(String(code || ""));
  const rnd = n => Math.floor(Math.random() * n);
  function random() {
    return join([rnd(PARTS.hair.length), Math.random() < .55 ? rnd(3) : rnd(HAIR.length), (Math.random() < .7 ? rnd(2) : rnd(SKIN.length)) + 4 * (Math.random() < .35 ? 0 : rnd(FACE.length)), rnd(PARTS.outfit.length), rnd(CLO.length),
      Math.random() < .3 ? 0 : 1 + rnd(PARTS.hat.length - 1), Math.random() < .6 ? 0 : 1 + rnd(PARTS.glasses.length - 1), Math.random() < .3 ? 0 : 1 + rnd(PARTS.item.length - 1)]);
  }
  /* 색 밝기 조절 */
  const tone = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return "#" + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, "0")).join(""); };

  function svg(code, bg, head) {
    const [hs, hc, skx, o, ci, h, g, it] = parse(code), sk = skx % 4, fx = Math.floor(skx / 4);
    const grid = Array.from({ length: N }, () => Array(N).fill(null));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) grid[y][x] = c; };
    /* 모양(점 묶음) 만들기 */
    const S = () => new Set(), key = (x, y) => x + "," + y;
    const rect = (m, x, y, w, hh) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + w; i++) m.add(key(i, j)); return m; };
    const ell = (m, cx, cy, rx, ry) => { for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1) m.add(key(i, j)); return m; };
    const pts = (m, list) => { list.forEach(([x, y]) => m.add(key(x, y))); return m; };
    /* 부위 하나를 칠하고 바깥 테두리를 두른다. fill(x,y) 로 점마다 색을 정할 수 있다 */
    const layer = (m, fill, outline = true) => {
      if (outline) m.forEach(k => { const [x, y] = k.split(",").map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (!m.has(key(x + dx, y + dy))) set(x + dx, y + dy, OL); }); });
      m.forEach(k => { const [x, y] = k.split(",").map(Number); set(x, y, typeof fill === "function" ? fill(x, y) : fill); });
    };
    const hair = HAIR[hc], hairD = tone(hair, -.22), skin = SKIN[sk], skinD = tone(skin, -.12);
    const cl = CLO[ci], clD = tone(cl, ci === 6 ? -.12 : -.2), white = "#ffffff", whiteD = "#e6e2ea";

    /* 1. 뒷머리 */
    if (hs === 3) layer(rect(ell(S(), 16, 11, 8.5, 7.5), 8, 11, 16, 13), (x, y) => y > 21 && (x + y) % 5 === 0 ? hairD : hair);
    if (hs === 2) { layer(ell(S(), 6.5, 15, 2.5, 3.5), hair); layer(ell(S(), 25.5, 15, 2.5, 3.5), hair); }
    if (hs === 5) layer(ell(S(), 16, 3.5, 3, 2.5), hair);
    if (hs === 12) layer(pts(rect(S(), 24, 13, 2, 6), [[26, 15], [26, 16], [26, 17], [25, 19], [24, 19]]), (x, y) => y >= 18 ? hairD : hair);

    /* 2. 다리 · 신발 */
    const skirt = o === 2 || o === 6;
    const pants = { 0: "#4a5a8f", 1: "#4a5a8f", 3: cl, 4: "#8a8794", 5: "#4a5a8f", 7: "#6b5a4a" }[o];
    layer(rect(rect(S(), 12, 26, 3, 3), 17, 26, 3, 3), (x, y) => skirt || !pants ? skin : (y === 28 && o === 3 ? clD : pants));
    layer(rect(rect(S(), 11, 29, 4, 2), 17, 29, 4, 2), (x, y) => y === 30 ? "#3b2f2a" : (o === 2 ? "#e85d75" : "#5a4636"));

    /* 3. 몸통 · 옷 */
    const torso = rect(rect(S(), 11, 19, 10, 7), 10, 21, 12, 5);
    if (o === 2) rect(rect(torso, 9, 24, 14, 3), 10, 23, 12, 1);
    if (o === 6) rect(torso, 10, 24, 12, 3);
    if (o === 5) rect(torso, 11, 26, 10, 1);
    layer(torso, (x, y) => {
      if (o === 0) return y === 19 && x >= 14 && x <= 17 ? clD : cl;
      if (o === 1) return y % 2 === 0 ? (ci === 6 ? "#7fb8f0" : white) : cl;
      if (o === 2) return y >= 24 && (x + y) % 4 === 0 ? clD : (x === 15 || x === 16) && y === 20 ? white : cl;
      if (o === 3) return y >= 22 ? ((x === 13 || x === 18) && y === 22 ? "#f6d365" : (x >= 14 && x <= 17 && y >= 23 && y <= 24 ? clD : cl)) : (x === 12 || x === 19) ? cl : white;
      if (o === 4) return y === 19 || (y === 20 && (x <= 12 || x >= 19)) ? clD : (x >= 13 && x <= 18 && y >= 23 && y <= 24 ? clD : (y >= 20 && y <= 22 && (x === 14 || x === 17) ? white : cl));
      if (o === 5) return y <= 20 && (x <= 12 || x >= 19) ? white : (x >= 12 && x <= 19 ? ((x * 7 + y * 3) % 11 === 0 ? ["#f27b7b", "#7fb8f0", "#f6d365", "#7dd3a8"][(x + y) % 4] : cl) : white);
      if (o === 6) return y <= 21 && (x <= 13 || x >= 18) ? (ci === 6 ? "#3d4a7a" : cl) : y >= 24 ? (ci === 6 ? "#3d4a7a" : cl) : (y === 22 && (x === 15 || x === 16) ? "#e85d75" : white);
      if (o === 7) return (x + y) % 4 === 0 && y > 20 ? tone(cl, ci === 6 ? -.1 : .35) : (y === 19 ? clD : cl);
      return cl;
    });

    /* 4. 팔 · 손 */
    const sleeve = { 3: white, 5: white, 6: white }[o] || cl;
    const armL = rect(S(), 8, 20, 2, 5), armR = rect(S(), 22, 20, 2, 5);
    layer(armL, (x, y) => y >= 23 ? skin : sleeve); layer(armR, (x, y) => y >= 23 ? skin : sleeve);

    /* 5. 얼굴 */
    layer(ell(S(), 15.5, 12.5, 7.5, 6.8), skin);
    if (hs === 2 || hs === 0 || hs === 3) {} // 귀는 머리에 가려짐
    else {} // 얼굴 옆 귀는 그리지 않는다(양갈래 머리처럼 보여서)

    /* 6. 앞머리 */
    const front = S();
    const cap = ell(S(), 15.5, 10, 8.5, 6.2); cap.forEach(k => { const y = +k.split(",")[1]; if (y <= 8) front.add(k); });
    const noBang = hs === 7 || hs === 9 || hs === 10 || hs === 11;
    if (!noBang) { rect(front, 8, 9, 16, 1); pts(front, [[8, 10], [23, 10], [9, 10], [22, 10]]); }
    if (hs === 0) { rect(front, 7, 9, 3, 9); rect(front, 22, 9, 3, 9); }
    if (hs === 1 || hs === 14) { rect(front, 7, 9, 2, 3); rect(front, 23, 9, 2, 3); }
    if (hs === 2) { rect(front, 7, 9, 2, 6); rect(front, 23, 9, 2, 6); }
    if (hs === 3) { rect(front, 7, 9, 2, 13); rect(front, 23, 9, 2, 13); }
    if (hs === 4) { [[8, 6], [11, 4], [15, 3], [20, 4], [23, 6], [7, 10], [24, 10], [7, 14], [24, 14]].forEach(([x, y]) => ell(front, x, y, 2.2, 2.2)); }
    if (hs === 5) { rect(front, 7, 9, 2, 4); rect(front, 23, 9, 2, 4); }
    if (hs === 7) { rect(front, 8, 9, 7, 1); pts(front, [[8, 10], [9, 10], [10, 10], [11, 10], [8, 11], [23, 9], [23, 10], [22, 9]]); rect(front, 7, 9, 1, 3); rect(front, 24, 9, 1, 2); }
    if (hs === 8) { rect(front, 8, 9, 16, 2); rect(front, 7, 9, 2, 4); rect(front, 23, 9, 2, 4); }
    if (hs === 9) { rect(front, 9, 9, 12, 1); pts(front, [[10, 10], [11, 10], [12, 10]]); }
    if (hs === 10) { [...front].forEach(k => { if (+k.split(",")[1] < 5) front.delete(k); }); rect(front, 8, 9, 16, 1); }
    if (hs === 11) { ell(front, 13.5, 4.5, 6, 2.6); }
    if (hs === 12) { rect(front, 7, 9, 2, 3); rect(front, 23, 9, 2, 3); }
    if (hs === 13) { [[9, 6], [12, 4.5], [15.5, 4], [19, 4.5], [22, 6], [8, 9], [23, 9], [11, 8], [15, 8], [19, 8]].forEach(([x, y]) => ell(front, x, y, 1.8, 1.8)); }
    if (hs === 6) { pts(front, [[10, 3], [11, 2], [14, 2], [15, 1], [19, 2], [20, 3], [22, 4], [9, 4]]); rect(front, 7, 9, 2, 3); rect(front, 23, 9, 2, 3); }
    const shaved = tone(hair, hc === 7 ? -.15 : .32);
    layer(front, (x, y) => {
      if (hs === 9 && (x <= 8 || x >= 23) && y >= 7) return shaved;
      if (hs === 10) return (x + y) % 3 === 0 ? hairD : (y === 6 && x >= 12 && x <= 14 ? tone(hair, .3) : hair);
      if (hs === 11 && y <= 7 && (x + 2 * y) % 6 === 0) return tone(hair, .3);
      if (hs === 7 && (x === 15 || x === 16) && y <= 8 && y >= 4) return hairD;
      return (y === 5 && x >= 12 && x <= 14) || (y === 6 && x === 11) ? tone(hair, .35) : (y >= 10 && (x <= 8 || x >= 23) ? hairD : hair); });

    if (hs === 14) { layer(rect(S(), 5, 11, 2, 3), (x, y) => y === 13 ? hairD : hair); layer(rect(S(), 25, 11, 2, 3), (x, y) => y === 13 ? hairD : hair); set(7, 12, "#e85d75"); set(24, 12, "#e85d75"); }
    /* 7. 눈 · 볼 · 입 */
    const EK = "#2b2430", MO = "#c85a6a", PK = "#f6a5b5";
    const dot = x => { set(x, 12, EK); set(x, 13, EK); };
    const arc = x => { set(x - 1, 13, EK); set(x, 12, EK); set(x + 1, 13, EK); };        // ^ 웃는 눈
    const cup = x => { set(x - 1, 12, EK); set(x, 13, EK); set(x + 1, 12, EK); };        // ‿ 감은 눈
    const line = x => { set(x - 1, 13, EK); set(x, 13, EK); set(x + 1, 13, EK); };       // - 감은 눈
    const heart = x => [[x - 1, 11], [x + 1, 11], [x - 1, 12], [x, 12], [x + 1, 12], [x, 13]].forEach(([a, b]) => set(a, b, "#e8457a"));
    const smile = () => { set(14, 15, MO); set(15, 16, MO); set(16, 16, MO); set(17, 15, MO); };
    if (fx === 0) { dot(12); dot(19); set(15, 16, MO); set(16, 16, MO); }
    if (fx === 1) { arc(12); arc(19); smile(); set(15, 17, "#f07890"); set(16, 17, "#f07890"); }
    if (fx === 2) { dot(12); line(19); smile(); }
    if (fx === 3) { heart(12); heart(19); smile(); }
    if (fx === 4) { dot(12); dot(19); set(11, 10, EK); set(20, 10, EK); [[15, 16], [16, 16], [15, 17], [16, 17]].forEach(([a, b]) => set(a, b, "#8a3040")); }
    if (fx === 5) { line(12); dot(19); set(14, 16, MO); set(15, 16, MO); set(16, 16, MO); set(17, 16, MO); set(15, 17, "#f07890"); set(16, 17, "#f07890"); set(16, 18, "#f07890"); }
    if (fx === 6) { cup(12); cup(19); smile(); }
    if (fx === 7) { dot(12); dot(19); set(14, 17, MO); set(15, 16, MO); set(16, 16, MO); set(17, 17, MO); set(11, 11, EK); set(20, 11, EK); }
    set(10, 15, PK); set(11, 15, PK); set(20, 15, PK); set(21, 15, PK);
    if (fx === 3 || fx === 6) { set(9, 15, PK); set(22, 15, PK); }

    /* 8. 안경 */
    if (g === 1) { const ring = cx => { [[cx - 1, 10], [cx, 10], [cx + 1, 10], [cx - 1, 15], [cx, 15], [cx + 1, 15], [cx - 2, 11], [cx - 2, 12], [cx - 2, 13], [cx - 2, 14], [cx + 2, 11], [cx + 2, 12], [cx + 2, 13], [cx + 2, 14]].forEach(([x, y]) => set(x, y, OL)); set(cx + 1, 11, "#ffffff"); }; ring(12); ring(19); set(15, 12, OL); set(16, 12, OL); }
    if (g === 2) { for (let x = 10; x <= 21; x++) set(x, 11, "#1f1a24"); [10, 11, 12, 13, 14, 17, 18, 19, 20, 21].forEach(x => { set(x, 12, "#1f1a24"); set(x, 13, "#1f1a24"); }); set(11, 12, "#6b6475"); set(18, 12, "#6b6475"); }
    if (g === 3) { const hp = (cx) => [[cx - 2, 11], [cx - 1, 11], [cx + 1, 11], [cx + 2, 11], [cx - 2, 12], [cx - 1, 12], [cx, 12], [cx + 1, 12], [cx + 2, 12], [cx - 1, 13], [cx, 13], [cx + 1, 13], [cx, 14]].forEach(([x, y]) => set(x, y, "#f05a8a")); hp(12); hp(19); set(15, 11, "#c43a6a"); set(16, 11, "#c43a6a"); set(11, 11, "#ffb3cb"); set(18, 11, "#ffb3cb"); }

    /* 9. 모자 · 머리 장식 */
    const hatC = ci === 6 ? "#e85d75" : cl;
    if (h === 1) { layer(rect(rect(S(), 8, 3, 15, 2), 10, 2, 11, 1), (x, y) => y === 4 ? tone(hatC, -.2) : hatC); layer(rect(S(), 15, 0, 1, 2), hatC); }
    if (h === 2) layer(pts(S(), [[21, 3], [22, 4], [21, 5], [23, 4], [24, 4], [25, 3], [25, 5], [24, 3], [24, 5], [22, 3], [22, 5]]), (x, y) => x === 23 && y === 4 ? "#c43a6a" : "#f48fb1");
    if (h === 3) layer(pts(S(), [[23, 6], [22, 7], [24, 7], [23, 8], [23, 7]]), (x, y) => x === 23 && y === 7 ? "#f6d365" : "#ffffff");
    if (h === 4) layer(pts(rect(S(), 11, 3, 10, 2), [[11, 1], [11, 2], [15, 0], [15, 1], [16, 0], [16, 1], [15, 2], [16, 2], [20, 1], [20, 2], [13, 2], [18, 2]]), (x, y) => (x === 15 || x === 16) && y === 3 ? "#e85d75" : y === 4 ? "#e0a92a" : "#f6c945");
    if (h === 5) { layer(rect(rect(S(), 8, 4, 16, 5), 10, 2, 12, 2), (x, y) => y === 8 ? tone(hatC, -.2) : ((x + y) % 3 === 0 && y < 8 ? tone(hatC, .25) : hatC)); layer(ell(S(), 16, 1, 1.6, 1.4), white); }
    if (h === 6) { layer(rect(rect(S(), 4, 6, 24, 2), 10, 2, 12, 4), (x, y) => y === 5 && x >= 10 && x <= 21 ? "#e85d75" : ((x + y) % 3 === 0 ? "#d8b459" : "#efcf7a")); }
    if (h === 7) { layer(pts(S(), [[8, 3], [8, 4], [9, 3], [9, 4], [9, 5], [10, 4], [10, 5], [8, 2], [22, 4], [22, 5], [23, 3], [23, 4], [23, 5], [24, 3], [24, 4], [24, 2]]), (x, y) => (x === 9 && y === 4) || (x === 23 && y === 4) ? "#f6a5b5" : hair === HAIR[7] ? "#cfc8d6" : hairD); }
    if (h === 8) { layer(rect(rect(S(), 11, -1, 2, 6), 19, -1, 2, 6), (x, y) => (x === 12 || x === 19) && y >= 0 && y <= 3 ? "#f6a5b5" : "#ffffff"); }
    if (h === 9) { layer(pts(S(), [[8, 6], [9, 4], [10, 3], [11, 2], [12, 2], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 2], [20, 2], [21, 3], [22, 4], [23, 6]]), "#4a4452"); layer(rect(rect(S(), 6, 9, 3, 5), 23, 9, 3, 5), (x, y) => y === 9 || y === 13 ? tone(hatC, -.2) : hatC); }

    /* 10. 소품 (오른손 쪽) */
    if (it === 1) { layer(pts(S(), [[24, 24], [25, 23], [26, 22], [27, 21]]), "#b07a4a"); layer(pts(S(), [[28, 20], [28, 19], [29, 19], [29, 18]]), cl === "#ffffff" ? "#f27b7b" : cl); }
    if (it === 2) { layer(rect(rect(S(), 24, 21, 6, 4), 25, 20, 4, 1), (x, y) => (x === 25 && y === 21) ? "#f27b7b" : (x === 27 && y === 21) ? "#7fb8f0" : (x === 28 && y === 23) ? "#f6d365" : (x === 26 && y === 23) ? "#7dd3a8" : (x === 29 && y === 24) ? "#ffffff" : "#e8c99a"); }
    if (it === 3) { layer(pts(S(), [[24, 24], [24, 23], [24, 22], [24, 21], [24, 20]]), "#5bb06c"); layer(pts(S(), [[24, 17], [23, 18], [25, 18], [24, 19], [24, 18]]), (x, y) => x === 24 && y === 18 ? "#f6d365" : "#f48fb1"); layer(pts(S(), [[25, 22]]), "#7dd3a8"); }
    if (it === 4) { for (let y = 14; y <= 23; y++) set(25 + (y % 3 === 0 ? 1 : 0), y, "#8a8494"); layer(pts(rect(rect(S(), 23, 8, 2, 3), 27, 8, 2, 3), [[25, 9], [26, 9], [25, 10], [26, 10], [25, 11], [26, 11], [24, 11], [27, 11], [25, 12], [26, 12], [24, 9], [27, 9]]), (x, y) => x === 24 && y === 9 ? "#ffd0da" : "#f2687e"); }
    if (it === 5) { layer(rect(S(), 24, 18, 6, 7), (x, y) => (x === 24 || x === 29 || y === 18 || y === 24) ? "#c9965a" : y >= 22 && x >= 25 && x <= 28 ? "#7dd3a8" : (x === 27 && y === 20) ? "#f6c945" : "#fdf8ee"); }
    if (it === 6) { layer(pts(rect(rect(S(), 23, 25, 6, 3), 24, 22, 4, 3), [[24, 23], [24, 24], [29, 23], [29, 24], [30, 26], [30, 25], [24, 29], [25, 29], [28, 29], [29, 29]].map(([x, y]) => [x - 1, y - 1])), (x, y) => (x === 23 || x === 28) && (y === 22 || y === 23) ? "#a0602f" : (x === 25 || x === 27) && y === 23 ? "#2b2430" : (x === 26 && y === 24) ? "#2b2430" : "#e9c19a"); }

    /* 칠한 점을 가로 줄 단위로 묶어서 사각형으로 */
    const rects = [];
    for (let y = 0; y < N; y++) { let x = 0; while (x < N) { const c = grid[y][x]; if (!c) { x++; continue; } let w = 1; while (x + w < N && grid[y][x + w] === c) w++; rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`); x += w; } }
    const back = bg ? `<rect x="-3" y="-2" width="38" height="38" fill="${bg}"/>` : "";
    return `<svg viewBox="${head ? "3 -1 26 26" : "-3 -2 38 38"}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${back}${rects.join("")}</svg>`;
  }
  return { svg, random, parse, join, valid, PARTS, KEYS, CLO, HAIR, SKIN, FACE };
})();

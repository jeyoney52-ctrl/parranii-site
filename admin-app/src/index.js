// 파르라니 관리 앱 서버 (Cloudflare Worker)
// - /api/*  : 비밀번호(X-Pass)로 잠긴 관리 기능. 실제 데이터는 구글 시트(Apps Script)에 있다.
// - 1분마다: Apps Script에 ‘아직 알리지 않은 새 문의 · 방명록’을 물어보고, 있으면 핸드폰에 푸시 알림
// - 그 밖의 주소: public/ 폴더의 앱 화면
import { sendPush } from "./push.js";

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function gas(env, body) {
  if (!env.SHARED_KEY || !env.SCRIPT_URL) return { ok: false, error: "not configured" };
  const r = await fetch(env.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body, adminKey: env.SHARED_KEY }), redirect: "follow" });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { ok: false, error: "bad response", raw: t.slice(0, 200) }; }
}

function vapid(env) { return { vapidPublic: env.VAPID_PUBLIC, vapidPrivateJwk: JSON.parse(env.VAPID_PRIVATE), subject: "https://parranii.com" }; }

async function notifyAll(env, items) {
  if (!items.length) return { sent: 0 };
  const subs = (await gas(env, { type: "sub_list" })).subs || [];
  let sent = 0;
  // 한 번에 너무 많이 오면 묶어서 하나로
  const list = items.length > 3 ? [{ kind: "many", n: items.length }] : items;
  for (const it of list) {
    const payload = it.kind === "many"
      ? { title: `📬 새 글 ${it.n}개`, body: "문의와 방명록이 새로 들어왔어요.", url: "/#inbox", tag: "many" }
      : it.kind === "inq"
        ? { title: `📮 새 문의 · ${it.name || "이름 없음"}`, body: (it.text || "").slice(0, 120), url: `/#inq-${it.row}`, tag: `inq-${it.row}` }
        : { title: `💌 새 방명록 · ${it.name || "익명의 관람객"}`, body: (it.text || "").slice(0, 120), url: `/#gb-${it.row}`, tag: `gb-${it.row}` };
    for (const s of subs) {
      try { const r = await sendPush(s, payload, vapid(env)); if (r.ok) sent++; else if (r.gone) await gas(env, { type: "sub_del", endpoint: s.endpoint }); } catch (e) { console.log("push fail", e && e.message); }
    }
  }
  return { sent };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (url.pathname === "/api/vapid") return json({ key: env.VAPID_PUBLIC });
    if (req.headers.get("x-pass") !== env.ADMIN_PASS) return json({ ok: false, error: "password" }, 401);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    switch (url.pathname) {
      case "/api/login": return json({ ok: true });
      case "/api/inbox": return json(await gas(env, { type: "admin_inbox" }));
      case "/api/hide": return json(await gas(env, { type: "gb_hide", row: body.row, hidden: !!body.hidden }));
      case "/api/subscribe": return json(await gas(env, { type: "sub_add", sub: body.sub, device: String(body.device || "").slice(0, 60) }));
      case "/api/unsubscribe": return json(await gas(env, { type: "sub_del", endpoint: body.endpoint }));
      case "/api/test": { const subs = (await gas(env, { type: "sub_list" })).subs || []; let sent = 0;
        for (const s of subs) { if (body.endpoint && s.endpoint !== body.endpoint) continue; const r = await sendPush(s, { title: "🔔 알림 테스트", body: "파르라니 관리 알림이 잘 와요!", url: "/#inbox", tag: "test" }, vapid(env)).catch(() => ({})); if (r.ok) sent++; }
        return json({ ok: true, sent }); }
      case "/api/check": { const p = await gas(env, { type: "pending" }); return json({ ok: true, pending: p, ...(await notifyAll(env, p.items || [])) }); }
    }
    return json({ ok: false, error: "not found" }, 404);
  },
  async scheduled(event, env) {
    const p = await gas(env, { type: "pending" });
    if (p && p.items && p.items.length) await notifyAll(env, p.items);
  }
};

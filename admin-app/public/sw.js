/* 파르라니 관리 앱: 푸시 알림 받기 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // 홈 화면 앱으로 설치되게(오프라인 저장은 하지 않음)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: "파르라니 관리", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "파르라니 관리", {
    body: d.body || "", icon: "icon-192.png", badge: "badge.png", tag: d.tag || undefined, renotify: true, data: { url: d.url || "/" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) { await c.focus(); c.postMessage({ url }); return; } }
    await self.clients.openWindow(url);
  })());
});

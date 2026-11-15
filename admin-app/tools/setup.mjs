// 비밀 값(알림 서명 열쇠 · 시트 열쇠 · 관리 비밀번호)을 Cloudflare에 넣는다
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import readline from "readline";
const here = new URL(".", import.meta.url);
const keys = JSON.parse(fs.readFileSync(new URL("keys.json", here), "utf8"));
const flag = new URL(".secrets-done", here);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, a => r(a.trim())));
const first = !fs.existsSync(flag);
let pass = "";
if (first) {
  while (pass.length < 4) pass = await ask("\n관리 앱 비밀번호를 정해 주세요 (4자 이상): ");
} else {
  pass = await ask("\n관리 앱 비밀번호를 바꾸려면 새 비밀번호를, 그대로 두려면 Enter: ");
}
rl.close();
const secrets = {};
if (first) { secrets.VAPID_PRIVATE = JSON.stringify(keys.vapidPrivateJwk); secrets.SHARED_KEY = keys.shared; }
if (pass) secrets.ADMIN_PASS = pass;
if (Object.keys(secrets).length) {
  const tmp = new URL("secrets.tmp.json", here);
  fs.writeFileSync(tmp, JSON.stringify(secrets));
  try { execSync(`npx wrangler secret bulk "${fileURLToPath(tmp)}"`, { stdio: "inherit" }); }
  finally { fs.unlinkSync(tmp); }
  fs.writeFileSync(flag, new Date().toISOString());
  console.log("\n비밀 값을 넣었어요.");
}

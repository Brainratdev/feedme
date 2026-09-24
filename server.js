// One process for Railway: serves the $FEEDME site and keeps the fee-feeding bot running beside it.
// The bot writes feedings.json into DATA_DIR (a Railway Volume), and the site reads it from /feedings.json.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ quiet: true, path: path.join(ROOT, ".env") });

const SITE = path.join(ROOT, "feedme");
const DATA = path.resolve(process.env.DATA_DIR || SITE);
const FEEDINGS = path.join(DATA, "feedings.json");
const PORT = Number(process.env.PORT || 3000);
fs.mkdirSync(DATA, { recursive: true });

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, code, type, body, cache = "no-store") {
  res.writeHead(code, { "content-type": type, "cache-control": cache, "x-content-type-options": "nosniff" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "text/plain", "bad request"); }

  if (p === "/health") return send(res, 200, "text/plain", "ok");
  if (p === "/feedings.json") {
    return fs.readFile(FEEDINGS, (err, buf) => (err ? send(res, 404, TYPES[".json"], "[]") : send(res, 200, TYPES[".json"], buf)));
  }

  if (p.endsWith("/")) p += "index.html";
  const file = path.join(SITE, path.normalize(p));
  if (!file.startsWith(SITE + path.sep) || path.basename(file).startsWith(".")) return send(res, 404, "text/plain", "not found");
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "text/plain", "not found");
    send(res, 200, TYPES[path.extname(file)] || "application/octet-stream", buf, file.endsWith(".html") ? "no-cache" : "public, max-age=3600");
  });
});
server.listen(PORT, () => console.log(`🌐 site on :${PORT} · data dir ${DATA}`));

/* ---------------- bot supervisor ---------------- */
let bot = null;
let backoff = 5_000;

function startBot() {
  const startedAt = Date.now();
  bot = spawn(process.execPath, [path.join(ROOT, "feedme-bot", "bot.js")], {
    stdio: "inherit",
    env: { ...process.env, FEEDINGS_FILE: FEEDINGS, STATE_FILE: path.join(DATA, ".bot-state.json") },
  });
  bot.on("exit", (code, signal) => {
    bot = null;
    if (shuttingDown) return;
    if (Date.now() - startedAt > 60_000) backoff = 5_000;
    console.log(`🤖 bot stopped (${signal || code}); restarting in ${backoff / 1000}s`);
    setTimeout(startBot, backoff);
    backoff = Math.min(backoff * 2, 10 * 60_000);
  });
}

if (process.env.MINT && (process.env.PRIVATE_KEY || process.env.KEYPAIR_PATH)) startBot();
else console.log("🤖 bot off: set MINT and PRIVATE_KEY to start feeding Gob (the site keeps running).");

let shuttingDown = false;
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    shuttingDown = true;
    server.close();
    if (bot) { bot.once("exit", () => process.exit(0)); bot.kill("SIGTERM"); setTimeout(() => process.exit(0), 20_000); }
    else process.exit(0);
  });
}

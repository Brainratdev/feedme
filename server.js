// One process for Railway: serves the $FEEDME site and keeps the fee-feeding bot running beside it.
// The bot writes feedings.json into DATA_DIR (a Railway Volume), and the site reads it from /feedings.json.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ quiet: true, path: path.join(ROOT, ".env") });

const SITE = path.join(ROOT, "feedme");
const DATA = path.resolve(process.env.DATA_DIR || SITE);
const FEEDINGS = path.join(DATA, "feedings.json");
const STATUS = path.join(DATA, "status.json");
const PORT = Number(process.env.PORT || 3000);
fs.mkdirSync(DATA, { recursive: true });

// Only public values ever leave the server: the private key is used here just to derive its public address.
function stomachWallet() {
  if (process.env.STOMACH_WALLET) return process.env.STOMACH_WALLET;
  try {
    if (process.env.KEYPAIR_PATH) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.KEYPAIR_PATH, "utf8")))).publicKey.toBase58();
    const raw = (process.env.PRIVATE_KEY || "").trim();
    if (raw) return Keypair.fromSecretKey(raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw)).publicKey.toBase58();
  } catch {
    console.log("⚠️  PRIVATE_KEY could not be read; the site will not show the Stomach Wallet.");
  }
  return "";
}
const PUBLIC_CONFIG = JSON.stringify({
  mint: process.env.MINT || "",
  stomachWallet: stomachWallet(),
  xUrl: process.env.X_URL || "",
});

// Absolute site URL for the social-card meta tags (X ignores relative image URLs).
const SITE_URL = (process.env.SITE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "")).replace(/\/$/, "");
const INDEX = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
function indexHtml(req) {
  const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const host = String(req.headers.host || "localhost").replace(/[^A-Za-z0-9.:-]/g, "");
  const base = SITE_URL || `${proto}://${host}`;
  return INDEX.replaceAll("__SITE_URL__", base);
}

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
  if (p === "/config.json") return send(res, 200, TYPES[".json"], PUBLIC_CONFIG);
  if (p === "/feedings.json" || p === "/status.json") {
    // nothing written by the bot yet: answer with an empty value rather than a 404
    const [file, empty] = p === "/status.json" ? [STATUS, "{}"] : [FEEDINGS, "[]"];
    return fs.readFile(file, (err, buf) => send(res, 200, TYPES[".json"], err ? empty : buf));
  }

  if (p.endsWith("/")) p += "index.html";
  if (p === "/index.html") return send(res, 200, TYPES[".html"], indexHtml(req), "no-cache");
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
    env: { ...process.env, FEEDINGS_FILE: FEEDINGS, STATUS_FILE: STATUS, STATE_FILE: path.join(DATA, ".bot-state.json") },
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

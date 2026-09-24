// npm run preflight: checks everything the launch depends on, without printing any secret.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { getVars, latestDeployment, volumes } from "./railway.mjs";

const results = [];
const ok = (msg) => results.push(["✅", msg]);
const warn = (msg) => results.push(["⚠️ ", msg]);
const bad = (msg) => results.push(["❌", msg]);

let vars = {};
try { vars = getVars(); ok("Railway CLI terhubung ke service feedme"); }
catch { bad("Railway CLI belum login/terhubung. Jalankan `railway login` lalu `railway link` di folder ini."); }

const SITE = (vars.SITE_URL || "https://feedmesol.fun").replace(/\/$/, "");

// variables (names only)
vars.RPC_URL ? ok("RPC_URL terisi") : bad("RPC_URL belum diisi di Railway");
vars.PRIVATE_KEY ? ok("PRIVATE_KEY terisi (wallet tetap tersembunyi di web sampai MINT diisi)") : warn("PRIVATE_KEY belum diisi. Isi di Railway sebelum launch (aman, wallet tidak tampil di web sebelum MINT ada).");
vars.MINT ? warn(`MINT sudah terisi: ${vars.MINT}. Kalau belum launch, hapus dulu.`) : ok("MINT masih kosong (benar, diisi saat launch)");
vars.X_URL ? ok(`X_URL = ${vars.X_URL}`) : warn("X_URL belum diisi");
vars.SITE_URL ? ok(`SITE_URL = ${vars.SITE_URL}`) : warn("SITE_URL belum diisi (kartu preview X memakai domain Railway)");
vars.DATA_DIR === "/data" ? ok("DATA_DIR = /data (Volume)") : bad("DATA_DIR harus /data");
ok(`DRY_RUN = ${vars.DRY_RUN ?? "true (default)"}${vars.DRY_RUN === "false" ? " · LIVE" : " · simulasi"}`);

// RPC actually answers
if (vars.RPC_URL) {
  try {
    const r = await fetch(vars.RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" }) });
    const j = await r.json();
    j.result ? ok(`RPC merespons (slot ${j.result})`) : bad(`RPC menolak permintaan: ${JSON.stringify(j.error || j).slice(0, 120)}`);
  } catch (e) { bad(`RPC tidak bisa dihubungi: ${e.message}`); }
}

// volume
try { volumes().some((v) => v.mountPath === "/data" && v.serviceName === "feedme") ? ok("Volume /data terpasang") : bad("Volume /data tidak ditemukan"); } catch { warn("Tidak bisa membaca daftar volume"); }

// deployed code == pushed code
try {
  const head = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  const ahead = execFileSync("git", ["rev-list", "--count", "origin/main..HEAD"], { encoding: "utf8" }).trim();
  dirty ? warn("Ada perubahan lokal yang belum di-commit") : ok("Tidak ada perubahan lokal yang tertinggal");
  ahead !== "0" ? bad(`${ahead} commit belum di-push ke GitHub`) : ok("Semua commit sudah di-push");
  const d = latestDeployment();
  d.status === "SUCCESS" && d.commit === head ? ok(`Railway menjalankan commit terbaru (${head})`)
    : warn(`Railway menjalankan ${d.commit || "?"} (${d.status}); terbaru ${head}. Jalankan: railway redeploy --service feedme --from-source --yes`);
} catch (e) { warn(`Cek git/deploy gagal: ${e.message}`); }

// live site
const get = async (p) => { try { const r = await fetch(SITE + p, { redirect: "follow" }); return { status: r.status, text: await r.text() }; } catch { return { status: 0, text: "" }; } };
const health = await get("/health");
health.status === 200 ? ok(`${SITE} online`) : bad(`${SITE} tidak merespons (${health.status})`);
const home = await get("/");
home.text.includes(`${SITE}/assets/og.png`) ? ok("Kartu preview X memakai domain sendiri") : warn("og:image belum memakai SITE_URL");
for (const a of ["/assets/og.png", "/assets/favicon.png", "/gob.js"]) (await get(a)).status === 200 ? ok(`${a} tersedia`) : bad(`${a} tidak tersedia`);
try {
  const cfg = JSON.parse((await get("/config.json")).text);
  !cfg.mint && !cfg.stomachWallet ? ok("Web dalam mode pra-launch (CA dan wallet belum tampil)") : warn(`Web sudah menampilkan mint=${cfg.mint || "-"} wallet=${cfg.stomachWallet || "-"}`);
} catch { bad("/config.json tidak bisa dibaca"); }

// launch kit
for (const f of ["feedme/assets/pfp.png", "feedme/assets/x-banner.png", "video/out/feedme-intro.mp4"]) fs.existsSync(f) ? ok(`${f} siap`) : warn(`${f} belum ada`);

console.log("\n$FEEDME preflight\n");
for (const [icon, msg] of results) console.log(`${icon} ${msg}`);
const fails = results.filter(([i]) => i === "❌").length, warns = results.filter(([i]) => i === "⚠️ ").length;
console.log(`\n${fails ? `❌ ${fails} masalah harus dibereskan` : "✅ Siap launch"}${warns ? ` · ⚠️ ${warns} catatan` : ""}\n`);
process.exitCode = fails ? 1 : 0;

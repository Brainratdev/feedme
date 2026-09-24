// npm run launch -- <MINT> [--live] [--check]
// Puts the freshly launched coin live everywhere: sets MINT on Railway, deploys, checks that the
// Railway wallet is really the coin's creator, waits for the bot's first round, then prints the
// launch post and bio with the CA filled in.
import { Connection, PublicKey } from "@solana/web3.js";
import { PUMP_SDK, bondingCurvePda } from "@pump-fun/pump-sdk";
import { getVars, setVars, redeployLatestCommit } from "./railway.mjs";

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const CHECK = args.includes("--check"); // only verify the coin, change nothing
const raw = args.find((a) => !a.startsWith("--"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (msg) => console.log(`\n▶ ${msg}`);
const die = (msg) => { console.error(`\n❌ ${msg}\n`); process.exit(1); };

if (!raw) die("Pakai: npm run launch -- <CA dari pump.fun> [--live]");
let mint;
try { mint = new PublicKey(raw.trim()); } catch { die(`"${raw}" bukan alamat Solana yang valid.`); }
const CA = mint.toBase58();

step("Cek variabel Railway");
const vars = getVars();
if (!vars.RPC_URL) die("RPC_URL belum diisi di Railway.");
const SITE = (vars.SITE_URL || "https://feedmesol.fun").replace(/\/$/, "");
console.log(`  RPC_URL terisi · PRIVATE_KEY ${vars.PRIVATE_KEY ? "terisi" : "BELUM terisi"}`);

step("Cek koin di pump.fun");
const conn = new Connection(vars.RPC_URL, "confirmed");
let curve = null;
for (let i = 0; i < 10 && !curve; i++) {
  const info = await conn.getAccountInfo(bondingCurvePda(mint));
  if (info) curve = PUMP_SDK.decodeBondingCurve(info);
  else { console.log("  bonding curve belum terlihat, coba lagi..."); await sleep(3000); }
}
if (!curve) die(`Tidak ada bonding curve pump.fun untuk ${CA}. Pastikan CA-nya benar.`);
const creator = curve.creator.toBase58();
console.log(`  koin ditemukan · creator ${creator} · ${curve.complete ? "sudah graduate" : "masih di bonding curve (Egg)"}`);

if (CHECK) { console.log(`\n✅ CA valid. Jalankan tanpa --check untuk live-kan:  npm run launch -- ${CA}\n`); process.exit(0); }
if (!vars.PRIVATE_KEY) die("PRIVATE_KEY belum diisi di Railway. Isi private key wallet yang dipakai launch, lalu jalankan lagi.");

step(`Set MINT${LIVE ? " dan DRY_RUN=false" : ""} di Railway, lalu deploy commit terbaru`);
setVars(LIVE ? { MINT: CA, DRY_RUN: "false" } : { MINT: CA });
redeployLatestCommit();
console.log("  deploy dimulai");

step("Menunggu web menampilkan CA");
let cfg = null;
const until = Date.now() + 12 * 60_000;
while (Date.now() < until) {
  try { cfg = await (await fetch(`${SITE}/config.json`, { cache: "no-store" })).json(); } catch {}
  if (cfg?.mint === CA) break;
  process.stdout.write(".");
  await sleep(10_000);
}
if (cfg?.mint !== CA) die(`Web belum menampilkan CA setelah 12 menit. Cek deploy di Railway: railway logs --service feedme`);
console.log(`\n  ${SITE} sudah live dengan CA`);

step("Cek wallet creator");
if (cfg.stomachWallet === creator) console.log(`  ✅ PRIVATE_KEY di Railway = wallet creator (${creator})`);
else die(`PRIVATE_KEY di Railway milik ${cfg.stomachWallet || "(tidak terbaca)"}, bukan creator koin (${creator}).\n   Bot tidak akan bisa meng-claim fee. Ganti PRIVATE_KEY di Railway dengan private key wallet yang dipakai launch.`);

step("Menunggu ronde pertama bot");
let status = null;
const until2 = Date.now() + 4 * 60_000;
while (Date.now() < until2) {
  try { status = await (await fetch(`${SITE}/status.json`, { cache: "no-store" })).json(); } catch {}
  if (status?.mint === CA) break;
  process.stdout.write(".");
  await sleep(10_000);
}
if (status?.mint === CA) console.log(`\n  ✅ bot jalan · ${status.graduated ? "graduated" : "Egg"} · ${status.pendingSol} SOL menunggu di vault · ${status.dryRun ? "DRY RUN" : "LIVE"}`);
else console.log("\n  ⚠️ bot belum melapor. Cek log: railway logs --service feedme");

console.log(`
════════════════════════════════════════════════════════
 🎉 $FEEDME LIVE
════════════════════════════════════════════════════════
 Web      : ${SITE}
 pump.fun : https://pump.fun/coin/${CA}
 Solscan  : https://solscan.io/token/${CA}
 Wallet   : https://solscan.io/account/${creator}

── Post X (pin postingan ini) ───────────────────────────
Gob has hatched. $FEEDME is live on pump.fun 👾

CA: ${CA}

100% of creator fees go back into the pool. LP burned. The dev eats nothing.

Feed it: ${SITE.replace(/^https?:\/\//, "")}

── Bio X ────────────────────────────────────────────────
$FEEDME 👾 100% of creator fees feed the pool, LP burned. Dev eats 0.
CA: ${CA}
${status?.dryRun !== false ? `
⚠️ Bot masih DRY RUN (simulasi). Sebelum graduate bot memang belum bertransaksi.
   Setelah koin graduate dan log simulasinya terlihat benar, jalankan:
   railway variable set DRY_RUN=false --service feedme
` : ""}`);

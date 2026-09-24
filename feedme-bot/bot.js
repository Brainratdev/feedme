// $FEEDME bot: claims creator fees, buys $FEEDME with half, adds both halves to the
// PumpSwap pool, burns the LP tokens, and logs each feeding to feedings.json for the site.
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import BN from "bn.js";
import bs58 from "bs58";
import {
  ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import { createBurnInstruction, getAccount, getMint, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { OnlinePumpAmmSdk, PUMP_AMM_SDK, buyQuoteInput, canonicalPumpPoolPda } from "@pump-fun/pump-swap-sdk";
import { OnlinePumpSdk, PUMP_SDK, bondingCurvePda } from "@pump-fun/pump-sdk";

/* ---------------- config ---------------- */
const HERE = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ quiet: true, path: [path.join(HERE, "../.env"), path.join(HERE, ".env")] });
const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`❌ ${k} belum diisi di .env`); process.exit(1); }
  return v;
};
const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);
const lamports = (sol) => new BN(Math.round(Number(sol) * 1e9));

const CFG = {
  rpc: env("RPC_URL", "https://api.mainnet-beta.solana.com"),
  mint: new PublicKey(need("MINT")),
  minFeed: lamports(env("MIN_FEED_SOL", "0.1")),     // don't feed less than this per round
  maxFeed: lamports(env("MAX_FEED_SOL", "5")),       // cap per round to limit price impact
  reserve: lamports(env("RESERVE_SOL", "0.03")),     // always left in the wallet for tx fees and rent
  slippage: Number(env("SLIPPAGE_PCT", "3")),        // percent, 3 = 3%
  intervalMin: Number(env("INTERVAL_MINUTES", "60")),
  priorityFee: Number(env("PRIORITY_FEE_MICROLAMPORTS", "50000")),
  dryRun: env("DRY_RUN", "true") !== "false",
  feedingsFile: path.resolve(env("FEEDINGS_FILE", path.join(HERE, "../feedme/feedings.json"))),
  stateFile: path.resolve(env("STATE_FILE", path.join(HERE, ".bot-state.json"))),
};
CFG.statusFile = path.resolve(env("STATUS_FILE", path.join(path.dirname(CFG.feedingsFile), "status.json")));
const CLAIM_MIN = lamports("0.002");   // below this, claiming costs more than it collects
const RENT_BUFFER = lamports("0.01");  // wSOL + LP token accounts opened during a deposit
const ONCE = process.argv.includes("--once");

function loadWallet() {
  const file = env("KEYPAIR_PATH", "");
  if (file) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
  const raw = need("PRIVATE_KEY").trim();
  return Keypair.fromSecretKey(raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw));
}

const conn = new Connection(CFG.rpc, "confirmed");
const wallet = loadWallet();
const me = wallet.publicKey;
const pumpSdk = new OnlinePumpSdk(conn);
const ammSdk = new OnlinePumpAmmSdk(conn);

/* ---------------- helpers ---------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sol = (bn) => (Number(bn.toString()) / 1e9).toFixed(4);
const units = (bn, decimals) => Number(bn.toString()) / 10 ** decimals;
const log = (...a) => console.log(new Date().toISOString().replace("T", " ").slice(0, 19), ...a);

async function tokenBalance(account, programId) {
  try {
    const acc = await getAccount(conn, account, "confirmed", programId);
    return new BN(acc.amount.toString());
  } catch {
    return new BN(0);
  }
}

// Sends one transaction. In DRY_RUN it is only simulated.
async function send(instructions, label) {
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: me,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CFG.priorityFee }),
      ...instructions,
    ],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([wallet]);

  if (CFG.dryRun) {
    const sim = await conn.simulateTransaction(tx, { sigVerify: false });
    if (sim.value.err) {
      (sim.value.logs || []).slice(-8).forEach((l) => log("   ", l));
      throw new Error(`simulasi ${label} gagal: ${JSON.stringify(sim.value.err)}`);
    }
    log(`   🧪 simulasi ${label} OK (${sim.value.unitsConsumed} CU)`);
    return null;
  }

  const sig = await conn.sendTransaction(tx, { maxRetries: 3 });
  log(`   ⏳ ${label} terkirim: https://solscan.io/tx/${sig}`);
  const res = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new Error(`${label} gagal on-chain: ${JSON.stringify(res.value.err)} (${sig})`);
  log(`   ✅ ${label} terkonfirmasi`);
  return sig;
}

// State survives restarts, so a round that stopped halfway (bought, but not yet deposited) is finished next time.
function loadState() {
  try { return JSON.parse(fs.readFileSync(CFG.stateFile, "utf8")); } catch { return {}; }
}
function saveState(s) {
  if (CFG.dryRun) return;
  fs.writeFileSync(CFG.stateFile, JSON.stringify(s, null, 2));
}

// Public snapshot for the website: is Gob hatched, and how much food is waiting.
function writeStatus(graduated, pending) {
  const status = {
    updatedAt: new Date().toISOString(),
    mint: CFG.mint.toBase58(),
    wallet: me.toBase58(),
    graduated,
    pendingSol: Number(sol(pending)),
    dryRun: CFG.dryRun,
  };
  try {
    fs.mkdirSync(path.dirname(CFG.statusFile), { recursive: true });
    fs.writeFileSync(CFG.statusFile, JSON.stringify(status, null, 2) + "\n");
  } catch (e) {
    log(`⚠️  status.json tidak bisa ditulis: ${e.message}`);
  }
}

function recordFeeding(entry) {
  let list = [];
  try { list = JSON.parse(fs.readFileSync(CFG.feedingsFile, "utf8")); } catch {}
  list.unshift(entry);
  fs.mkdirSync(path.dirname(CFG.feedingsFile), { recursive: true });
  fs.writeFileSync(CFG.feedingsFile, JSON.stringify(list, null, 2) + "\n");
  log(`   📝 dicatat di ${CFG.feedingsFile} (total ${list.length} suapan)`);
}

/* ---------------- one round ---------------- */
async function round() {
  // 1. where is the coin?
  const bcInfo = await conn.getAccountInfo(bondingCurvePda(CFG.mint));
  if (!bcInfo) throw new Error("Bonding curve tidak ditemukan. Cek lagi MINT di .env.");
  const curve = PUMP_SDK.decodeBondingCurve(bcInfo);
  if (!curve.creator.equals(me)) {
    throw new Error(`Wallet ini (${me.toBase58()}) bukan creator koin ini (${curve.creator.toBase58()}). Creator fee tidak masuk ke wallet ini.`);
  }
  const poolKey = canonicalPumpPoolPda(CFG.mint);
  const graduated = curve.complete && !!(await conn.getAccountInfo(poolKey));

  const pending = await pumpSdk.getCreatorVaultBalanceBothPrograms(me);
  log(`🍽️  Fee yang menunggu di creator vault: ${sol(pending)} SOL`);
  writeStatus(graduated, pending);

  if (!graduated) {
    log("🥚 Fase telur: koin belum graduate, jadi belum ada pool untuk disuapi. Fee dibiarkan di vault (tetap terlihat publik).");
    return;
  }

  // 2. claim creator fees from both the bonding curve vault and the PumpSwap vault
  if (pending.gt(CLAIM_MIN)) {
    log("💰 Klaim creator fee...");
    await send(await pumpSdk.collectCoinCreatorFeeInstructions(me, me), "klaim fee");
  }

  const state = loadState();
  let tokensToDeposit = new BN(state.pendingTokens || "0");
  let solForBuy = new BN(state.pendingBuySol || "0");
  let buyTx = state.pendingBuyTx || null;
  let dryPlannedSpend = new BN(0);

  // 3. chew: buy $FEEDME with half of what's available
  if (tokensToDeposit.isZero()) {
    let balance = new BN(await conn.getBalance(me, "confirmed"));
    if (CFG.dryRun) balance = balance.add(pending); // the simulated claim did not really move SOL
    let feedable = balance.sub(CFG.reserve);
    if (feedable.lt(CFG.minFeed)) {
      log(`😴 Baru ${sol(BN.max(feedable, new BN(0)))} SOL yang bisa disuapkan (minimum ${sol(CFG.minFeed)}). Tunggu ronde berikutnya.`);
      return;
    }
    if (feedable.gt(CFG.maxFeed)) feedable = CFG.maxFeed;
    solForBuy = feedable.divn(2);

    const swap = await ammSdk.swapSolanaState(poolKey, me);
    const quote = buyQuoteInput({
      quote: solForBuy,
      slippage: CFG.slippage,
      baseReserve: swap.poolBaseAmount,
      quoteReserve: swap.poolQuoteAmount,
      virtualQuoteReserves: swap.pool.virtualQuoteReserves,
      globalConfig: swap.globalConfig,
      baseMintAccount: swap.baseMintAccount,
      baseMint: swap.baseMint,
      coinCreator: swap.pool.coinCreator,
      creator: swap.pool.creator,
      feeConfig: swap.feeConfig,
      quoteMint: swap.pool.quoteMint,
      isMayhemMode: swap.pool.isMayhemMode,
      creatorFeeBps: swap.pool.creatorFeeBps,
    });
    const dec = swap.baseMintAccount.decimals;
    log(`🦷 Mengunyah: beli ~${units(quote.base, dec).toLocaleString()} token dengan ${sol(solForBuy)} SOL`);

    // only the tokens bought in this round are fed; any dev bag in this wallet is never touched
    const before = await tokenBalance(swap.userBaseTokenAccount, swap.baseTokenProgram);
    const walletNow = new BN(await conn.getBalance(me, "confirmed"));
    if (CFG.dryRun && walletNow.lt(solForBuy.add(CFG.reserve))) {
      log("   🧪 simulasi beli dilewati: SOL-nya masih di vault (klaim di dry run cuma simulasi).");
    } else {
      buyTx = await send(await PUMP_AMM_SDK.buyQuoteInput(swap, solForBuy, CFG.slippage), "beli");
    }
    if (CFG.dryRun) {
      tokensToDeposit = quote.base;
      dryPlannedSpend = solForBuy;
    } else {
      const after = await tokenBalance(swap.userBaseTokenAccount, swap.baseTokenProgram);
      tokensToDeposit = after.sub(before);
      if (tokensToDeposit.lten(0)) throw new Error("Beli terkonfirmasi tapi saldo token tidak bertambah. Cek transaksinya.");
      saveState({ pendingTokens: tokensToDeposit.toString(), pendingBuySol: solForBuy.toString(), pendingBuyTx: buyTx });
    }
  } else {
    log(`↩️  Melanjutkan suapan yang terputus: ${tokensToDeposit.toString()} unit token belum masuk pool.`);
  }
  tokensToDeposit = tokensToDeposit.add(new BN(state.carryTokens || "0"));

  // 4. swallow: add the tokens plus matching SOL to the pool
  const liq = await ammSdk.liquiditySolanaState(poolKey, me);
  const baseMint = await getMint(conn, CFG.mint, "confirmed", liq.baseTokenProgram);
  const solNow = new BN(await conn.getBalance(me, "confirmed")).add(CFG.dryRun ? pending : new BN(0)).sub(dryPlannedSpend);
  const quoteBudget = solNow.sub(CFG.reserve).sub(RENT_BUFFER);
  if (quoteBudget.lten(0)) throw new Error("SOL tidak cukup untuk pasangan deposit. Kurangi RESERVE_SOL atau tunggu fee berikutnya.");

  const base = tokensToDeposit.muln(995).divn(1000); // headroom for rounding inside the program
  let dep = PUMP_AMM_SDK.depositBaseInput(liq, base, CFG.slippage);
  let quoteIn = dep.quote;
  if (dep.maxQuote.gt(quoteBudget)) {
    // price moved up after the buy: deposit as much SOL as we have and keep the leftover tokens for next round
    quoteIn = quoteBudget.muln(100).divn(100 + CFG.slippage);
    dep = PUMP_AMM_SDK.depositQuoteInput(liq, quoteIn, CFG.slippage);
  }
  const baseIn = dep.base ?? base;
  log(`😋 Menelan: ${units(baseIn, baseMint.decimals).toLocaleString()} token + ${sol(quoteIn)} SOL → pool (≈ ${dep.lpToken.toString()} LP)`);

  const lpMint = liq.pool.lpMint;
  const lpProgram = (await conn.getAccountInfo(lpMint)).owner;
  const lpAta = getAssociatedTokenAddressSync(lpMint, me, false, lpProgram);

  if (CFG.dryRun) {
    log("   🧪 dry run: deposit & burn tidak disimulasikan karena butuh token hasil beli yang nyata.");
    log(`🔥 Rencana: bakar semua LP (≈ ${dep.lpToken.toString()}) supaya likuiditas terkunci selamanya.`);
    log("✅ Dry run selesai. Kalau angkanya masuk akal, set DRY_RUN=false.");
    return;
  }

  const tokBefore = await tokenBalance(liq.userBaseTokenAccount, liq.baseTokenProgram);
  const depositTx = await send(await PUMP_AMM_SDK.depositInstructionsInternal(liq, dep.lpToken, dep.maxBase, dep.maxQuote), "deposit");
  const tokAfter = await tokenBalance(liq.userBaseTokenAccount, liq.baseTokenProgram);
  const deposited = tokBefore.sub(tokAfter);
  const leftover = BN.max(tokensToDeposit.sub(deposited), new BN(0));
  saveState({ carryTokens: leftover.toString() });

  // 5. burn every LP token in this wallet: fed liquidity can never be pulled out
  const lp = await tokenBalance(lpAta, lpProgram);
  let burnTx = null;
  if (lp.gtn(0)) {
    log(`🔥 Membakar ${lp.toString()} LP token...`);
    burnTx = await send([createBurnInstruction(lpAta, lpMint, me, BigInt(lp.toString()), [], lpProgram)], "bakar LP");
  }

  // 6. receipt for the website
  recordFeeding({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toISOString(),
    sol: Number(sol(solForBuy.add(quoteIn))),
    tokens: Math.round(units(deposited, baseMint.decimals)),
    tx: depositTx,
    buyTx,
    burnTx,
    lpBurned: lp.toString(),
  });
  log(`🎉 Gob makan ${sol(solForBuy.add(quoteIn))} SOL. Dev makan 0.`);
}

/* ---------------- main loop ---------------- */
async function main() {
  log("👾 $FEEDME bot");
  log(`   wallet   : ${me.toBase58()}`);
  log(`   mint     : ${CFG.mint.toBase58()}`);
  log(`   mode     : ${CFG.dryRun ? "DRY RUN (simulasi, tidak ada transaksi nyata)" : "LIVE 🔴"}`);
  log(`   ronde    : ${ONCE ? "sekali jalan" : `setiap ${CFG.intervalMin} menit`}, min ${sol(CFG.minFeed)} SOL, max ${sol(CFG.maxFeed)} SOL, slippage ${CFG.slippage}%`);

  let stop = false;
  const quit = () => { log("Berhenti setelah ronde ini selesai..."); stop = true; if (ONCE) process.exit(0); };
  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);

  for (;;) {
    try {
      await round();
    } catch (e) {
      log(`❌ ${e.message}`);
      if (ONCE) process.exitCode = 1;
    }
    if (ONCE || stop) break;
    const until = Date.now() + CFG.intervalMin * 60_000;
    while (!stop && Date.now() < until) await sleep(1000);
    if (stop) break;
  }
}

main();

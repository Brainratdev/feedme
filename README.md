# $FEEDME

Meet **Gob**, a hungry liquidity pool on Solana. 100% of the creator fees from $FEEDME go straight back into its mouth, the $FEEDME/SOL pool on PumpSwap, and the LP tokens are burned. The dev eats nothing.

| Folder | Isi |
|---|---|
| [`feedme/`](feedme) | Website: Gob dengan 5 wujud evolusi, animasi, suara, feeding log |
| [`feedme/assets/`](feedme/assets) | PFP dan banner X (`render.sh` untuk membuat ulang PNG) |
| [`feedme-bot/`](feedme-bot) | Bot yang klaim creator fee → beli → add liquidity → bakar LP |
| `server.js` | Menyajikan website dan menjalankan bot dalam satu proses (untuk Railway) |

## Jalankan lokal

```bash
npm install
cp .env.example .env   # isi MINT, PRIVATE_KEY, RPC_URL
npm start              # website di http://localhost:3000 + bot
```

Tanpa `MINT` dan `PRIVATE_KEY`, website tetap jalan dan bot menunggu. Detail bot ada di [feedme-bot/README.md](feedme-bot/README.md).

## Railway

Satu service menjalankan website dan bot. Volume di `/data` menyimpan `feedings.json` dan progres bot, supaya tidak hilang saat redeploy.

Variabel di Railway:

| Variabel | Isi |
|---|---|
| `DATA_DIR` | `/data` (path mount Volume) |
| `MINT` | Contract address $FEEDME |
| `PRIVATE_KEY` | Private key wallet creator. Isi sendiri di dashboard Railway, jangan pernah di-commit. |
| `RPC_URL` | RPC Solana pribadi (Helius, QuickNode, dll) |
| `DRY_RUN` | `true` untuk simulasi, `false` untuk live |

Kode bot ini publik supaya siapa pun bisa memastikan fee memang masuk ke pool. Setiap suapan tercatat dengan link transaksinya di website.

Not financial advice. It's a hungry cartoon.

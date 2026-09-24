# $FEEDME

Meet **Gob**, a hungry liquidity pool on Solana. 100% of the creator fees from $FEEDME go straight back into its mouth, the $FEEDME/SOL pool on PumpSwap, and the LP tokens are burned. The dev eats nothing.

| Folder | Isi |
|---|---|
| [`feedme/`](feedme) | Website: Gob dengan 5 wujud evolusi, animasi, suara, feeding log |
| [`feedme/assets/`](feedme/assets) | PFP dan banner X (`render.sh` untuk membuat ulang PNG) |
| [`feedme-bot/`](feedme-bot) | Bot yang klaim creator fee → beli → add liquidity → bakar LP |
| `server.js` | Menyajikan website dan menjalankan bot dalam satu proses (untuk Railway) |

**Mau launch?** Ikuti [LAUNCH.md](LAUNCH.md): `npm run preflight` sekarang, lalu `npm run launch -- <CA>` begitu koin dibuat.

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
| `X_URL` | Link X yang tampil di website (`https://x.com/feedmelana`) |
| `SITE_URL` | Opsional, hanya kalau memakai domain sendiri (untuk kartu preview di X) |

Website mengisi dirinya sendiri dari variabel ini: sebelum `MINT` diisi, web menampilkan "Launching soon". Setelah diisi, CA, tombol beli pump.fun, dan Stomach Wallet (alamat publik dari `PRIVATE_KEY`) muncul otomatis. Bot juga menulis `status.json` tiap ronde, jadi web tahu apakah Gob masih telur dan berapa fee yang menunggu di vault.

Kode bot ini publik supaya siapa pun bisa memastikan fee memang masuk ke pool. Setiap suapan tercatat dengan link transaksinya di website.

Not financial advice. It's a hungry cartoon.

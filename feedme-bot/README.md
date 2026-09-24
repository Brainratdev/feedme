# $FEEDME bot

Bot yang menjalankan janji di website: **100% creator fee masuk kembali ke liquidity pool, dan LP-nya dibakar.**

Setiap ronde (default: tiap 60 menit), bot melakukan ini:

1. **Cek status koin.** Kalau masih di bonding curve (fase telur), fee dibiarkan menumpuk di creator vault.
2. **Klaim creator fee** dari vault pump.fun dan vault PumpSwap sekaligus.
3. **Kunyah:** setengah SOL dipakai untuk membeli $FEEDME di PumpSwap.
4. **Telan:** token hasil beli dan setengah SOL sisanya dimasukkan ke pool $FEEDME/SOL (add liquidity).
5. **Bakar semua LP token**, supaya likuiditas itu tidak bisa ditarik siapa pun, termasuk dev.
6. **Catat** suapan ke `feedings.json`. Website otomatis membaca file ini untuk bagian *Feeding log*, statistik, dan evolusi Gob.

Bot sudah diuji dengan simulasi di mainnet (klaim, beli, dan deposit ke pool) memakai `@pump-fun/pump-sdk@2.0.0` dan `@pump-fun/pump-swap-sdk@1.20.0`. Versinya sengaja dikunci karena API pump.fun sering berubah.

---

## Yang harus kamu siapkan

- **Wallet khusus untuk launch.** Creator fee pump.fun selalu dikirim ke wallet yang membuat koin. Jadi launch $FEEDME dari **wallet baru** yang hanya dipakai untuk ini, lalu wallet itu yang dipakai bot. Wallet ini sekaligus menjadi "Stomach Wallet" yang ditampilkan di website.
- Kalau kamu dev-buy saat launch dengan wallet ini, tenang: bot **hanya** memakai token yang ia beli sendiri di ronde itu. Dev bag tidak akan ikut masuk pool.
- Node.js 20 atau lebih baru.
- RPC Solana pribadi (Helius, QuickNode, dll). RPC publik sering kena limit.
- Sedikit SOL di wallet (±0.05) untuk biaya transaksi.

## Instalasi

Dari folder utama repo:

```bash
npm install
cp .env.example .env
```

Isi `.env`: `MINT`, `PRIVATE_KEY`, dan `RPC_URL`.

## Cara pakai

**1. Tes dulu dengan simulasi** (tidak ada transaksi nyata):

```bash
npm run bot:check
```

Bot akan menampilkan berapa fee yang menunggu, berapa token yang akan dibeli, berapa yang masuk pool, dan berapa LP yang akan dibakar.

**2. Jalankan sungguhan**: ubah `DRY_RUN=false` di `.env`, lalu:

```bash
npm run bot:once
```

Perintah ini menjalankan satu ronde. Cek link Solscan yang muncul di log.

**3. Jalankan terus-menerus:**

```bash
npm start
```

`npm start` menjalankan website **dan** bot sekaligus (lewat `server.js`). Untuk bot saja: `npm run bot`.

Di Railway, cara ini sudah otomatis. Lihat bagian Railway di README utama.

## Menghubungkan ke website

Bot menulis ke `feedings.json` di `DATA_DIR` (default: folder `feedme/`). `server.js` menyajikannya di `/feedings.json`, dan website membacanya otomatis. Kalau file itu belum ada, website memakai contoh data di `CONFIG`.

Setiap baris di log berisi link tx deposit (`tx`), tx beli (`buyTx`), dan tx bakar LP (`burnTx`), jadi siapa pun bisa memverifikasinya.

## Pengaturan penting

| Variabel | Default | Arti |
|---|---|---|
| `DRY_RUN` | `true` | `true` = simulasi saja |
| `INTERVAL_MINUTES` | `60` | Jarak antar ronde |
| `MIN_FEED_SOL` | `0.1` | Minimal SOL per suapan, supaya biaya transaksi tidak sia-sia |
| `MAX_FEED_SOL` | `5` | Maksimal per ronde; sisanya disuapkan di ronde berikutnya |
| `RESERVE_SOL` | `0.03` | SOL yang selalu disisakan untuk gas |
| `SLIPPAGE_PCT` | `3` | Toleransi slippage saat beli dan deposit |

## Kalau ada yang gagal di tengah jalan

Bot menyimpan progres di `.bot-state.json`. Kalau pembelian sukses tapi deposit gagal (misalnya RPC putus), ronde berikutnya akan **melanjutkan deposit** dengan token yang sudah dibeli, tidak membeli lagi. Sisa token kecil karena pembulatan juga dibawa ke ronde berikutnya.

## Keamanan

- `PRIVATE_KEY` memberi kontrol penuh atas wallet. Simpan `.env` hanya di mesin kamu atau server pribadi. File ini sudah masuk `.gitignore`.
- Jangan simpan aset lain di wallet ini.
- Bot ini tidak mengirim SOL ke mana pun selain ke pool $FEEDME/SOL.
- Memecoin sangat berisiko. Bot ini hanya menjalankan mekanisme; ia tidak menjamin harga naik.

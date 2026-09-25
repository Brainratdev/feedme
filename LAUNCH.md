# Launch $FEEDME

## 1. Sebelum launch (lakukan sekarang)

- [ ] `npm run preflight` → semua ✅
- [ ] Isi `PRIVATE_KEY` di Railway (Variables) dengan private key **wallet yang akan dipakai launch**.
      Aman diisi sekarang: web baru menampilkan alamat wallet setelah `MINT` diisi, jadi sniper tidak bisa memantaunya lebih dulu.
- [ ] Wallet launch berisi SOL: biaya create + dev buy (opsional) + ±0.05 SOL untuk gas bot
- [ ] Profil X @feedmelana: nama, bio, foto (`feedme/assets/pfp.png`), header (`feedme/assets/x-banner.png`), website `feedmesol.fun`
- [ ] (Opsional) Posting video `video/out/feedme-intro.mp4` + thread pre-launch

## 2. Form pump.fun

| Kolom | Isi |
|---|---|
| Name | `FEED ME` |
| Ticker | `FEEDME` |
| Image | `feedme/assets/pfp.png` |
| Website | `https://feedmesol.fun` |
| X / Twitter | `https://x.com/feedmelana` |
| Telegram | kosongkan |

Description:

```text
Meet Gob, a hungry liquidity pool. 100% of creator fees go back into the $FEEDME/SOL pool and the LP is burned. The dev eats nothing. feedmesol.fun
```

Launch dari **wallet yang sama** dengan `PRIVATE_KEY` di Railway.

⚠️ Saat create coin, **jangan aktifkan**:
- **Cashback**: koin cashback tidak punya creator fee sama sekali, jadi Gob tidak akan pernah makan.
- **Fee sharing / creator reward split**: fee akan dialihkan dan tidak masuk ke wallet bot.
- **Mayhem mode**: belum diuji dengan bot ini.

`npm run launch` mengecek ketiganya dan berhenti kalau ada yang aktif.

## 3. Saat launch (±3 menit)

1. Create coin di pump.fun, copy CA-nya.
2. Jalankan (atau kirim CA-nya ke Claude):

   ```bash
   npm run launch -- <CA>
   ```

   Skrip ini mengisi `MINT` di Railway, men-deploy, memastikan wallet di Railway memang creator koin, menunggu ronde pertama bot, lalu mencetak **post X dan bio yang sudah berisi CA**.
   Kalau cuma mau mengecek CA tanpa mengubah apa pun: `npm run launch -- <CA> --check`.
3. Posting teks dari skrip, **pin** postingannya, dan ganti bio X.

## 4. Setelah graduate ke PumpSwap

Sebelum graduate bot memang belum bertransaksi (fase telur: fee menumpuk di vault dan web menampilkan jumlahnya).

1. Tunggu satu ronde setelah graduate (maksimal 5 menit), lalu cek log simulasi: `railway logs --service feedme`.
   Yang harus ada: "simulasi klaim fee OK" dan rencana angka beli/deposit/bakar LP.
   "simulasi beli dilewati: SOL-nya masih di vault" itu **normal** di dry run, karena klaimnya cuma simulasi.
2. Aktifkan mode live: `railway variable set DRY_RUN=false --service feedme`
3. Awasi ronde live pertama di Solscan: klaim → beli → deposit → **bakar LP**.

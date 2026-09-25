// Renders the videos in headless Chrome.
//   node video/render.mjs                    intro MP4
//   node video/render.mjs live <CA>          launch-day "WE ARE LIVE" MP4 + PNG with the CA filled in
//   node video/render.mjs stills [times] [--scene=live] [--ca=...]   contact sheet
//   node video/render.mjs frame <t> [--scene=live] [--ca=...]        one full-size frame
import fs from "node:fs";
import path from "node:path";
import { withPage } from "./cdp.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const flag = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const pos = args.filter((a) => !a.startsWith("--"));
const mode = pos[0] || "video";
const scene = mode === "live" ? "live" : flag("scene") || "intro";
const ca = mode === "live" ? pos[1] || "" : flag("ca");
if (ca && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ca)) { console.error(`"${ca}" bukan CA yang valid`); process.exit(1); }
const url = "file://" + path.join(HERE, "intro.html") + `?scene=${scene}&ca=${ca}`;

await withPage(url, async (ev) => {
  for (let i = 0; i < 50 && !(await ev("typeof window.renderVideo === 'function'")); i++) await new Promise((r) => setTimeout(r, 200));
  if (mode === "frame") {
    const t = Number(pos[1] || 0);
    const data = await ev(`(async () => { await loadFonts(); await draw(${t}); return document.getElementById("c").toDataURL("image/png"); })()`);
    const file = path.join(OUT, `frame-${scene}-${t}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
    console.log("wrote", file);
    return;
  }
  if (mode === "stills") {
    const times = (pos[1] || (scene === "live" ? "0.4,1.4,2.6,3.3,3.8,4.6,5.5,6.9,7.5,8.8,10.6,11.8" : "1,2.8,4.5,7.8,11.5,12.6,15.6,18.8,21,24.8,31.2,34.8")).split(",").map(Number);
    const data = await ev(`stills(${JSON.stringify(times)})`);
    const file = path.join(OUT, "stills.png");
    fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
    console.log("wrote", file);
    return;
  }
  const started = Date.now();
  await ev("window.__job = renderVideo().catch((e) => { window.__error = String(e && e.stack || e); }); 0");
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const [p, err] = await ev("[window.__progress, window.__error || null]");
    if (err) throw new Error(err);
    process.stdout.write(`\rrendering ${(p * 100).toFixed(0)}%  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    if (p >= 1 && (await ev("!!window.__mp4"))) break;
  }
  const size = await ev("window.__mp4.length");
  const parts = [];
  for (let a = 0; a < size; a += 2_000_000) parts.push(Buffer.from(await ev(`mp4Slice(${a}, ${a + 2_000_000})`), "base64"));
  const base = scene === "live" ? (ca ? "feedme-live" : "feedme-live-noca") : "feedme-intro";
  const file = path.join(OUT, `${base}.mp4`);
  fs.writeFileSync(file, Buffer.concat(parts));
  console.log(`\nwrote ${file} (${(size / 1e6).toFixed(1)} MB)`);
  if (scene === "live") {
    // the last frame doubles as the launch image
    const png = await ev(`(async () => { await draw(11.7); return document.getElementById("c").toDataURL("image/png"); })()`);
    const img = path.join(OUT, `${base}.png`);
    fs.writeFileSync(img, Buffer.from(png.split(",")[1], "base64"));
    console.log(`wrote ${img}`);
  }
});

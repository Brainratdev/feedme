// Renders the intro: `node video/render.mjs stills` for a contact sheet, `node video/render.mjs` for the MP4.
import fs from "node:fs";
import path from "node:path";
import { withPage } from "./cdp.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });
const url = "file://" + path.join(HERE, "intro.html");
const mode = process.argv[2] || "video";

await withPage(url, async (ev) => {
  for (let i = 0; i < 50 && !(await ev("typeof window.renderVideo === 'function'")); i++) await new Promise((r) => setTimeout(r, 200));
  if (mode === "frame") {
    const t = Number(process.argv[3] || 0);
    const data = await ev(`(async () => { await loadFonts(); await draw(${t}); return document.getElementById("c").toDataURL("image/png"); })()`);
    const file = path.join(OUT, `frame-${t}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(",")[1], "base64"));
    console.log("wrote", file);
    return;
  }
  if (mode === "stills") {
    const times = (process.argv[3] || "1,2.8,4.5,7.8,11.5,12.6,15.6,18.8,21,24.8,31.2,34.8").split(",").map(Number);
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
  const file = path.join(OUT, "feedme-intro.mp4");
  fs.writeFileSync(file, Buffer.concat(parts));
  console.log(`\nwrote ${file} (${(size / 1e6).toFixed(1)} MB)`);
});

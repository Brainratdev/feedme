/* $FEEDME intro: every frame is a pure function of time t (seconds), drawn as one SVG,
   rasterised to a canvas and encoded with WebCodecs. Audio is synthesised offline. */

// ?scene=live&ca=<mint> renders the launch-day "WE ARE LIVE" clip instead of the intro
const Q = new URLSearchParams(location.search);
const MODE = Q.get("scene") === "live" ? "live" : "intro";
const CA = (Q.get("ca") || "").replace(/[^1-9A-HJ-NP-Za-km-z]/g, "").slice(0, 44);
const W = 1080, FPS = 30, DUR = MODE === "live" ? 12 : 40.5;
const MUSIC = MODE === "live"
  ? { start: 1.5, hatsFrom: 1.5, pluckFrom: 3.2, ducks: [[3.2, 3.8]] }
  : { start: 0.9, hatsFrom: 3.4, pluckFrom: 5.2, ducks: [[11.25, 11.9], [30.8, 32.2]] };
const P = { gum: "#FFD6E4", gum2: "#FFC2D6", paper: "#FFF6F9", ink: "#2B0A2E", soft: "#6B4270", tomato: "#FF5A36", gullet: "#5A0F2E", mustard: "#FFC53D" };

/* ---------------- math ---------------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const rnd = (k) => { const s = Math.sin(k * 12.9898) * 43758.5453; return s - Math.floor(s); };
const f1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// position along a parabolic arc from a to b with apex height h
const arc = (p, a, b, h) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p) - h * 4 * p * (1 - p)];

/* ---------------- drawing helpers ---------------- */
function txt(str, x, y, o = {}) {
  const { t, t0 = null, out = null, size = 90, cls = "tH", fill = P.ink, stroke = null, sw = 0, anchor = "middle", rot = 0, ls = 0 } = o;
  let s = 1, op = 1;
  if (t0 != null) { const p = seg(t, t0, t0 + 0.38); if (p <= 0) return ""; s = 0.4 + 0.6 * backOut(p); op = clamp(p * 3); }
  if (out != null) { const q = seg(t, out, out + 0.25); if (q >= 1) return ""; op *= 1 - q; s *= 1 - 0.12 * q; }
  const st = stroke ? ` stroke="${stroke}" stroke-width="${sw}" paint-order="stroke fill" stroke-linejoin="round"` : "";
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s.toFixed(3)})" opacity="${op.toFixed(3)}"><text class="${cls}" text-anchor="${anchor}" font-size="${size}" fill="${fill}" letter-spacing="${ls}"${st}>${esc(str)}</text></g>`;
}
function rays(cx, cy, R, n, fill, rot, op = 1) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + rot, a1 = ((i + 0.5) / n) * Math.PI * 2 + rot;
    d += `M${cx} ${cy}L${f1(cx + R * Math.cos(a0))} ${f1(cy + R * Math.sin(a0))}L${f1(cx + R * Math.cos(a1))} ${f1(cy + R * Math.sin(a1))}Z`;
  }
  return `<path d="${d}" fill="${fill}" opacity="${op}"/>`;
}
function coin(x, y, r, { rot = 0, sx = 1, op = 1, token = false } = {}) {
  const face = token
    ? `<circle cx="${-r * .3}" cy="${-r * .18}" r="${r * .2}" fill="${P.paper}" stroke="${P.ink}" stroke-width="${r * .07}"/><circle cx="${r * .3}" cy="${-r * .18}" r="${r * .2}" fill="${P.paper}" stroke="${P.ink}" stroke-width="${r * .07}"/><circle cx="${-r * .27}" cy="${-r * .16}" r="${r * .09}" fill="${P.ink}"/><circle cx="${r * .33}" cy="${-r * .16}" r="${r * .09}" fill="${P.ink}"/><ellipse cy="${r * .3}" rx="${r * .36}" ry="${r * .2}" fill="${P.gullet}" stroke="${P.ink}" stroke-width="${r * .07}"/>`
    : `<circle r="${r * .72}" fill="none" stroke="${P.ink}" stroke-opacity=".25" stroke-width="${r * .06}"/><text class="tM" y="${r * .22}" text-anchor="middle" font-size="${r * .6}" fill="${P.ink}">SOL</text>`;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${sx.toFixed(3)} 1)" opacity="${op.toFixed(3)}"><circle r="${r}" fill="${token ? P.tomato : P.mustard}" stroke="${P.ink}" stroke-width="${r * .15}"/>${face}</g>`;
}
function walletBox(x, y, label, { op = 1, s = 1, crossed = 0, bump = 0 } = {}) {
  const X = crossed > 0
    ? `<g opacity="${crossed}" stroke="${P.tomato}" stroke-width="22" stroke-linecap="round"><path d="M-120 -80 L120 80 M120 -80 L-120 80"/></g>` : "";
  return `<g transform="translate(${x} ${y}) scale(${(s * (1 + bump * .06)).toFixed(3)} ${(s * (1 - bump * .05)).toFixed(3)})" opacity="${op}">
    <rect x="-160" y="-105" width="320" height="210" rx="30" fill="${P.paper}" stroke="${P.ink}" stroke-width="7"/>
    <rect x="-90" y="-112" width="180" height="22" rx="11" fill="${P.ink}"/>
    <rect x="96" y="-30" width="64" height="60" rx="16" fill="${P.mustard}" stroke="${P.ink}" stroke-width="6"/>
    <circle cx="124" cy="0" r="9" fill="${P.ink}"/>
    <text class="tM" x="-24" y="58" text-anchor="middle" font-size="24" fill="${P.ink}" letter-spacing="2">${label}</text>${X}</g>`;
}
function flame(x, y, s, t, i) {
  const k = 1 + 0.12 * Math.sin(t * 22 + i * 2.1) + 0.06 * Math.sin(t * 37 + i);
  const d = "M0 0 C-46 -8 -58 -80 0 -170 C58 -80 46 -8 0 0Z";
  return `<g transform="translate(${x} ${y}) scale(${s} ${f1(s * k * 100) / 100})">
    <path d="${d}" fill="${P.tomato}" stroke="${P.ink}" stroke-width="${6 / s}"/>
    <path d="${d}" transform="scale(.66) translate(0 -4)" fill="${P.mustard}"/>
    <path d="${d}" transform="scale(.32) translate(0 -8)" fill="${P.paper}"/></g>`;
}
function fire(x, y, grow, t) {
  if (grow <= 0) return "";
  return `<g opacity="${clamp(grow * 2)}">
    <rect x="${x - 120}" y="${y - 6}" width="240" height="34" rx="17" fill="${P.soft}" stroke="${P.ink}" stroke-width="6" transform="rotate(-8 ${x} ${y})"/>
    <rect x="${x - 120}" y="${y - 6}" width="240" height="34" rx="17" fill="${P.soft}" stroke="${P.ink}" stroke-width="6" transform="rotate(8 ${x} ${y})"/>
    ${flame(x - 62, y + 4, 0.62 * grow, t, 1)}${flame(x + 62, y + 4, 0.62 * grow, t, 2)}${flame(x, y + 8, 0.92 * grow, t, 3)}</g>`;
}
function lpTicket(x, y, { rot = 0, s = 1, burn = 0, op = 1 } = {}) {
  const fill = burn > 0 ? `rgb(${Math.round(lerp(255, 43, burn))},${Math.round(lerp(224, 10, burn))},${Math.round(lerp(138, 46, burn))})` : "#FFE08A";
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${(s * (1 - burn * .7)).toFixed(3)})" opacity="${op.toFixed(3)}">
    <path d="M-100 -58 H100 V-18 A18 18 0 0 0 100 18 V58 H-100 V18 A18 18 0 0 0 -100 -18Z" fill="${fill}" stroke="${P.ink}" stroke-width="7"/>
    <text class="tH" y="22" text-anchor="middle" font-size="64" fill="${P.ink}">LP</text></g>`;
}
function burst(t, t0, cx, cy, n = 22, seed = 1, dist = 330, dur = 1.1) {
  const p = (t - t0) / dur;
  if (p <= 0 || p >= 1) return "";
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(seed + i) * 0.5;
    const d = dist * (0.45 + 0.55 * rnd(seed * 7 + i)) * easeOut(p);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + 260 * p * p;
    const op = 1 - easeIn(p), rot = (rnd(seed + i * 3) - 0.5) * 720 * p;
    if (i % 3 === 0) out += coin(x, y, 17, { rot, op });
    else if (i % 3 === 1) out += `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" d="M0 -22 L6 -7 L22 -7 L9 3 L14 19 L0 9 L-14 19 L-9 3 L-22 -7 L-6 -7Z" fill="${P.mustard}" stroke="${P.ink}" stroke-width="3" opacity="${op.toFixed(2)}"/>`;
    else out += `<rect transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" x="-8" y="-8" width="16" height="16" rx="4" fill="${P.tomato}" stroke="${P.ink}" stroke-width="3" opacity="${op.toFixed(2)}"/>`;
  }
  return out;
}
function flash(t, t0, cx, cy) {
  const p = seg(t, t0, t0 + 0.7);
  if (p <= 0 || p >= 1) return "";
  const op = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
  return `<circle cx="${cx}" cy="${cy}" r="${f1(260 + 380 * p)}" fill="url(#flash)" opacity="${op.toFixed(3)}"/>`;
}
function pill(str, x, y, t, t0, out) {
  const w = str.length * 18 + 56;
  const p = seg(t, t0, t0 + 0.35);
  if (p <= 0) return "";
  const q = out != null ? seg(t, out, out + 0.25) : 0;
  if (q >= 1) return "";
  return `<g transform="translate(${x} ${y}) scale(${(0.5 + 0.5 * backOut(p)).toFixed(3)})" opacity="${((1 - q) * clamp(p * 3)).toFixed(3)}">
    <rect x="${-w / 2}" y="-30" width="${w}" height="60" rx="30" fill="${P.ink}"/>
    <text class="tM" y="11" text-anchor="middle" font-size="30" fill="${P.mustard}" letter-spacing="1">${esc(str)}</text></g>`;
}

/* ---------------- Gob ---------------- */
const FORM_SVG = FORMS.map((f, k) => f("v" + k));
const MOUTH_CY = [251, 338, 254, 222, 248];
const MOUTH_POS = [[200, 251], [200, 338], [200, 254], [200, 222], [200, 248]];
const BLINKS = [4.6, 7.9, 10.6, 16.2, 19.4, 24.6, 27.6, 34.4, 38.7];
const FLICK = [240, 210, 180, 150, 125, 100, 85, 70, 58, 48, 40, 34].map((x) => x / 1000);
const FLICK_LEN = FLICK.reduce((a, b) => a + b, 0);

function drawGob(g) {
  let svg = FORM_SVG[g.k];
  const b = g.blink ?? 1, lx = g.look?.[0] ?? 0, ly = g.look?.[1] ?? 0.2;
  svg = svg.replace(/<g class="eye"><circle cx="([\d.]+)" cy="([\d.]+)"/g, (m, cx, cy) =>
    `<g class="eye" transform="translate(${cx} ${cy}) scale(1 ${b.toFixed(3)}) translate(${-cx} ${-cy})"><circle cx="${cx}" cy="${cy}"`);
  svg = svg.replace(/<g class="pupil" data-cx="[\d.]+" data-cy="[\d.]+" data-r="([\d.]+)">/g, (m, r) =>
    `<g class="pupil" transform="translate(${f1(lx * r)} ${f1(ly * r)})">`);
  const my = MOUTH_CY[g.k];
  svg = svg.replace('<g class="m">', `<g class="m" transform="translate(0 ${my}) scale(1 ${(g.mouth ?? 1).toFixed(3)}) translate(0 ${-my})">`);
  if (g.k === 4) {
    svg = svg.replace('<circle class="charge" cx="200" cy="262" r="66"', `<circle class="charge" cx="200" cy="262" r="${f1(66 * (g.charge ?? 1))}"`);
    svg = svg.replace('<g class="tail">', `<g class="tail" transform="rotate(${f1(g.tail ?? 0)} 296 344)">`);
  }
  const s = g.s ?? 1, sx = g.sx ?? 1, sy = g.sy ?? 1;
  return `<g transform="translate(${f1(g.x)} ${f1(g.y)}) rotate(${f1(g.rot ?? 0)}) scale(${(s * sx).toFixed(3)} ${(s * sy).toFixed(3)}) translate(-200 -384)"${g.white ? ' filter="url(#wht)"' : ""} opacity="${(g.op ?? 1).toFixed(3)}">
    <ellipse cx="200" cy="384" rx="${SHADOW_RX[g.k]}" ry="13" fill="${P.ink}" opacity=".16"/>${svg}</g>`;
}
// world position of the mouth for a given gob state
const mouthAt = (g) => [g.x + (MOUTH_POS[g.k][0] - 200) * g.s, g.y + (MOUTH_POS[g.k][1] - 384) * g.s];

function blinkAt(t) {
  for (const bt of BLINKS) { const d = Math.abs(t - bt); if (d < 0.09) return 0.08 + 0.92 * (d / 0.09); }
  return 1;
}
// evolution: shake, then white silhouette flickering between forms, then pop
function evo(t, t0, from, to) {
  if (t < t0 - 0.5) return { k: from };
  if (t < t0) return { k: from, shake: (t - (t0 - 0.5)) / 0.5 };
  if (t < t0 + FLICK_LEN) {
    let acc = t0, i = 0;
    for (const d of FLICK) { if (t < acc) break; acc += d; i++; }
    const d = FLICK[i - 1], start = acc - d;
    return { k: i % 2 ? to : from, white: 1, pulse: 1 + (i % 2 ? 0.07 : -0.05) * Math.sin(Math.PI * (t - start) / d) };
  }
  const p = seg(t, t0 + FLICK_LEN, t0 + FLICK_LEN + 0.6);
  return p < 1 ? { k: to, pop: p } : { k: to };
}
const evoEnd = (t0) => t0 + FLICK_LEN;

// Where Gob is and what it is doing at time t
function gobState(t) {
  const bob = Math.sin((t * 2 * Math.PI) / 1.6);
  let g = { k: 1, x: 540, y: 880, s: 1.35, look: [0, 0.2], blink: blinkAt(t), sx: 1 + 0.015 * bob, sy: 1 - 0.02 * bob };
  g.y -= 8 * Math.max(0, bob);

  if (t < evoEnd(2.1)) {
    // falling egg → land → wobble → hatch
    g = { k: 0, x: 540, y: 880, s: 1.35, look: [0, 0], blink: 1 };
    if (t < 0.9) g.y = lerp(-420, 880, easeIn(seg(t, 0, 0.9)));
    else {
      const q = seg(t, 0.9, 1.4);
      g.sx = 1 + 0.2 * (1 - easeOut(q)) * Math.cos(q * 9);
      g.sy = 1 - 0.18 * (1 - easeOut(q)) * Math.cos(q * 9);
      const amp = 2 + 7 * seg(t, 1.3, 2.4);
      g.rot = t > 1.3 ? Math.sin((t - 1.3) * 17) * amp : 0;
      g.mouth = 1 + 0.45 * Math.max(0, Math.sin(t * 11));
      g.look = [Math.sin(t * 3), 0];
    }
    const e = evo(t, 2.1, 0, 1);
    if (t >= 2.1) Object.assign(g, { k: e.k, white: e.white, s: 1.35 * (e.pulse ?? 1), rot: 0, sx: 1, sy: 1, mouth: 1 });
    return g;
  }
  if (t < 14.0) {
    const e = evo(t, 2.1, 0, 1);
    if (e.pop != null) g.s = 1.35 * (0.55 + 0.45 * backOut(e.pop));
    if (t > 6.0 && t < 9.2) g.look = [0, -1];                       // staring at the fee coins
    if (t > 9.8 && t < 11.3) g.look = [1, -0.2];                    // watching the dev wallet
    if (t > 11.3 && t < 11.7) { g.blink = 1; g.sy *= 1.08; g.look = [0.6, -0.6]; } // startled by the stamp
    if (t > 11.9 && t < 13.0) { g.mouth = lerp(1, 1.9, seg(t, 11.9, 12.3)); g.look = [0.3, -1]; }
    if (t >= 13.0 && t < 13.5) { const c = seg(t, 13.0, 13.4); g.mouth = c < 0.5 ? lerp(1.9, 0.1, c * 2) : lerp(0.1, 1, (c - 0.5) * 2); g.sx *= 1 + 0.1 * Math.sin(Math.PI * c); g.sy *= 1 - 0.1 * Math.sin(Math.PI * c); }
    return g;
  }
  if (t < 26.0) {
    // how-it-works: Gob waits on the right
    const m = easeInOut(seg(t, 14.0, 14.6));
    g.x = lerp(540, 820, m); g.y = lerp(880, 930, m) - 8 * Math.max(0, bob); g.s = lerp(1.35, 1.05, m);
    g.look = t < 20 ? [-1, 0] : [-1, -0.4];
    if (t > 20.3 && t < 21.3) g.mouth = lerp(1, 1.8, seg(t, 20.3, 20.6));
    if (t >= 21.3 && t < 21.7) { const c = seg(t, 21.3, 21.7); g.mouth = c < 0.5 ? lerp(1.8, 0.1, c * 2) : lerp(0.1, 1, (c - 0.5) * 2); g.sx *= 1 + 0.1 * Math.sin(Math.PI * c); g.sy *= 1 - 0.1 * Math.sin(Math.PI * c); }
    const e = evo(t, 22.0, 1, 2);
    g.k = e.k;
    if (e.k === 2) g.s = 0.95;
    if (e.white) { g.white = 1; g.s *= e.pulse; }
    if (e.shake) g.rot = Math.sin(t * 60) * 4 * e.shake;
    if (e.pop != null) g.s = 0.95 * (0.55 + 0.45 * backOut(e.pop));
    if (t > 23.4 && t < 24.3) { g.mouth = t < 23.6 ? lerp(1, 1.5, seg(t, 23.4, 23.6)) : lerp(1.5, 1, seg(t, 23.6, 24.0)); }
    return g;
  }
  if (t < 33.0) {
    // evolution montage
    const m = easeInOut(seg(t, 26.0, 26.6));
    g.x = lerp(820, 540, m); g.y = lerp(930, 900, m) - 8 * Math.max(0, bob); g.s = lerp(0.95, 1.1, m); g.k = 2;
    const e1 = evo(t, 27.0, 2, 3), e2 = evo(t, 29.3, 3, 4);
    const e = t < 29.3 - 0.5 ? e1 : e2;
    g.k = e.k;
    if (e.white) { g.white = 1; g.s *= e.pulse; }
    if (e.shake) g.rot = Math.sin(t * 60) * 4 * e.shake;
    if (e.pop != null) g.s *= 0.55 + 0.45 * backOut(e.pop);
    if (g.k === 4) {
      g.tail = Math.sin(t * 2.4) * 8;
      g.charge = 0.85 + 0.25 * Math.sin(t * 5);
      if (t > 30.9 && t < 32.2) { const r = seg(t, 30.9, 31.1); g.mouth = lerp(1, 1.35, r); g.charge = 1.6; g.look = [0, -0.3]; g.rot = Math.sin(t * 70) * 2; }
    }
    return g;
  }
  if (t < 36.0) {
    // the dev plate: Kaiju peeks in from the right
    const m = easeOut(seg(t, 33.4, 34.0));
    return { k: 4, x: lerp(1260, 1010, m), y: 1010, s: 1.0, rot: -14, look: [-1, 0.3], blink: blinkAt(t), charge: 0.9, tail: Math.sin(t * 2.4) * 6, sx: 1 + 0.015 * bob, sy: 1 - 0.02 * bob };
  }
  // end card
  const p = seg(t, 36.3, 36.9);
  g = { k: 2, x: 540, y: 950, s: 1.25 * (p < 1 ? 0.3 + 0.7 * backOut(p) : 1), look: [0, 0.25], blink: blinkAt(t), sx: 1 + 0.015 * bob, sy: 1 - 0.02 * bob };
  g.y -= 8 * Math.max(0, bob);
  if (t > 37.2 && t < 37.9) {
    const c = seg(t, 37.2, 37.6);
    g.mouth = c < 0.5 ? lerp(1, 0.1, c * 2) : lerp(0.1, 1, (c - 0.5) * 2);
    g.sx *= 1 + 0.1 * Math.sin(Math.PI * c); g.sy *= 1 - 0.1 * Math.sin(Math.PI * c);
  }
  return p > 0 ? g : null;
}

/* ---------------- the timeline ---------------- */
function scene(t) {
  let back = "", mid = "", front = "", overlay = "";
  const g = gobState(t);

  // background rays, brighter while Gob evolves
  back += rays(540, 700, 1100, 32, P.gum2, t * 0.12);
  if (g && g.white) back += `<circle cx="${g.x}" cy="${g.y - 170 * g.s}" r="420" fill="url(#glow)"/>` + rays(g.x, g.y - 170 * g.s, 700, 24, P.mustard, -t * 0.8, 0.55);

  /* S1 · intro */
  if (t < 5.4) {
    front += txt("MEET GOB.", 540, 250, { t, t0: 3.7, out: 5.1, size: 150, fill: P.tomato, stroke: P.ink, sw: 12 });
    front += txt("a hungry liquidity pool on Solana", 540, 335, { t, t0: 4.1, out: 5.1, cls: "tB", size: 46 });
    overlay += flash(t, evoEnd(2.1), 540, 700) + burst(t, evoEnd(2.1), 540, 720, 24, 3);
  }

  /* S2 · every trade pays a fee */
  const feeCoins = [[330, 560], [540, 520], [750, 560]];
  if (t >= 5.2 && t < 9.6) {
    front += txt("EVERY TRADE", 540, 200, { t, t0: 5.3, out: 9.2, size: 104 });
    front += txt("PAYS A FEE.", 540, 318, { t, t0: 5.55, out: 9.2, size: 104, fill: P.tomato, stroke: P.ink, sw: 10 });
    const buyP = easeOut(seg(t, 5.8, 6.2)), sellP = easeOut(seg(t, 6.2, 6.6));
    const pout = 1 - seg(t, 8.9, 9.2);
    if (buyP > 0) mid += `<g transform="translate(${lerp(-200, 250, buyP)} 430)" opacity="${pout}"><rect x="-90" y="-38" width="180" height="76" rx="38" fill="${P.mustard}" stroke="${P.ink}" stroke-width="7"/><text class="tH" y="18" text-anchor="middle" font-size="50" fill="${P.ink}">BUY</text></g>`;
    if (sellP > 0) mid += `<g transform="translate(${lerp(1280, 830, sellP)} 430)" opacity="${pout}"><rect x="-96" y="-38" width="192" height="76" rx="38" fill="${P.paper}" stroke="${P.ink}" stroke-width="7"/><text class="tH" y="18" text-anchor="middle" font-size="50" fill="${P.ink}">SELL</text></g>`;
  }
  // the three fee coins live from S2 into S3
  if (t >= 6.4 && t < 13.2) {
    feeCoins.forEach(([cx, cy], i) => {
      const t0 = 6.4 + i * 0.45;
      if (t < t0) return;
      let [x, y] = [cx, cy - 18 * Math.sin((t - t0) * 3 + i)];
      let s = 0.4 + 0.6 * backOut(seg(t, t0, t0 + 0.35)), op = 1;
      // S3: coins fly into the dev wallet...
      const toDev = seg(t, 10.0 + i * 0.15, 10.7 + i * 0.15);
      if (toDev > 0) { [x, y] = arc(easeInOut(toDev), [cx, cy], [820, 500], 160); s *= 1 - 0.5 * toDev; }
      // ...and burst back out into Gob's mouth after the stamp
      const back2 = seg(t, 12.05 + i * 0.12, 12.85 + i * 0.12);
      if (back2 > 0) { const m = mouthAt({ k: 1, x: 540, y: 880, s: 1.35 }); [x, y] = arc(easeIn(back2), [820, 480], m, 300); s = 0.9 - 0.5 * back2; op = back2 > 0.95 ? 0 : 1; }
      else if (toDev >= 1 && t < 12.05) op = 0;
      mid += coin(x, y, 46 * s, { rot: Math.sin(t * 4 + i) * 12, op });
    });
    if (t < 9.3) mid += txt("creator fee", 540, 640, { t, t0: 7.4, out: 9.0, cls: "tM", size: 30, fill: P.soft });
  }

  /* S3 · on most coins the dev eats the fees. not here. */
  if (t >= 9.2 && t < 14.2) {
    front += txt("ON MOST COINS,", 540, 190, { t, t0: 9.3, out: 11.95, size: 86 });
    front += txt("THE DEV EATS THE FEES.", 540, 292, { t, t0: 9.55, out: 11.95, size: 76, fill: P.tomato, stroke: P.ink, sw: 9 });
    const inP = easeOut(seg(t, 9.6, 10.0)), outP = seg(t, 13.4, 13.8);
    const stampP = seg(t, 11.3, 11.5);
    const bump = t > 10.7 && t < 11.1 ? Math.sin(seg(t, 10.7, 11.1) * Math.PI) : 0;
    if (inP > 0 && outP < 1) mid += walletBox(lerp(1300, 820, inP), 500, "DEV WALLET", { op: 1 - outP, s: 0.9, crossed: stampP, bump });
    if (stampP > 0 && outP < 1) {
      const s = lerp(2.2, 0.82, easeIn(stampP));
      front += `<g transform="translate(820 505) rotate(-10) scale(${s.toFixed(3)})" opacity="${(clamp(stampP * 2) * (1 - outP)).toFixed(3)}">
        <rect x="-250" y="-82" width="500" height="150" rx="22" fill="none" stroke="${P.tomato}" stroke-width="12"/>
        <text class="tH" y="34" text-anchor="middle" font-size="104" fill="${P.tomato}" stroke="${P.ink}" stroke-width="6" paint-order="stroke fill">NOT HERE.</text></g>`;
    }
    front += txt("HERE, GOB EATS", 540, 200, { t, t0: 12.15, out: 13.85, size: 96 });
    front += txt("ALL OF IT.", 540, 312, { t, t0: 12.4, out: 13.85, size: 104, fill: P.tomato, stroke: P.ink, sw: 10 });
    if (t > 13.0 && t < 14) overlay += burst(t, 13.05, 540, 820, 10, 11, 180, 0.8) + txt("+nom", 620, 690, { t, t0: 13.05, out: 13.7, size: 64, fill: P.mustard, stroke: P.ink, sw: 8 });
  }

  /* S4 · how it works */
  if (t >= 14.0 && t < 26.3) {
    const fadeAll = seg(t, 25.9, 26.2);
    let s4 = "";
    s4 += txt("HOW GOB EATS", 540, 118, { t, t0: 14.1, out: 25.9, size: 66, fill: P.soft });
    const steps = [
      [14.5, "FEES LAND IN THE", "STOMACH WALLET."],
      [17.3, "HALF BUYS $FEEDME,", "HALF STAYS SOL."],
      [20.1, "BOTH GET FED", "INTO THE POOL."],
      [23.2, "LP TOKENS GET", "BURNED. FOREVER."],
    ];
    steps.forEach(([t0, a, b], i) => {
      const end = i < 3 ? steps[i + 1][0] - 0.25 : 25.9;
      if (t < t0 || t > end + 0.3) return;
      const p = seg(t, t0, t0 + 0.4);
      s4 += `<g transform="translate(96 250) scale(${(0.4 + 0.6 * backOut(p)).toFixed(3)})" opacity="${(1 - seg(t, end, end + 0.25)).toFixed(3)}"><circle r="50" fill="${P.tomato}" stroke="${P.ink}" stroke-width="7"/><text class="tH" y="22" text-anchor="middle" font-size="64" fill="${P.paper}">${i + 1}</text></g>`;
      s4 += txt(a, 172, 240, { t, t0: t0 + 0.08, out: end, size: 60, anchor: "start" });
      s4 += txt(b, 172, 314, { t, t0: t0 + 0.2, out: end, size: 60, anchor: "start", fill: P.tomato, stroke: P.ink, sw: 8 });
    });
    // progress dots
    for (let i = 0; i < 4; i++) {
      const on = t >= steps[i][0];
      s4 += `<circle cx="${480 + i * 40}" cy="160" r="${on ? 11 : 8}" fill="${on ? P.tomato : P.gum2}" stroke="${P.ink}" stroke-width="3" opacity="${(clamp(seg(t, 14.2, 14.5)) * (1 - fadeAll)).toFixed(2)}"/>`;
    }
    // step 1: wallet + coins dropping in
    const wIn = seg(t, 14.6, 15.0), wOut = seg(t, 19.9, 20.3);
    const bump = [15.25, 15.65, 16.05].reduce((m, bt) => Math.max(m, t > bt && t < bt + 0.3 ? Math.sin(seg(t, bt, bt + 0.3) * Math.PI) : 0), 0);
    if (wIn > 0 && wOut < 1) s4 += walletBox(350, 690, "STOMACH WALLET", { s: 0.4 + 0.6 * backOut(wIn), op: 1 - wOut, bump });
    [0, 1, 2].forEach((i) => {
      const t0 = 14.9 + i * 0.4, p = seg(t, t0, t0 + 0.35);
      if (p > 0 && p < 1) s4 += coin(350 + (i - 1) * 30, lerp(330, 585, easeIn(p)), 40, { rot: p * 180 });
    });
    if (t > 16.2 && t < 17.1) s4 += txt("+ creator fees", 350, 860, { t, t0: 16.2, out: 16.9, cls: "tM", size: 32, fill: P.soft });
    // step 2: split into SOL + $FEEDME
    const split = seg(t, 17.6, 18.2);
    const solPos = [lerp(350, 230, easeOut(split)), lerp(640, 470, easeOut(split))];
    const tokPos = [lerp(350, 470, easeOut(split)), lerp(640, 470, easeOut(split))];
    const flip = seg(t, 18.5, 18.9), feedP = seg(t, 20.5, 21.2);
    const mouth = mouthAt({ k: 1, x: 820, y: 930, s: 1.05 });
    if (split > 0 && feedP < 1) {
      const [sx1, sy1] = feedP > 0 ? arc(easeIn(feedP), [230, 470], mouth, 260) : solPos;
      const [sx2, sy2] = feedP > 0 ? arc(easeIn(clamp(feedP * 1.1)), [470, 470], mouth, 200) : tokPos;
      const sc = 1 - 0.55 * feedP;
      s4 += coin(sx1, sy1 - (feedP ? 0 : 10 * Math.sin(t * 4)), 50 * sc, { rot: feedP * 300 });
      s4 += coin(sx2, sy2 - (feedP ? 0 : 10 * Math.sin(t * 4 + 1)), 50 * sc, { token: flip >= 0.5, sx: Math.abs(Math.cos(flip * Math.PI)) || 0.02, rot: feedP * 300 });
      if (t > 18.0 && t < 20.0) {
        s4 += txt("SOL", 230, 560, { t, t0: 18.0, out: 19.8, cls: "tM", size: 30, fill: P.soft });
        s4 += txt("$FEEDME", 470, 560, { t, t0: 18.9, out: 19.8, cls: "tM", size: 30, fill: P.soft });
      }
    }
    if (t > 18.55 && t < 19.4) s4 += burst(t, 18.7, 470, 470, 8, 21, 110, 0.6);
    if (t > 21.3 && t < 22.1) s4 += burst(t, 21.35, mouth[0], mouth[1], 10, 31, 170, 0.7) + txt("+nom", 700, 700, { t, t0: 21.35, out: 21.9, size: 60, fill: P.mustard, stroke: P.ink, sw: 8 });
    if (t > 22.0 && t < 23.3) s4 += txt("pool gets deeper", 380, 620, { t, t0: 22.0, out: 23.05, cls: "tB", size: 44, fill: P.soft });
    // step 4: LP ticket out of the pool, into the fire
    const lpOut = seg(t, 23.4, 24.0), lpDrop = seg(t, 24.15, 24.55), burnP = seg(t, 24.6, 25.4);
    const chonkMouth = mouthAt({ k: 2, x: 820, y: 930, s: 0.95 });
    s4 += fire(360, 850, easeOut(seg(t, 23.4, 23.9)) * (1 - fadeAll), t);
    if (lpOut > 0 && burnP < 1) {
      const [lx, ly] = lpDrop > 0 ? [360, lerp(540, 790, easeIn(lpDrop))] : arc(easeOut(lpOut), chonkMouth, [360, 540], 180);
      s4 += lpTicket(lx, ly, { rot: lpDrop > 0 ? lpDrop * 20 : (1 - lpOut) * -30, s: 0.5 + 0.5 * lpOut, burn: burnP, op: 1 - easeIn(burnP) });
    }
    if (burnP > 0 && burnP < 1) s4 += burst(t, 24.6, 360, 760, 8, 41, 120, 0.8);
    if (t > 25.1) s4 += txt("so the liquidity can never be pulled out", 60, 962, { t, t0: 25.1, out: 25.9, cls: "tB", size: 34, anchor: "start", fill: P.soft });
    mid += s4;
    overlay += flash(t, evoEnd(22.0), 820, 800) + burst(t, evoEnd(22.0), 820, 800, 20, 5, 280);
  }

  /* S5 · every meal makes Gob grow */
  if (t >= 26.0 && t < 33.2) {
    front += txt("EVERY MEAL", 540, 176, { t, t0: 26.1, out: 32.8, size: 104 });
    front += txt("MAKES GOB GROW.", 540, 292, { t, t0: 26.35, out: 32.8, size: 96, fill: P.tomato, stroke: P.ink, sw: 10 });
    const label = t < evoEnd(27.0) ? "CHONK · 10+ SOL FED" : t < evoEnd(29.3) ? "ABSOLUTE UNIT · 50+ SOL FED" : "KAIJU · 200+ SOL FED";
    const lt0 = t < evoEnd(27.0) ? 26.6 : t < evoEnd(29.3) ? evoEnd(27.0) + 0.1 : evoEnd(29.3) + 0.1;
    front += pill(label, 540, 372, t, lt0, 32.8);
    overlay += flash(t, evoEnd(27.0), 540, 740) + burst(t, evoEnd(27.0), 540, 740, 24, 7);
    overlay += flash(t, evoEnd(29.3), 540, 720) + burst(t, evoEnd(29.3), 540, 720, 28, 9, 380);
    if (t > 30.9 && t < 32.4) {
      const p = seg(t, 30.9, 31.2);
      overlay += `<g transform="translate(540 560) rotate(-6) scale(${(0.5 + 0.8 * backOut(p)).toFixed(3)})" opacity="${(1 - seg(t, 32.0, 32.4)).toFixed(3)}"><text class="tH" text-anchor="middle" font-size="150" fill="${P.mustard}" stroke="${P.ink}" stroke-width="12" paint-order="stroke fill">ROOAAR!</text></g>`;
    }
  }

  /* S6 · the dev eats nothing */
  if (t >= 33.0 && t < 36.3) {
    const pIn = backOut(seg(t, 33.5, 33.9)), pOut = seg(t, 35.8, 36.1);
    front += txt("THE DEV", 540, 190, { t, t0: 33.1, out: 35.8, size: 116 });
    front += txt("EATS NOTHING.", 540, 318, { t, t0: 33.35, out: 35.8, size: 110, fill: P.tomato, stroke: P.ink, sw: 11 });
    if (pIn > 0) mid += `<g transform="translate(470 690) scale(${(pIn * 1).toFixed(3)})" opacity="${(1 - pOut).toFixed(3)}">
      <ellipse cx="0" cy="14" rx="330" ry="104" fill="${P.ink}" opacity=".14"/>
      <ellipse cx="0" cy="0" rx="320" ry="100" fill="${P.paper}" stroke="${P.ink}" stroke-width="7"/>
      <ellipse cx="0" cy="-6" rx="210" ry="58" fill="none" stroke="#F2B8CC" stroke-width="5" stroke-dasharray="14 12"/>
      <path d="M-60 -8 C-30 -30 -10 18 20 -8 C50 -30 70 14 96 -6" fill="none" stroke="${P.mustard}" stroke-width="10" stroke-linecap="round"/>
      <path d="M-60 -8 C-30 -30 -10 18 20 -8 C50 -30 70 14 96 -6" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round" opacity=".35"/></g>`;
    front += txt("(one noodle. from yesterday.)", 470, 560, { t, t0: 34.0, out: 35.8, cls: "tM", size: 30, fill: P.soft });
    front += txt("DEV ATE: 0.000 SOL", 470, 880, { t, t0: 34.4, out: 35.8, size: 62 });
  }

  /* S7 · end card */
  if (t >= 36.0) {
    front += txt("FEED ME.", 540, 300, { t, t0: 36.1, size: 196, fill: P.tomato, stroke: P.ink, sw: 14 });
    front += txt("$FEEDME on Solana", 540, 390, { t, t0: 36.5, cls: "tB", size: 52 });
    front += txt("100% of creator fees feed the pool", 540, 450, { t, t0: 36.8, cls: "tB", size: 36, fill: P.soft });
    if (t > 37.5 && t < 38.3) overlay += burst(t, 37.45, 540, 790, 10, 51, 200, 0.8);
  }

  // ticker band at the bottom
  const bandUp = easeOut(seg(t, 1.0, 1.5));
  let band = "";
  if (bandUp > 0) {
    const y = lerp(1080, 990, bandUp);
    band += `<rect x="0" y="${f1(y)}" width="1080" height="100" fill="${P.ink}"/>`;
    if (t < 36.0) {
      const msg = "$FEEDME  ·  100% OF CREATOR FEES FEED THE POOL  ·  LP BURNED  ·  THE DEV EATS NOTHING  ·  FEEDMESOL.FUN  ·  ";
      band += `<text class="tM" x="${f1(40 - t * 90)}" y="${f1(y + 56)}" font-size="30" fill="${P.mustard}">${esc(msg.repeat(6))}</text>`;
    } else {
      const p = seg(t, 36.9, 37.3);
      band += `<g opacity="${p.toFixed(3)}"><text class="tM" x="540" y="${f1(y + 60)}" text-anchor="middle" font-size="42" fill="${P.mustard}" letter-spacing="2">feedmesol.fun  ·  @feedmelana</text></g>`;
    }
  }

  // screen shake: stamp, roar, egg landing
  let sx = 0, sy = 0;
  const shake = (a, b, amp) => { if (t > a && t < b) { const k = amp * (1 - seg(t, a, b)); sx += Math.sin(t * 90) * k; sy += Math.cos(t * 77) * k; } };
  shake(0.9, 1.2, 10); shake(11.35, 11.8, 16); shake(30.9, 32.0, 14);

  return `<rect width="1080" height="1080" fill="${P.gum}"/>
    <g transform="translate(${f1(sx)} ${f1(sy)})">${back}${mid}${g ? drawGob(g) : ""}${front}${overlay}</g>${band}`;
}


/* ---------------- launch day: WE ARE LIVE ---------------- */
const LIVE_CHOMPS = [6.0, 7.6, 9.2, 10.6];
const LIVE_GOB = { k: 2, x: 540, y: 960, s: 0.95 };
function liveScene(t) {
  let back = "", mid = "", front = "", overlay = "";
  back += rays(540, 640, 1300, 36, P.gum2, t * 0.45);

  // 3 · 2 · 1
  ["3", "2", "1"].forEach((n, i) => {
    const t0 = 0.1 + i * 0.5;
    if (t < t0 || t >= t0 + 0.5) return;
    const p = seg(t, t0, t0 + 0.5);
    front += `<g transform="translate(540 560) scale(${(0.6 + 0.8 * easeOut(p)).toFixed(3)})" opacity="${(1 - easeIn(p)).toFixed(3)}"><text class="tH" text-anchor="middle" y="100" font-size="320" fill="${P.tomato}" stroke="${P.ink}" stroke-width="16" paint-order="stroke fill">${n}</text></g>`;
  });

  // background coin rain after the slam
  for (let i = 0; i < 46; i++) {
    const t0 = 3.3 + i * 0.17, p = seg(t, t0, t0 + 1.7);
    if (p <= 0 || p >= 1) continue;
    mid += coin(40 + rnd(i + 3) * 1000, lerp(-60, 1100, p), 20 + rnd(i * 5) * 16, { rot: p * 400 * (rnd(i) - 0.5), op: 0.9 });
  }

  // Gob: egg drops, shakes, hatches straight into Chonk, then chomps what falls into its mouth
  let g = null;
  if (t >= 1.2) {
    const e = evo(t, 1.7, 0, 2), bob = Math.sin((t * 2 * Math.PI) / 1.2);
    g = { k: e.k, x: LIVE_GOB.x, y: lerp(-320, LIVE_GOB.y, easeIn(seg(t, 1.2, 1.5))), s: LIVE_GOB.s, look: [0, 0.2], blink: 1 };
    if (t > 1.5 && t < 1.7) { const q = seg(t, 1.5, 1.7); g.sx = 1 + 0.18 * (1 - q); g.sy = 1 - 0.16 * (1 - q); g.rot = Math.sin(t * 50) * 5; }
    if (e.shake) g.rot = Math.sin(t * 60) * 6 * e.shake;
    if (e.white) { g.white = 1; g.s *= e.pulse; }
    if (e.pop != null) g.s = LIVE_GOB.s * (0.55 + 0.45 * backOut(e.pop));
    if (t > evoEnd(1.7) + 0.6) { g.y -= 10 * Math.max(0, bob); g.sx = 1 + 0.02 * bob; g.sy = 1 - 0.025 * bob; }
    for (const ct of LIVE_CHOMPS) {
      if (t > ct - 0.45 && t < ct) { g.mouth = lerp(1, 1.6, seg(t, ct - 0.45, ct - 0.25)); g.look = [0, -1]; }
      if (t >= ct && t < ct + 0.4) { const c = seg(t, ct, ct + 0.4); g.mouth = c < 0.5 ? lerp(1.6, 0.1, c * 2) : lerp(0.1, 1, (c - 0.5) * 2); g.sx = 1 + 0.1 * Math.sin(Math.PI * c); g.sy = 1 - 0.1 * Math.sin(Math.PI * c); }
    }
    g.blink = blinkAt(t + 30);
  }
  const mouth = mouthAt(LIVE_GOB);
  LIVE_CHOMPS.forEach((ct, i) => {
    const p = seg(t, ct - 0.8, ct);
    if (p > 0 && p < 1) { const [x, y] = arc(easeIn(p), [200 + i * 230, -60], mouth, -80); mid += coin(x, y, 34 * (1 - 0.4 * p), { rot: p * 300 }); }
    if (t > ct && t < ct + 0.8) overlay += burst(t, ct, mouth[0], mouth[1], 8, 60 + i, 150, 0.7);
  });

  // WE ARE / LIVE!
  front += txt("WE ARE", 540, 148, { t, t0: 3.0, size: 124 });
  const slam = seg(t, 3.25, 3.5);
  if (slam > 0) front += `<g transform="translate(540 342) rotate(-4) scale(${lerp(2.6, 1, easeIn(slam)).toFixed(3)})" opacity="${clamp(slam * 2).toFixed(3)}"><text class="tH" text-anchor="middle" font-size="200" fill="${P.tomato}" stroke="${P.ink}" stroke-width="14" paint-order="stroke fill">LIVE!</text></g>`;
  front += txt("$FEEDME is live on pump.fun", 540, 402, { t, t0: 4.3, cls: "tB", size: 40 });

  // CA box
  const caP = seg(t, 5.0, 5.4);
  if (caP > 0) {
    const shown = CA || "revealed at launch";
    front += `<g transform="translate(540 478) scale(${(0.5 + 0.5 * backOut(caP)).toFixed(3)})" opacity="${clamp(caP * 3).toFixed(3)}">
      <rect x="-510" y="-44" width="1020" height="88" rx="22" fill="${P.paper}" stroke="${P.ink}" stroke-width="6"/>
      <path d="M-488 -44 H-390 V44 H-488 A22 22 0 0 1 -510 22 V-22 A22 22 0 0 1 -488 -44Z" fill="${P.ink}"/>
      <text class="tM" x="-450" y="12" text-anchor="middle" font-size="34" fill="${P.mustard}">CA</text>
      <text class="tM" x="60" y="10" text-anchor="middle" font-size="${shown.length > 40 ? 27 : 32}" fill="${P.ink}">${esc(shown)}</text></g>`;
  }
  // what makes it $FEEDME
  [["100% FEES FEED THE POOL", 293, 6.3], ["LP BURNED", 657, 6.5], ["DEV EATS 0", 904, 6.7]].forEach(([label, x, t0]) => { front += pill(label, x, 574, t, t0, null); });

  overlay += flash(t, evoEnd(1.7), 540, 800) + burst(t, evoEnd(1.7), 540, 800, 24, 71);
  overlay += burst(t, 3.3, 540, 300, 30, 81, 520, 1.3);

  // ticker
  let band = `<rect x="0" y="990" width="1080" height="90" fill="${P.ink}"/>`;
  if (t < 10.4) {
    const msg = `WE ARE LIVE  ·  $FEEDME  ·  ${CA ? "CA " + CA + "  ·  " : ""}FEEDMESOL.FUN  ·  `;
    band += `<text class="tM" x="${f1(40 - t * 110)}" y="1046" font-size="30" fill="${P.mustard}">${esc(msg.repeat(6))}</text>`;
  } else {
    band += `<g opacity="${seg(t, 10.4, 10.8).toFixed(3)}"><text class="tM" x="540" y="1050" text-anchor="middle" font-size="42" fill="${P.mustard}" letter-spacing="2">feedmesol.fun  ·  @feedmelana</text></g>`;
  }

  let sx = 0, sy = 0;
  const shake = (a, b, amp) => { if (t > a && t < b) { const k = amp * (1 - seg(t, a, b)); sx += Math.sin(t * 90) * k; sy += Math.cos(t * 77) * k; } };
  shake(1.5, 1.8, 10); shake(3.45, 3.95, 18);

  return `<rect width="1080" height="1080" fill="${P.gum}"/>
    <g transform="translate(${f1(sx)} ${f1(sy)})">${back}${mid}${g ? drawGob(g) : ""}${front}${overlay}</g>${band}`;
}

/* ---------------- rendering ---------------- */
var FONT_CSS = "";
async function loadFonts() {
  const css = await (await fetch("https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Bricolage+Grotesque:opsz,wght@12..96,800&family=JetBrains+Mono:wght@700&display=block")).text();
  const blocks = css.split("/* ").filter((b) => b.startsWith("latin */"));
  let out = "";
  for (const b of blocks) {
    const url = b.match(/url\((https:[^)]+)\)/)[1];
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    out += b.replace(/^latin \*\/\s*/, "").replace(url, "data:font/woff2;base64," + btoa(bin));
  }
  FONT_CSS = out;
}
const DEFS = `<defs>
  <radialGradient id="flash"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="${P.mustard}" stop-opacity=".9"/><stop offset="1" stop-color="${P.mustard}" stop-opacity="0"/></radialGradient>
  <filter id="wht" x="-30%" y="-30%" width="160%" height="160%">
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" result="w"/>
    <feGaussianBlur in="w" stdDeviation="16" result="b"/>
    <feFlood flood-color="${P.mustard}"/><feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="w"/></feMerge>
  </filter></defs>`;
const frameSVG = (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><style>${FONT_CSS}
  .tH{font-family:'Bagel Fat One',sans-serif} .tB{font-family:'Bricolage Grotesque',sans-serif;font-weight:800} .tM{font-family:'JetBrains Mono',monospace;font-weight:700}</style>${DEFS}${(MODE === "live" ? liveScene : scene)(t)}</svg>`;

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
async function draw(t, target = ctx, size = W) {
  const url = URL.createObjectURL(new Blob([frameSVG(t)], { type: "image/svg+xml" }));
  const img = new Image();
  img.src = url;
  await img.decode();
  target.drawImage(img, 0, 0, size, size);
  URL.revokeObjectURL(url);
}

/* ---------------- audio ---------------- */
function buildAudio() {
  const SR = 48000, ac = new OfflineAudioContext(2, Math.ceil(SR * DUR), SR);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
  const sfx = ac.createGain(); sfx.gain.value = 0.9; sfx.connect(comp);
  const music = ac.createGain(); music.connect(comp);
  // music level: in after the egg lands, ducked under the stamp and roar, out at the end
  const mg = music.gain;
  mg.setValueAtTime(0.0001, 0); mg.setValueAtTime(0.0001, MUSIC.start - 0.1); mg.exponentialRampToValueAtTime(0.5, MUSIC.start + 0.1);
  MUSIC.ducks.forEach(([a, b]) => { mg.setValueAtTime(0.5, a); mg.linearRampToValueAtTime(0.14, a + 0.05); mg.setValueAtTime(0.14, b - 0.2); mg.linearRampToValueAtTime(0.5, b); });
  mg.setValueAtTime(0.5, DUR - 2); mg.linearRampToValueAtTime(0.0001, DUR - 0.05);

  const noiseBuf = (() => { const b = ac.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const noise = (t, dur, out, { type = "bandpass", f = 1000, q = 1, peak = 0.5, attack = 0.003, f2 = null } = {}) => {
    const n = ac.createBufferSource(); n.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(fl).connect(g).connect(out); n.start(t, Math.random()); n.stop(t + dur + 0.05);
  };
  const tone = (t, type, f0, f1v, dur, peak, out, attack = 0.006) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1v, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  };

  /* music: 120 bpm, C – Am – F – G */
  const beat = 0.5, bar = 2;
  const roots = [65.41, 55.0, 43.65, 49.0];
  const arps = [[523.25, 659.25, 783.99, 659.25], [440, 523.25, 659.25, 523.25], [349.23, 440, 523.25, 440], [392, 493.88, 587.33, 493.88]];
  for (let t0 = MUSIC.start; t0 < DUR - 1.5; t0 += bar) {
    const c = Math.floor((t0 - MUSIC.start) / bar) % 4;
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * beat;
      tone(t, "sine", 150, 45, 0.28, 0.9, music, 0.002);                                            // kick
      if (b % 2 === 1) for (let k = 0; k < 3; k++) noise(t + k * 0.012, 0.14, music, { f: 1500, q: 0.8, peak: 0.28 }); // clap
      if (t >= MUSIC.hatsFrom) { noise(t + beat / 2, 0.05, music, { type: "highpass", f: 7000, peak: 0.12 }); noise(t, 0.03, music, { type: "highpass", f: 8000, peak: 0.06 }); }
      for (let e = 0; e < 2; e++) {                                                                   // bouncy bass
        const f = roots[c] * (e ? 2 : 1), o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
        o.type = "square"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 700;
        const tt = t + e * beat / 2; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.16, tt + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22);
        o.connect(lp).connect(g).connect(music); o.start(tt); o.stop(tt + 0.25);
      }
      if (t >= MUSIC.pluckFrom) for (let e = 0; e < 2; e++) tone(t + e * beat / 2, "triangle", arps[c][(b * 2 + e) % 4], arps[c][(b * 2 + e) % 4], 0.22, 0.07, music, 0.004); // pluck
    }
  }

  /* sound effects */
  const chew = (t, pitch = 1) => {
    tone(t, "sine", 230 * pitch, 85 * pitch, 0.13, 0.6, sfx);
    [0.03, 0.14, 0.25].forEach((dt, i) => noise(t + dt, 0.08, sfx, { f: (1500 + Math.random() * 1400) * pitch, q: 1.3, peak: 0.55 - i * 0.08 }));
    tone(t + 0.38, "sine", 170 * pitch, 460 * pitch, 0.1, 0.4, sfx);
  };
  const clink = (t) => { tone(t, "sine", 2100, 2050, 0.25, 0.18, sfx, 0.002); tone(t + 0.02, "sine", 2800, 2750, 0.2, 0.12, sfx, 0.002); };
  const pop = (t, f = 500) => tone(t, "sine", f, f * 2.2, 0.09, 0.35, sfx, 0.004);
  const whoosh = (t) => noise(t, 0.35, sfx, { f: 600, f2: 3500, q: 0.9, peak: 0.25, attack: 0.12 });
  const thud = (t, peak = 0.9) => { tone(t, "sine", 120, 38, 0.35, peak, sfx, 0.003); noise(t, 0.15, sfx, { type: "lowpass", f: 400, peak: 0.5 }); };
  const crack = (t) => [0, 0.07, 0.11].forEach((dt, i) => noise(t + dt, 0.07, sfx, { f: 3800 + i * 600, q: 1.3, peak: 0.4 }));
  const charge = (t, dur) => {
    const o = ac.createOscillator(), v = ac.createOscillator(), va = ac.createGain(), g = ac.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1400, t + dur);
    v.frequency.setValueAtTime(6, t); v.frequency.linearRampToValueAtTime(22, t + dur); va.gain.value = 18; v.connect(va).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g).connect(sfx); o.start(t); v.start(t); o.stop(t + dur + 0.1); v.stop(t + dur + 0.1);
  };
  const sparkle = (t) => {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => { tone(t + i * 0.055, "square", f, f * 1.01, 0.22, 0.08, sfx); tone(t + i * 0.055, "sine", f * 2, f * 2, 0.3, 0.06, sfx); });
    noise(t, 0.5, sfx, { type: "highpass", f: 1500, f2: 7000, peak: 0.18, attack: 0.02 });
  };
  const roar = (t) => {
    const D = 1.7, shaper = ac.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = (41 * x) / (1 + 40 * Math.abs(x)); }
    shaper.curve = curve;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 5;
    lp.frequency.setValueAtTime(250, t); lp.frequency.exponentialRampToValueAtTime(1800, t + 0.3); lp.frequency.exponentialRampToValueAtTime(380, t + D);
    const growl = ac.createGain(); growl.gain.value = 0.6;
    const lfo = ac.createOscillator(), la = ac.createGain(); lfo.frequency.value = 27; la.gain.value = 0.4; lfo.connect(la).connect(growl.gain);
    const m = ac.createGain(); m.gain.setValueAtTime(0.0001, t); m.gain.exponentialRampToValueAtTime(1, t + 0.14); m.gain.setValueAtTime(1, t + D * 0.55); m.gain.exponentialRampToValueAtTime(0.0001, t + D);
    shaper.connect(lp).connect(growl).connect(m).connect(sfx);
    [[62, "sawtooth"], [65.5, "sawtooth"], [93, "square"]].forEach(([f, type]) => {
      const o = ac.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f * 0.8, t); o.frequency.exponentialRampToValueAtTime(f * 1.45, t + 0.28); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + D);
      const g = ac.createGain(); g.gain.value = 0.32; o.connect(g).connect(shaper); o.start(t); o.stop(t + D + 0.05);
    });
    noise(t, D, m, { f: 700, q: 0.7, peak: 0.5, attack: 0.1 });
    tone(t, "sine", 48, 34, D, 0.6, m, 0.05);
    lfo.start(t); lfo.stop(t + D);
  };
  const crackle = (t, dur) => { for (let x = t; x < t + dur; x += 0.03 + Math.random() * 0.07) noise(x, 0.03, sfx, { f: 2000 + Math.random() * 3000, q: 2, peak: 0.15 + Math.random() * 0.2 }); noise(t, dur, sfx, { type: "lowpass", f: 500, peak: 0.12, attack: 0.3 }); };
  const stamp = (t) => { thud(t, 1); noise(t, 0.25, sfx, { f: 900, q: 0.6, peak: 0.6 }); };

  if (MODE === "intro") {
    // fall whistle, landing, egg cracks, hatching
    tone(0.05, "sine", 1500, 300, 0.85, 0.12, sfx, 0.05);
    thud(0.9);
    crack(1.6); crack(2.05);
    charge(2.1, FLICK_LEN); sparkle(evoEnd(2.1));
    pop(3.7, 420); pop(4.1, 520);
    whoosh(5.15); pop(5.3, 400); pop(5.55, 500); pop(5.8, 300); pop(6.2, 340);
    clink(6.4); clink(6.85); clink(7.3);
    whoosh(9.15); pop(9.3, 400); pop(9.55, 480);
    clink(10.7); clink(10.85); clink(11.0);
    stamp(11.3);
    pop(12.15, 420); pop(12.4, 520);
    chew(13.0, 1.4);
    whoosh(13.95); pop(14.1, 380);
    [14.5, 17.3, 20.1, 23.2].forEach((t) => pop(t, 450));
    clink(15.25); clink(15.65); clink(16.05);
    pop(17.6, 300); clink(18.7);
    chew(21.3, 1.3);
    charge(22.0, FLICK_LEN); sparkle(evoEnd(22.0));
    pop(23.45, 350); whoosh(24.1); crackle(23.5, 2.2);
    whoosh(25.95); pop(26.1, 400); pop(26.35, 500);
    charge(27.0, FLICK_LEN); sparkle(evoEnd(27.0));
    charge(29.3, FLICK_LEN); sparkle(evoEnd(29.3));
    roar(30.9);
    whoosh(32.95); pop(33.1, 380); pop(33.35, 460); pop(34.4, 300);
    whoosh(35.95); thud(36.15, 0.7); pop(36.5, 500); pop(36.8, 600);
    chew(37.2, 1.15);
  } else {
    // countdown, drop, hatch, slam, then a steady coin rain Gob keeps chomping
    [0.1, 0.6, 1.1].forEach((t) => tone(t, "sine", 880, 880, 0.16, 0.35, sfx, 0.004));
    tone(1.5, "sine", 1500, 300, 0.3, 0.1, sfx, 0.02);
    thud(1.5); crack(1.6);
    charge(1.7, FLICK_LEN); sparkle(evoEnd(1.7));
    whoosh(2.95); pop(3.0, 420); stamp(3.25);
    pop(4.3, 500); pop(5.0, 380);
    [6.3, 6.5, 6.7].forEach((t, i) => pop(t, 450 + i * 90));
    for (let t = 3.4; t < DUR - 1; t += 0.22 + Math.random() * 0.2) tone(t, "sine", 2100 + Math.random() * 500, 2000, 0.15, 0.05, sfx, 0.002);
    LIVE_CHOMPS.forEach((t) => chew(t, 1.15));
    sparkle(10.6);
  }
  return ac.startRendering();
}

/* ---------------- entry points (called from render.mjs) ---------------- */
window.stills = async (times) => {
  await loadFonts();
  const cols = 4, rows = Math.ceil(times.length / cols), sz = 360;
  const sheet = document.createElement("canvas"); sheet.width = cols * sz; sheet.height = rows * (sz + 30);
  const sc = sheet.getContext("2d"); sc.fillStyle = "#fff"; sc.fillRect(0, 0, sheet.width, sheet.height);
  for (let i = 0; i < times.length; i++) {
    const c = document.createElement("canvas"); c.width = c.height = sz;
    await draw(times[i], c.getContext("2d"), sz);
    sc.drawImage(c, (i % cols) * sz, Math.floor(i / cols) * (sz + 30));
    sc.fillStyle = "#000"; sc.font = "20px monospace"; sc.fillText(`t=${times[i]}s`, (i % cols) * sz + 8, Math.floor(i / cols) * (sz + 30) + sz + 22);
  }
  return sheet.toDataURL("image/png");
};

window.renderVideo = async () => {
  window.__progress = 0;
  await loadFonts();
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: "avc", width: W, height: W, frameRate: FPS },
    audio: { codec: "aac", sampleRate: 48000, numberOfChannels: 2 },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { window.__error = String(e); } });
  venc.configure({ codec: "avc1.640028", width: W, height: W, bitrate: 10_000_000, framerate: FPS, avc: { format: "avc" } });
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { window.__error = String(e); } });
  aenc.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 192_000 });

  const audio = await buildAudio();
  const L = audio.getChannelData(0), R = audio.getChannelData(1), CH = 1024;
  for (let i = 0; i < audio.length; i += CH) {
    const n = Math.min(CH, audio.length - i), data = new Float32Array(n * 2);
    data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
    const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data });
    aenc.encode(ad); ad.close();
  }
  await aenc.flush();

  const N = Math.round(DUR * FPS);
  for (let f = 0; f < N; f++) {
    await draw(f / FPS);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: f % 60 === 0 });
    vf.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
    window.__progress = f / N;
  }
  await venc.flush();
  muxer.finalize();
  window.__mp4 = new Uint8Array(muxer.target.buffer);
  window.__progress = 1;
  return window.__mp4.length;
};
window.mp4Slice = (a, b) => {
  const s = window.__mp4.subarray(a, b);
  let bin = "";
  for (let i = 0; i < s.length; i += 0x8000) bin += String.fromCharCode.apply(null, s.subarray(i, i + 0x8000));
  return btoa(bin);
};

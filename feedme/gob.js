/* Gob, the $FEEDME monster: 5 evolution forms drawn as SVG. Shared by the site and the asset renderer. */
const C = { body: "#FF5A36", shade: "#DE3C1C", belly: "#FFB49C", ink: "#2B0A2E", paper: "#FFF6F9", gullet: "#5A0F2E", tongue: "#FF8FB1", horn: "#FFC53D" };
const S = `stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const r1 = (n) => Math.round(n * 10) / 10;

function eye(cx, cy, r) {
  return `<g class="eye"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.paper}" ${S}/>
    <g class="pupil" data-cx="${cx}" data-cy="${cy}" data-r="${r1(r * 0.4)}">
      <circle cx="${cx}" cy="${cy}" r="${r1(r * 0.46)}" fill="${C.ink}"/>
      <circle cx="${r1(cx - r * 0.16)}" cy="${r1(cy - r * 0.18)}" r="${r1(r * 0.15)}" fill="${C.paper}"/>
    </g></g>`;
}
function glowEye(cx, cy, r) {
  return `<g class="eye"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.horn}"/>
    <g class="pupil" data-cx="${cx}" data-cy="${cy}" data-r="${r1(r * 0.35)}"><circle cx="${cx}" cy="${cy}" r="${r1(r * 0.45)}" fill="${C.ink}"/></g></g>`;
}
// body filled with shade, lit ellipse offset up-left: gives a cel-shaded crescent on the lower right
function body(id, d, cx, cy, rx, ry, inner = "") {
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>
    <g clip-path="url(#${id})">
      <rect width="400" height="400" fill="${C.shade}"/>
      <ellipse cx="${cx - 14}" cy="${cy - 14}" rx="${rx - 6}" ry="${ry - 4}" fill="${C.body}"/>
      ${inner}
      <path d="M${r1(cx - rx * .66)} ${r1(cy - ry * .18)} C${r1(cx - rx * .64)} ${r1(cy - ry * .56)} ${r1(cx - rx * .4)} ${r1(cy - ry * .8)} ${r1(cx - rx * .12)} ${r1(cy - ry * .86)}" fill="none" stroke="${C.paper}" stroke-width="10" stroke-linecap="round" opacity=".5"/>
    </g>
    <path d="${d}" fill="none" ${S}/>`;
}
// a row of teeth hugging the top or bottom edge of an elliptical mouth
function teeth(cx, cy, rx, ry, n, size, top) {
  const span = rx * 1.55, w = span / n;
  const edge = (x) => { const t = (x - cx) / rx; const dy = ry * Math.sqrt(Math.max(0, 1 - t * t)); return top ? cy - dy : cy + dy; };
  let d = "";
  for (let i = 0; i < n; i++) {
    const x0 = cx - span / 2 + i * w, x1 = x0 + w, xm = x0 + w / 2;
    const out = top ? -6 : 6;
    d += `M${r1(x0)} ${r1(edge(x0) + out)} L${r1(xm)} ${r1(edge(xm) + (top ? size : -size))} L${r1(x1)} ${r1(edge(x1) + out)}Z `;
  }
  return `<path d="${d}" fill="${C.paper}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`;
}
function mouth(id, cx, cy, rx, ry, inner) {
  return `<g class="m"><clipPath id="${id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.gullet}"/>
    <g clip-path="url(#${id})">${inner}</g>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${S}/></g>`;
}
// spikes poking out of an ellipse at given angles (degrees, -90 = top)
function spikes(cx, cy, rx, ry, angles, len, half) {
  return `<g fill="${C.horn}" ${S}>` + angles.map((a) => {
    const t = a * Math.PI / 180, px = cx + rx * Math.cos(t), py = cy + ry * Math.sin(t);
    let nx = Math.cos(t) / rx, ny = Math.sin(t) / ry; const L = Math.hypot(nx, ny); nx /= L; ny /= L;
    const tx = -ny, ty = nx, bx = px - nx * 14, by = py - ny * 14;
    return `<path d="M${r1(bx + tx * half)} ${r1(by + ty * half)} L${r1(px + nx * len)} ${r1(py + ny * len)} L${r1(bx - tx * half)} ${r1(by - ty * half)}Z"/>`;
  }).join("") + `</g>`;
}
const cheeks = (a, b, y) => `<ellipse cx="${a}" cy="${y}" rx="17" ry="9" fill="${C.tongue}" opacity=".9"/><ellipse cx="${b}" cy="${y}" rx="17" ry="9" fill="${C.tongue}" opacity=".9"/>`;

const FORMS = [
  // 0 · Egg: something peeks out of the crack
  (u) => {
    const EGG = "M200 86 C270 86 318 196 314 268 C310 334 262 368 200 368 C138 368 90 334 86 268 C82 196 130 86 200 86Z";
    const GAP = "M76 250 L118 228 L140 250 L166 222 L190 248 L212 220 L236 246 L260 222 L284 248 L324 224 L324 256 L284 272 L260 248 L236 270 L212 246 L190 272 L166 248 L140 274 L118 254 L76 278Z";
    const dots = [[150,150,10],[248,172,13],[124,312,11],[272,318,9],[212,118,7],[292,286,8],[172,340,7],[112,196,6]];
    return `<clipPath id="${u}e"><path d="${EGG}"/></clipPath>
      <g clip-path="url(#${u}e)">
        <rect width="400" height="400" fill="#F2CEDC"/>
        <ellipse cx="186" cy="214" rx="112" ry="142" fill="${C.paper}"/>
        ${dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.body}" opacity=".85"/>`).join("")}
        <g class="m"><path d="${GAP}" fill="${C.ink}"/>${glowEye(170, 239, 8)}${glowEye(230, 252, 8)}</g>
      </g>
      <path d="${EGG}" fill="none" ${S}/>
      <path d="M122 124 C134 104 150 94 168 90" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".8"/>`;
  },
  // 1 · Hatchling: shell hat, tiny tooth
  (u) => {
    const B = "M200 176 C264 176 300 226 298 282 C296 338 256 366 200 366 C144 366 104 338 102 282 C100 226 136 176 200 176Z";
    const HAT = "M108 250 C104 196 146 150 200 150 C254 150 296 196 292 250 L274 236 L258 256 L240 234 L220 256 L200 232 L180 256 L160 234 L142 256 L126 236 Z";
    return `<ellipse cx="160" cy="362" rx="26" ry="12" fill="${C.body}" ${S}/><ellipse cx="240" cy="362" rx="26" ry="12" fill="${C.body}" ${S}/>
      <ellipse cx="98" cy="300" rx="15" ry="25" transform="rotate(35 98 300)" fill="${C.body}" ${S}/>
      <ellipse cx="302" cy="300" rx="15" ry="25" transform="rotate(-35 302 300)" fill="${C.body}" ${S}/>
      ${body(u + "b", B, 200, 271, 98, 95)}
      ${cheeks(134, 266, 318)}
      ${eye(166, 290, 25)}${eye(236, 290, 25)}
      ${mouth(u + "m", 200, 338, 20, 13, `<ellipse cx="200" cy="350" rx="14" ry="8" fill="${C.tongue}"/><path d="M192 322 L198 334 L204 322Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`)}
      <g class="hat" transform="rotate(-8 200 210)"><path d="${HAT}" fill="${C.paper}" ${S}/>
        <circle cx="160" cy="196" r="8" fill="${C.body}" opacity=".85"/><circle cx="230" cy="180" r="10" fill="${C.body}" opacity=".85"/><circle cx="264" cy="222" r="6" fill="${C.body}" opacity=".85"/></g>`;
  },
  // 2 · Chonk: horns, big toothy mouth, drool
  (u) => {
    const B = "M200 104 C278 102 322 168 326 240 C332 322 284 368 200 368 C116 368 68 322 74 240 C78 168 122 106 200 104Z";
    return `<path d="M142 138 C122 106 126 70 150 50 C152 82 164 104 186 120Z" fill="${C.horn}" ${S}/>
      <path d="M258 138 C278 106 274 70 250 50 C248 82 236 104 214 120Z" fill="${C.horn}" ${S}/>
      <ellipse cx="148" cy="366" rx="36" ry="15" fill="${C.body}" ${S}/><ellipse cx="254" cy="366" rx="36" ry="15" fill="${C.body}" ${S}/>
      ${body(u + "b", B, 200, 236, 126, 132, `<ellipse cx="200" cy="334" rx="78" ry="46" fill="${C.belly}"/>`)}
      <path d="M86 236 C54 236 42 272 58 290 C72 304 94 292 98 274" fill="${C.body}" ${S}/>
      <path d="M314 236 C346 236 358 272 342 290 C328 304 306 292 302 274" fill="${C.body}" ${S}/>
      ${cheeks(110, 292, 226)}
      ${eye(158, 164, 28)}${eye(244, 158, 32)}
      <path d="M124 124 L186 140" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/><path d="M212 132 L280 114" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/>
      ${mouth(u + "m", 200, 254, 80, 50, `<ellipse cx="200" cy="296" rx="52" ry="26" fill="${C.tongue}"/><path d="M200 278 L200 300" stroke="#E0607F" stroke-width="4" stroke-linecap="round"/>${teeth(200, 254, 80, 50, 5, 22, true)}${teeth(200, 254, 80, 50, 3, 16, false)}`)}
      <path class="drool" d="M262 296 C264 314 260 326 254 328 C248 326 248 316 254 304Z" fill="#BFE8FF" stroke="${C.ink}" stroke-width="3"/>`;
  },
  // 3 · Absolute Unit: tusks, bib, fork and knife
  (u) => {
    const B = "M200 88 C302 86 358 150 360 234 C362 324 302 370 200 370 C98 370 38 324 40 234 C42 150 98 90 200 88Z";
    return `<path d="M106 152 C80 120 80 82 102 58 C106 94 120 120 142 134Z" fill="${C.horn}" ${S}/>
      <path d="M180 96 C176 60 190 34 214 22 C206 52 214 76 228 94Z" fill="${C.horn}" ${S}/>
      <path d="M294 152 C320 120 320 82 298 58 C294 94 280 120 258 134Z" fill="${C.horn}" ${S}/>
      <ellipse cx="138" cy="368" rx="42" ry="16" fill="${C.body}" ${S}/><ellipse cx="262" cy="368" rx="42" ry="16" fill="${C.body}" ${S}/>
      <rect x="25" y="160" width="10" height="118" rx="4" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/>
      <path d="M16 170 L16 136 M30 170 L30 130 M44 170 L44 136 M14 170 Q30 184 46 170" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M366 278 L366 150 C388 172 392 222 378 248 L378 278Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
      ${body(u + "b", B, 200, 230, 158, 140)}
      ${cheeks(84, 316, 206)}
      ${eye(150, 142, 22)}${eye(250, 142, 22)}
      <path d="M114 110 L180 128" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/><path d="M220 128 L286 110" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/>
      ${mouth(u + "m", 200, 222, 116, 56, `<ellipse cx="200" cy="264" rx="72" ry="26" fill="${C.tongue}"/>${teeth(200, 222, 116, 56, 8, 18, true)}`)}
      <path d="M132 262 C120 232 124 200 138 184 C144 212 152 236 158 256Z" fill="${C.paper}" ${S}/>
      <path d="M268 262 C280 232 276 200 262 184 C256 212 248 236 242 256Z" fill="${C.paper}" ${S}/>
      <path d="M132 290 C112 282 98 270 90 252 M268 290 C288 282 302 270 310 252" fill="none" stroke="${C.ink}" stroke-width="4"/>
      <path d="M128 286 L272 286 L258 354 C232 364 168 364 142 354Z" fill="${C.paper}" ${S}/>
      <text x="200" y="332" text-anchor="middle" font-family="Bagel Fat One, Arial Rounded MT Bold, sans-serif" font-size="30" fill="${C.body}" stroke="${C.ink}" stroke-width="1.5">FEED ME</text>
      <path d="M52 236 C20 236 10 278 30 294 C46 306 66 294 70 278" fill="${C.body}" ${S}/>
      <path d="M348 236 C380 236 390 278 370 294 C354 306 334 294 330 278" fill="${C.body}" ${S}/>`;
  },
  // 4 · Kaiju: dorsal spikes, tail, three eyes, charging mouth
  (u) => {
    const B = "M200 66 C308 62 368 142 366 238 C364 330 302 374 200 374 C98 374 34 330 34 238 C32 142 92 70 200 66Z";
    return `<defs><radialGradient id="${u}g"><stop offset="0" stop-color="#FFF6C8"/><stop offset=".45" stop-color="${C.horn}"/><stop offset="1" stop-color="${C.horn}" stop-opacity="0"/></radialGradient></defs>
      <g class="steam" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"><circle cx="92" cy="54" r="12"/><circle cx="308" cy="50" r="14"/><circle cx="200" cy="18" r="10"/></g>
      <g class="tail"><path d="M290 324 C352 336 392 298 386 240 C402 262 408 336 356 364 C326 380 296 370 286 356Z" fill="${C.body}" ${S}/>
        ${spikes(360, 300, 34, 50, [-60, -20, 20], 20, 9)}</g>
      ${spikes(200, 226, 166, 150, [-160, -140, -122, -58, -40, -20], 40, 16)}
      <path d="M124 118 C94 90 92 46 118 18 C122 56 138 84 164 98Z" fill="${C.horn}" ${S}/>
      <path d="M276 118 C306 90 308 46 282 18 C278 56 262 84 236 98Z" fill="${C.horn}" ${S}/>
      <ellipse cx="134" cy="372" rx="46" ry="17" fill="${C.body}" ${S}/><ellipse cx="266" cy="372" rx="46" ry="17" fill="${C.body}" ${S}/>
      <g fill="${C.paper}" stroke="${C.ink}" stroke-width="3"><circle cx="102" cy="382" r="6"/><circle cx="118" cy="386" r="6"/><circle cx="282" cy="386" r="6"/><circle cx="298" cy="382" r="6"/></g>
      ${body(u + "b", B, 200, 226, 166, 150, `<ellipse cx="200" cy="356" rx="104" ry="62" fill="${C.belly}"/><path d="M118 330 Q200 344 282 330 M110 358 Q200 374 290 358" fill="none" stroke="#E98E74" stroke-width="5" stroke-linecap="round"/>`)}
      <path d="M72 226 C44 218 28 242 38 262 C44 274 60 270 66 260 M44 262 L36 276 M54 266 L50 280" fill="${C.body}" ${S}/>
      <path d="M328 226 C356 218 372 242 362 262 C356 274 340 270 334 260 M356 262 L364 276 M346 266 L350 280" fill="${C.body}" ${S}/>
      ${eye(128, 146, 20)}${eye(272, 146, 20)}${eye(200, 112, 30)}
      <path d="M164 72 L200 86 L236 72" fill="none" stroke="${C.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M98 118 L150 130 M250 130 L302 118" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/>
      ${mouth(u + "m", 200, 248, 124, 70, `<circle class="charge" cx="200" cy="262" r="66" fill="url(#${u}g)"/>${teeth(200, 248, 124, 70, 9, 24, true)}${teeth(200, 248, 124, 70, 7, 20, false)}`)}
      <path d="M40 396 L76 388 L92 398 M324 398 L346 388 L372 396" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
];
const SHADOW_RX = [96, 92, 132, 160, 176];


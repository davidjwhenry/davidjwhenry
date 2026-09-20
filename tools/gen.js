const fs = require('fs');
const path = require('path');
const { display, mono, monoMicro, MARK, MARK_W, MARK_H, DOT, THEMES, EYEBROW, NAME } = require('./lib');

const OUT = process.argv[2] || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const n = (v) => Number(v.toFixed(2));
const px = (v) => n(Math.round(v) + 0.5); // hairlines land on the half-pixel

// One-shot reveal. A looping banner is noise; this settles and stays settled.
const BASE_CSS = `
    /* Base state is the FINISHED artwork; the keyframes animate in from hidden.
       Any renderer that ignores CSS animations still shows the final image. */
    .fade { animation: fade .6s cubic-bezier(.2,.7,.3,1) both; }
    .rise { animation: rise .75s cubic-bezier(.2,.7,.3,1) both; }
    .draw { stroke-dasharray: 1; stroke-dashoffset: 0; animation: draw .9s cubic-bezier(.35,.8,.3,1) both; }
    .pop  { transform-box: fill-box; transform-origin: center;
            animation: pop .7s cubic-bezier(.25,1.3,.4,1) both; }
    @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
    @keyframes draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
    @keyframes pop  { from { opacity: 0; transform: scale(.2) } to { opacity: 1; transform: scale(1) } }
    @media (prefers-reduced-motion: reduce) {
      .fade, .rise, .draw, .pop { animation: none !important; }
    }`;

// STATIC=1 emits the settled artwork with no animation at all.
const STATIC = process.env.STATIC === '1';
const guard = (out) => {
  // A NaN in any path silently truncates the rest of that path in every SVG
  // renderer. Fail the build instead of shipping a half-drawn banner.
  if (out.includes('NaN')) throw new Error('NaN found in generated SVG');
  return out;
};
const settle = (out) => guard(STATIC
  ? out.replace(/ class="(?:fade|rise|draw|pop)"/g, '')
       .replace(/ style="animation-delay:[^"]*"/g, '')
  : out);

const svg = (w, h, t, body) => settle(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="David Henry — AI-native CPO and digital venture builder">
  <title>David Henry — AI-native CPO &amp; digital venture builder</title>
  <style>${BASE_CSS}
  </style>
  <rect width="${w}" height="${h}" fill="${t.bg}"/>
${body}
</svg>
`);

function textColumn(t, x, o = {}) {
  const eb = mono(EYEBROW, o.eyebrowSize ?? 13, x, o.eyebrowY ?? 150);
  const nm = display(NAME, o.nameSize ?? 76, x, o.nameY ?? 224);
  const ry = px(o.ruleY ?? 252);
  return `  <g>
    <path class="fade" style="animation-delay:.05s" d="${eb.d}" fill="${t.meta}"/>
    <path class="rise" style="animation-delay:.18s" d="${nm.d}" fill="${t.ink}"/>
    <line class="draw" style="animation-delay:.45s" x1="${x}" y1="${ry}" x2="${n(x + nm.width)}" y2="${ry}" stroke="${t.ink}" stroke-width="1" pathLength="1"/>
  </g>`;
}

/* ── A · CONSTRUCTION ───────────────────────────────────────────────────────
   The geometry that generates the mark, drawn in hairline and overprinted
   across the solid form so it stays readable where it crosses the ink.      */
function construction(t) {
  const W = 1200, H = 400;
  const S = 2.4, MX = 760, MY = 61;
  const fx = (v) => MX + v * S;
  const fy = (v) => MY + v * S;
  const LEFT = 660, LABEL_X = 700;

  const cx = fx(41), cy = fy(74), r1 = 41 * S, r2 = 21 * S;
  const dx = fx(DOT.cx), dy = fy(DOT.cy), dr = DOT.r * S;
  const rxe = cx - r1 * Math.SQRT1_2, rye = cy - r1 * Math.SQRT1_2;

  // Build the geometry once, emit it twice: under the mark in hairline grey,
  // and over it in the ground colour so the lines read across the ink too.
  const geo = [];
  let i = 0;
  const d = () => (0.15 + i++ * 0.035).toFixed(2);
  [0, 57, 82, 87, 114, 137].forEach((v) =>
    geo.push({ tag: 'line', a: { x1: px(fx(v)), y1: 0, x2: px(fx(v)), y2: H }, d: d() }));
  [0, 33, 35, 53, 74, 95, 111, 115].forEach((v) =>
    geo.push({ tag: 'line', a: { x1: LEFT, y1: px(fy(v)), x2: W, y2: px(fy(v)) }, d: d() }));
  geo.push({ tag: 'circle', a: { cx: n(cx), cy: n(cy), r: n(r1) }, d: '0.42' });
  geo.push({ tag: 'circle', a: { cx: n(cx), cy: n(cy), r: n(r2) }, d: '0.48' });
  geo.push({ tag: 'circle', a: { cx: n(dx), cy: n(dy), r: n(dr) }, d: '0.54' });
  geo.push({ tag: 'line', a: { x1: n(cx), y1: n(cy), x2: n(rxe), y2: n(rye) }, d: '0.58' });
  geo.push({ tag: 'line', a: { x1: n(rxe), y1: px(rye), x2: LABEL_X, y2: px(rye) }, d: '0.62' });

  const emit = (stroke, extra) => geo.map((g) => {
    const attrs = Object.entries(g.a).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `    <${g.tag} class="draw" style="animation-delay:${g.d}s" ${attrs} fill="none" stroke="${stroke}" stroke-width="1" pathLength="1"${extra}/>`;
  }).join('\n');

  const cross = [[cx - 7, cy, cx + 7, cy], [cx, cy - 7, cx, cy + 7]].map(([a, b, c, e]) =>
    `    <line class="draw" style="animation-delay:.6s" x1="${n(a)}" y1="${n(b)}" x2="${n(c)}" y2="${n(e)}" stroke="${t.bg}" stroke-width="1" opacity=".55" pathLength="1"/>`).join('\n');

  // Dimension lines: 138 across the bottom, 116 up the right.
  const dimY = px(fy(115) + 26), dimX = px(fx(137) + 30);
  const tick = (x1, y1, x2, y2) =>
    `    <line class="draw" style="animation-delay:.7s" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${t.micro}" stroke-width="1" pathLength="1"/>`;
  const dims = [
    tick(n(fx(0)), dimY, n(fx(137)), dimY),
    tick(px(fx(0)), dimY - 5, px(fx(0)), dimY + 5),
    tick(px(fx(137)), dimY - 5, px(fx(137)), dimY + 5),
    tick(dimX, n(fy(0)), dimX, n(fy(115))),
    tick(dimX - 5, px(fy(0)), dimX + 5, px(fy(0))),
    tick(dimX - 5, px(fy(115)), dimX + 5, px(fy(115))),
  ].join('\n');

  const wDim = monoMicro('138', 11, 0, 0);
  const hDim = monoMicro('116', 11, 0, 0);
  const annos = [
    `    <path class="fade" style="animation-delay:.95s" d="${monoMicro('138', 11, n(fx(68.5) - wDim.width / 2), dimY + 18).d}" fill="${t.micro}"/>`,
    `    <g class="fade" style="animation-delay:.95s" transform="translate(${dimX + 17} ${n(fy(57.5) + hDim.width / 2)}) rotate(-90)"><path d="${hDim.d}" fill="${t.micro}"/></g>`,
    `    <path class="fade" style="animation-delay:.9s" d="${monoMicro('R 41', 11, LABEL_X, n(rye) - 9).d}" fill="${t.micro}"/>`,
    `    <path class="fade" style="animation-delay:.85s" d="${monoMicro('DH MARK · CONSTRUCTION', 11, n(fx(0)), 44).d}" fill="${t.micro}"/>`,
  ].join('\n');

  const body = `${textColumn(t, 80)}
  <g>
${emit(t.hairline, '')}
${dims}
${annos}
    <g transform="translate(${MX} ${MY}) scale(${S})">
      <path class="fade" style="animation-delay:1.05s" fill-rule="evenodd" d="${MARK}" fill="${t.ink}"/>
    </g>
${emit(t.bg, ' opacity=".32"')}
${cross}
    <line class="draw" style="animation-delay:1.55s" x1="${n(dx - dr)}" y1="${px(dy)}" x2="${LABEL_X - 6}" y2="${px(dy)}" stroke="${t.mint}" stroke-width="1" pathLength="1"/>
    <path class="fade" style="animation-delay:1.7s" d="${monoMicro('#00F2DC', 11, LABEL_X - 6, n(dy) - 9).d}" fill="${t.mint}"/>
    <circle class="pop" style="animation-delay:1.45s" cx="${n(dx)}" cy="${n(dy)}" r="${n(dr)}" fill="${t.mint}"/>
  </g>`;
  return svg(W, H, t, body);
}

/* ── B · GHOST AT SCALE ─────────────────────────────────────────────────────
   The mark blown past the frame in near-invisible grey; only its mint dot
   holds full strength.                                                      */
function ghost(t) {
  const W = 1200, H = 400;
  const S = 4.6;
  const MX = W - MARK_W * S + 46;
  const MY = H / 2 - (MARK_H / 2) * S;
  const dx = MX + DOT.cx * S, dy = MY + DOT.cy * S, dr = DOT.r * S;

  // Display type at the 88px end of the design.md scale: the composition is
  // sparse enough to carry it, and GitHub scales the 1200px canvas down to ~880.
  const body = `  <g>
    <g transform="translate(${n(MX)} ${n(MY)}) scale(${S})">
      <path class="fade" style="animation-delay:.1s;animation-duration:1.1s" fill-rule="evenodd" d="${MARK}" fill="${t.ghost}"/>
    </g>
    <circle class="pop" style="animation-delay:.85s" cx="${n(dx)}" cy="${n(dy)}" r="${n(dr)}" fill="${t.mint}"/>
  </g>
${textColumn(t, 80, { eyebrowSize: 15, eyebrowY: 146, nameSize: 88, nameY: 228, ruleY: 258 })}`;
  return svg(W, H, t, body);
}

/* ── C · SPECIMEN SHEET ─────────────────────────────────────────────────────
   The mark taken apart. Every cell shares one transform, so each part sits
   where it actually lives in the mark — an exploded view, not four drawings. */
function specimen(t) {
  const W = 1200, H = 440;
  const X = 80, GAP = 24, COLS = 4;
  const CW = (W - X * 2 - GAP * (COLS - 1)) / COLS;
  const CH = 150, CY = 230, S = 0.862;

  const subs = MARK.split(/(?=M)/).filter(Boolean); // [d outer, d counter, h]
  const parts = [
    { d: subs[0] + subs[1], cap: 'STEM + BOWL', idx: '01' },
    { d: subs[2], cap: 'SHOULDER', idx: '02' },
    { d: null, cap: 'MINT-500 · Ø 23', idx: '03', dot: true },
    { d: MARK, cap: 'DH', idx: '04', dot: true },
  ];

  const ty = CY + CH / 2 - (MARK_H / 2) * S;
  const cells = parts.map((p, k) => {
    const x = X + k * (CW + GAP);
    const tx = x + CW / 2 - (MARK_W / 2) * S; // identical framing in every cell
    const d0 = 0.5 + k * 0.13;
    const shape = p.d
      ? `      <path class="fade" style="animation-delay:${(d0 + 0.12).toFixed(2)}s" fill-rule="evenodd" d="${p.d}" fill="${t.ink}"/>`
      : '';
    const dot = p.dot
      ? `    <circle class="pop" style="animation-delay:${(d0 + (p.d ? 0.34 : 0.22)).toFixed(2)}s" cx="${n(tx + DOT.cx * S)}" cy="${n(ty + DOT.cy * S)}" r="${n(DOT.r * S)}" fill="${t.mint}"/>`
      : '';
    return `    <rect class="fade" style="animation-delay:${d0.toFixed(2)}s" x="${px(x)}" y="${px(CY)}" width="${n(CW)}" height="${CH}" fill="none" stroke="${t.hairline}" stroke-width="1"/>
    <path class="fade" style="animation-delay:${(d0 + 0.06).toFixed(2)}s" d="${monoMicro(p.idx, 11, x + 12, CY + 22).d}" fill="${t.micro}"/>
    <g transform="translate(${n(tx)} ${n(ty)}) scale(${S})">
${shape}
    </g>
${dot}
    <path class="fade" style="animation-delay:${(d0 + 0.18).toFixed(2)}s" d="${monoMicro(p.cap, 11, x, CY + CH + 22).d}" fill="${t.micro}"/>`;
  }).join('\n');

  const furn = monoMicro('138 × 116', 11, 0, 0);
  const body = `${textColumn(t, X, { eyebrowY: 86, nameY: 160, ruleY: 188 })}
  <path class="fade" style="animation-delay:.3s" d="${monoMicro('138 × 116', 11, n(W - X - furn.width), 86).d}" fill="${t.micro}"/>
  <g>
${cells}
  </g>`;
  return svg(W, H, t, body);
}

for (const [name, fn] of Object.entries({ construction, ghost, specimen })) {
  for (const t of Object.values(THEMES)) {
    const file = path.join(OUT, `hero-${name}-${t.name}.svg`);
    fs.writeFileSync(file, fn(t));
    console.log(`${path.basename(file)}  ${fs.statSync(file).size} bytes`);
  }
}

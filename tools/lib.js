const opentype = require('opentype.js');
const path = require('path');
const fs = require('fs');

const load = (f) => opentype.parse(fs.readFileSync(path.join(__dirname, 'fonts', f)).buffer.slice(0));

const FONTS = {
  display: load('Inter-ExtraBold.ttf'),
  mono: load('DMMono-Medium.ttf'),
};

// Text -> path data. Glyphs are laid out at the origin and the offset is
// applied during our own serialisation: opentype.js's toPathData() has a
// rounding bug that emits a NaN mid-path once coordinates get large, which
// silently truncates the rest of the glyph run in every SVG renderer.
const f2 = (v) => {
  const r = Math.round(v * 100) / 100;
  if (!Number.isFinite(r)) throw new Error(`non-finite path coordinate: ${v}`);
  return String(r);
};

function serialise(commands, dx, dy) {
  return commands.map((c) => {
    switch (c.type) {
      case 'M': return `M${f2(c.x + dx)} ${f2(c.y + dy)}`;
      case 'L': return `L${f2(c.x + dx)} ${f2(c.y + dy)}`;
      case 'C': return `C${f2(c.x1 + dx)} ${f2(c.y1 + dy)} ${f2(c.x2 + dx)} ${f2(c.y2 + dy)} ${f2(c.x + dx)} ${f2(c.y + dy)}`;
      case 'Q': return `Q${f2(c.x1 + dx)} ${f2(c.y1 + dy)} ${f2(c.x + dx)} ${f2(c.y + dy)}`;
      case 'Z': return 'Z';
      default: throw new Error(`unexpected path command ${c.type}`);
    }
  }).join('');
}

function text(font, str, size, trackingEm = 0, x = 0, y = 0) {
  const scale = size / font.unitsPerEm;
  // charToGlyph avoids opentype.js's GSUB pass, which chokes on Inter's ccmp lookup.
  const glyphs = Array.from(str).map((ch) => font.charToGlyph(ch));
  const p = new opentype.Path();
  let cursor = 0;
  glyphs.forEach((g, i) => {
    p.extend(g.getPath(cursor, 0, size));
    let adv = g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      adv += (font.getKerningValue(g, glyphs[i + 1]) || 0) * scale;
      adv += trackingEm * size;
    }
    cursor += adv;
  });
  return { d: serialise(p.commands, x, y), width: cursor };
}

const display = (s, size, x, y) => text(FONTS.display, s, size, -0.045, x, y);
const mono = (s, size, x, y) => text(FONTS.mono, s, size, 0.1, x, y);
const monoMicro = (s, size, x, y) => text(FONTS.mono, s, size, 0.08, x, y);

// The dh monogram, verbatim from sites/david-henry/public/dh-mark.svg (viewBox 0 0 138 116)
const MARK = 'M57 0H82V74C82 96.6 63.6 115 41 115C18.4 115 0 96.6 0 74C0 51.4 18.4 33 41 33C46.8 33 52.2 34.2 57 36.4V0ZM41 53C29.4 53 20 62.4 20 74C20 85.6 29.4 95 41 95C52.6 95 62 85.6 62 74C62 62.4 52.6 53 41 53ZM87 41C93 37 100 35 108 35C124 35 137 48 137 64V111H114V67C114 57 108 51 100 51C95 51 91 53 87 56V41Z';
const MARK_W = 138;
const MARK_H = 116;
const DOT = { cx: 39, cy: 74, r: 11.5 };

const THEMES = {
  light: {
    name: 'light',
    bg: '#FFFFFF',
    ink: '#0A0A0A',
    hairline: '#DBDBDB',
    meta: '#8A8A8A',
    micro: '#AFAFAF',
    ghost: '#EDEDED',
    ghostSoft: '#F8F8F8',
    mint: '#00F2DC',
  },
  dark: {
    name: 'dark',
    bg: '#0A0A0A',
    ink: '#FFFFFF',
    hairline: '#2A2A2A',
    meta: '#8A8A8A',
    micro: '#6E6E6E',
    ghost: '#1C1C1C',
    ghostSoft: '#141414',
    mint: '#00F2DC',
  },
};

const EYEBROW = 'AI-NATIVE CPO · DIGITAL VENTURE BUILDER';
const NAME = 'David Henry';

module.exports = { display, mono, monoMicro, MARK, MARK_W, MARK_H, DOT, THEMES, EYEBROW, NAME };

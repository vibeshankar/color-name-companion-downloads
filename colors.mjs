// A small, hand-curated vocabulary. All names are approximate sRGB references.
// Matching uses distance in OKLab, which models perceived color differences.
const references = [
  ['Black','Neutral','#000000'], ['Charcoal','Neutral','#34383c'], ['Dark gray','Neutral','#555555'],
  ['Gray','Neutral','#808080'], ['Silver','Neutral','#bfbfbf'], ['Light gray','Neutral','#dddddd'],
  ['Light gray','Neutral','#eeeeee'], ['White','Neutral','#ffffff'],
  ['Cream','Warm neutral','#fff5d8'], ['Ivory','Warm neutral','#fffdf0'], ['Beige','Warm neutral','#d8c4a0'], ['Taupe','Warm neutral','#9d8b7c'],
  ['Gray beige','Warm neutral','#c8b9a9'], ['Warm gray','Warm neutral','#8f8680'], ['Greige','Warm neutral','#b6ada0'],
  ['Red','Red','#ff0000'], ['Dark red','Red','#8b0000'], ['Crimson','Red','#dc143c'], ['Burgundy','Red','#800020'],
  ['Brick red','Red','#b74736'], ['Muted red','Red','#b76767'], ['Maroon','Red','#800000'], ['Coral','Red','#ff7f50'],
  ['Orange','Orange','#ff8000'], ['Dark orange','Orange','#cc6600'], ['Burnt orange','Orange','#bf5700'],
  ['Peach','Orange','#ffc49b'], ['Apricot','Orange','#f4ab76'], ['Terracotta','Orange','#c87558'],
  ['Yellow','Yellow','#ffff00'], ['Golden yellow','Yellow','#ffd000'], ['Gold','Yellow','#d4a017'],
  ['Mustard','Yellow','#b59d18'], ['Pale yellow','Yellow','#fff6a0'], ['Ochre','Yellow','#b58324'],
  ['Green','Green','#00a000'], ['Bright green','Green','#00ff00'], ['Dark green','Green','#006400'],
  ['Forest green','Green','#228b22'], ['Emerald','Green','#149d65'], ['Mint','Green','#a3e6bf'],
  ['Sage','Green','#a0b18a'], ['Olive','Green','#808000'], ['Lime','Green','#a5e000'],
  ['Yellow green','Green','#9acd32'], ['Sea green','Green','#2e8b57'], ['Muted green','Green','#67876a'],
  ['Olive green','Green','#898c61'], ['Dark olive green','Green','#596737'], ['Sage','Green','#82937e'],
  ['Teal','Blue-green','#008080'], ['Dark teal','Blue-green','#00545a'], ['Light teal','Blue-green','#77c4c1'],
  ['Turquoise','Blue-green','#40e0d0'], ['Cyan','Blue-green','#00ffff'], ['Aqua blue','Blue-green','#36b6d0'],
  ['Deep teal','Blue-green','#004040'], ['Green teal','Blue-green','#00958c'], ['Muted teal','Blue-green','#5a8c85'],
  ['Blue','Blue','#0000ff'], ['Royal blue','Blue','#4169e1'], ['Sky blue','Blue','#87ceeb'],
  ['Light blue','Blue','#add8e6'], ['Navy','Blue','#000080'], ['Dark blue','Blue','#00396b'],
  ['Steel blue','Blue','#4682b4'], ['Muted blue','Blue','#6889a0'], ['Powder blue','Blue','#b0e0e6'],
  ['Slate blue','Blue','#5b688c'], ['Deep blue','Blue','#194557'],
  ['Purple','Purple','#800080'], ['Violet','Purple','#8f00ff'], ['Indigo','Purple','#4b0082'],
  ['Lavender','Purple','#b9a5e5'], ['Lilac','Purple','#c8a2c8'], ['Plum','Purple','#673147'],
  ['Dark purple','Purple','#4d205e'], ['Muted purple','Purple','#8d7398'], ['Pale lavender','Purple','#e6dff2'],
  ['Muted purple','Purple','#6a5b77'], ['Gray purple','Purple','#82788f'],
  ['Pink','Pink','#ffc0cb'], ['Hot pink','Pink','#ff69b4'], ['Magenta','Pink','#ff00ff'],
  ['Rose','Pink','#e65d85'], ['Dusty rose','Pink','#b77b87'], ['Blush pink','Pink','#efb6b8'],
  ['Salmon','Pink','#fa8072'], ['Pale pink','Pink','#f9dde5'], ['Raspberry','Pink','#b52d62'],
  ['Brown','Brown','#8b4513'], ['Dark brown','Brown','#4e2f20'], ['Chocolate','Brown','#653b27'],
  ['Tan','Brown','#d2b48c'], ['Caramel','Brown','#b77b3b'], ['Rust','Brown','#a6471b'], ['Sand','Brown','#c2ad83'],
  ['Rosy brown','Brown','#875b58']
];

export function normalizeHex(value) {
  const text = String(value).trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) return null;
  return '#' + (text.length === 3 ? [...text].map(c => c + c).join('') : text).toUpperCase();
}

export function rgbFromHex(hex) {
  const valid = normalizeHex(hex);
  if (!valid) throw new Error('Enter a valid HEX color.');
  return [1, 3, 5].map(start => parseInt(valid.slice(start, start + 2), 16));
}

function toOKLab(hex) {
  const [r, g, b] = rgbFromHex(hex).map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [
    .2104542553 * l + .793617785 * m - .0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
    .0259040371 * l + .7827717662 * m - .808675766 * s
  ];
}

const palette = references.map(([name, family, hex]) => ({ name, family, hex, lab: toOKLab(hex) }));

export function identifyColor(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error('Enter a valid HEX color.');
  const rgb = rgbFromHex(normalized);
  const lab = toOKLab(normalized);
  const chroma = Math.hypot(lab[1], lab[2]);
  const exactGray = rgb[0] === rgb[1] && rgb[1] === rgb[2];
  const eligible = palette.filter(color => {
    if (exactGray) return color.family === 'Neutral';
    if (chroma >= 0.035) return color.family !== 'Neutral';
    return true;
  });
  const ranked = eligible.map(color => ({
    name: color.name,
    family: color.family,
    distance: Math.hypot(...lab.map((value, index) => value - color.lab[index])),
    score: Math.hypot((lab[0] - color.lab[0]) * 0.85, lab[1] - color.lab[1], lab[2] - color.lab[2])
  })).sort((a, b) => a.score - b.score);

  const seen = new Set();
  const unique = ranked.filter(match => {
    if (seen.has(match.name)) return false;
    seen.add(match.name);
    return true;
  });
  const best = unique[0];
  const competingFamily = unique.find(match => match.family !== best.family);
  const closeFamily = competingFamily && competingFamily.score - best.score < 0.015;
  const closeShade = unique[1] && unique[1].score - best.score < 0.010;
  const close = !exactGray && (closeFamily || closeShade);
  const alternative = closeFamily ? competingFamily : unique[1];
  const matches = close
    ? [best, alternative, ...unique.filter(match => match !== best && match !== alternative)].slice(0, 3)
    : unique.slice(0, 3);

  return {
    hex: normalized, rgb, matches,
    close: close ? alternative : null,
    approximate: !exactGray && best.distance > 0.085
  };
}

export function buildProjectName(colorName, label = '', hex = '', includeHex = false) {
  const normalized = normalizeHex(hex);
  const color = String(colorName).trim();
  const project = String(label).trim();
  return [color, includeHex && normalized ? normalized : '', project].filter(Boolean).join(' · ');
}

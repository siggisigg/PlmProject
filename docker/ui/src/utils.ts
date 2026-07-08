export function fmt(n: number): string {
  return n.toLocaleString('is-IS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtISK(n: number, currency = 'ISK'): string {
  return `${fmt(n)} ${currency}`
}

// Inline SVG robot arm schematic — dark engineering palette, 6 pose variants.
export function robotSvg(index: number): string {
  const configs: [number, number, number][] = [
    [-22, 52, -18], [10, 48, 15], [28, 38, -5],
    [-5, 68, 8],    [18, 42, 22], [-15, 55, -12],
  ]
  const [t1d, b1d, b2d] = configs[index % configs.length]
  const deg = (d: number) => d * Math.PI / 180
  const t1 = deg(t1d), t2 = deg(t1d + b1d), t3 = deg(t1d + b1d + b2d)
  const bx = 100, by = 130
  const p = (n: number) => n.toFixed(1)
  const ex = bx + 48 * Math.sin(t1), ey = by - 48 * Math.cos(t1)
  const wx = ex + 36 * Math.sin(t2), wy = ey - 36 * Math.cos(t2)
  const tx = wx + 22 * Math.sin(t3), ty = wy - 22 * Math.cos(t3)
  const gA = deg(35)
  const g1x = tx + 12 * Math.sin(t3 + gA), g1y = ty - 12 * Math.cos(t3 + gA)
  const g2x = tx + 12 * Math.sin(t3 - gA), g2y = ty - 12 * Math.cos(t3 - gA)
  const svg =
    `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="200" height="160" fill="#060d1f"/>` +
    `<g stroke="#111d38" stroke-width="0.5">` +
    `<line x1="0" y1="40" x2="200" y2="40"/><line x1="0" y1="80" x2="200" y2="80"/>` +
    `<line x1="0" y1="120" x2="200" y2="120"/><line x1="50" y1="0" x2="50" y2="160"/>` +
    `<line x1="100" y1="0" x2="100" y2="160"/><line x1="150" y1="0" x2="150" y2="160"/>` +
    `</g>` +
    `<circle cx="100" cy="130" r="70" fill="none" stroke="#4d7eff" stroke-width="0.5" stroke-dasharray="2 6" opacity="0.12"/>` +
    `<rect x="72" y="140" width="56" height="13" rx="2" fill="#0d1529" stroke="#2e3d6a" stroke-width="1"/>` +
    `<rect x="84" y="130" width="32" height="12" rx="1" fill="#0d1529" stroke="#2e3d6a" stroke-width="1"/>` +
    `<circle cx="${bx}" cy="${by}" r="8" fill="#060d1f" stroke="#4d7eff" stroke-width="1.5"/>` +
    `<line x1="${bx}" y1="${by}" x2="${p(ex)}" y2="${p(ey)}" stroke="#4d7eff" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="${p(ex)}" cy="${p(ey)}" r="6" fill="#060d1f" stroke="#4d7eff" stroke-width="1.5"/>` +
    `<line x1="${p(ex)}" y1="${p(ey)}" x2="${p(wx)}" y2="${p(wy)}" stroke="#4d7eff" stroke-width="3.5" stroke-linecap="round"/>` +
    `<circle cx="${p(wx)}" cy="${p(wy)}" r="5" fill="#060d1f" stroke="#4d7eff" stroke-width="1.5"/>` +
    `<line x1="${p(wx)}" y1="${p(wy)}" x2="${p(tx)}" y2="${p(ty)}" stroke="#7880a0" stroke-width="2.5" stroke-linecap="round"/>` +
    `<line x1="${p(tx)}" y1="${p(ty)}" x2="${p(g1x)}" y2="${p(g1y)}" stroke="#7880a0" stroke-width="1.5" stroke-linecap="round"/>` +
    `<line x1="${p(tx)}" y1="${p(ty)}" x2="${p(g2x)}" y2="${p(g2y)}" stroke="#7880a0" stroke-width="1.5" stroke-linecap="round"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

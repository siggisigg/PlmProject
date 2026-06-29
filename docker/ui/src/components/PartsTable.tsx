import { useEffect, useState } from 'react'
import { fetchAllParts } from '../api'
import type { Part, BomLine } from '../types'

const GROUP_ORDER = ['SV', 'DJ', 'DL', 'DZ', 'DT', 'DS', 'DP']
const GROUP_LABEL: Record<string, string> = {
  SV: 'Welding', DJ: 'Saw Cut', DL: 'Bending',
  DZ: 'Laser Cut', DT: 'Turning', DS: 'Standard Parts', DP: 'Distribution',
}
const BADGE: Record<string, string> = {
  SS: 'bg-blue-950 text-blue-300 border border-blue-800',
  SV: 'bg-orange-950 text-orange-300 border border-orange-800',
  DJ: 'bg-violet-950 text-violet-300 border border-violet-800',
  DL: 'bg-violet-950 text-violet-300 border border-violet-800',
  DZ: 'bg-violet-950 text-violet-300 border border-violet-800',
  DT: 'bg-violet-950 text-violet-300 border border-violet-800',
  DS: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
  DP: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
}

interface Props {
  selection: Map<number, BomLine>
  onToggle: (part: Part) => void
  onNext: () => void
}

// Generate an engineering-schematic SVG of a robot arm — different pose per card index.
// [theta1, bend1, bend2] = degrees from vertical (clockwise positive) for each segment.
function robotSvg(index: number): string {
  const configs: [number, number, number][] = [
    [-22, 52, -18],
    [ 10, 48,  15],
    [ 28, 38,  -5],
    [ -5, 68,   8],
    [ 18, 42,  22],
    [-15, 55, -12],
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

export default function PartsTable({ selection, onToggle, onNext }: Props) {
  const [parts, setParts]           = useState<Part[]>([])
  const [search, setSearch]         = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchAllParts()
      .then(setParts)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const q = search.toLowerCase().trim()
  const filtered = q
    ? parts.filter(p =>
        p.plm_part_number.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    : parts

  const assemblies = filtered.filter(p => p.production_type === 'SS')
  const otherGroups = GROUP_ORDER
    .map(type => ({ type, items: filtered.filter(p => p.production_type === type) }))
    .filter(g => g.items.length > 0)

  function toggleGroup(type: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const fmt = (n: number) =>
    n.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtVal = (n: number, currency: string) =>
    n === 0
      ? <span className="text-[#454c6a]">—</span>
      : <>{fmt(n)} <span className="text-[#454c6a] text-xs">{currency}</span></>

  const selectedCount = selection.size

  return (
    <div className="flex flex-col gap-3 pb-20">
      <input
        type="text"
        placeholder="Search across all parts…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-2 text-[#e4e6f0] placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff] focus:border-[#4d7eff] transition-colors"
      />

      {error && (
        <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-[#454c6a] text-center py-12">Loading…</p>
      )}

      {!loading && (
        <div className="flex flex-col gap-4">

          {/* ── Assemblies — card grid ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#4d7eff] tracking-widest uppercase">Systems</span>
                <span className="text-xs text-[#7880a0]">top-level sellable assemblies · click to select</span>
              </div>
              <span className="text-xs text-[#454c6a] font-mono">{assemblies.length} items</span>
            </div>

            {assemblies.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#454c6a] border border-[#2e3348] rounded">No assemblies match</div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {assemblies.map((p, idx) => {
                  const selected = selection.has(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => onToggle(p)}
                      className={`relative rounded border cursor-pointer transition-all overflow-hidden
                        ${selected
                          ? 'border-[#4d7eff] ring-2 ring-[#4d7eff]/50 bg-[#0d1a3d]'
                          : 'border-[#2e3348] hover:border-[#4d7eff]/40 bg-[#1a1d27] hover:bg-[#1e2233]'
                        }`}
                    >
                      {/* Robot arm schematic — generated SVG, no external dependency */}
                      <img
                        src={robotSvg(idx)}
                        alt={p.description ?? p.plm_part_number}
                        className="w-full aspect-video object-cover"
                        loading="lazy"
                      />

                      {/* Selected badge */}
                      {selected && (
                        <div className="absolute top-2 right-2 bg-[#4d7eff] text-white text-[11px] font-mono rounded px-1.5 py-0.5 leading-none">
                          ✓
                        </div>
                      )}

                      {/* Card body */}
                      <div className="px-3 py-2.5">
                        <p className="font-mono text-xs text-[#7880a0] truncate">{p.plm_part_number}</p>
                        <p className="text-sm font-medium text-[#e4e6f0] mt-0.5 leading-snug line-clamp-2">
                          {p.description ?? <span className="text-[#454c6a]">—</span>}
                        </p>
                        <div className="mt-2 flex gap-3 text-xs font-mono text-[#454c6a]">
                          <span>Cost: {fmtVal(p.unit_cost, p.currency)}</span>
                          <span>Price: {fmtVal(p.unit_price, p.currency)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Other types — collapsible ── */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#454c6a] uppercase tracking-widest font-mono pt-1">Component Library</p>
            {otherGroups.map(({ type, items }) => {
              const open = openGroups.has(type)
              return (
                <div key={type} className="rounded border border-[#2e3348] overflow-hidden">
                  <button
                    onClick={() => toggleGroup(type)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a1d27] hover:bg-[#22263a] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] rounded px-1.5 py-0.5 font-mono ${BADGE[type] ?? 'bg-zinc-800 text-zinc-400'}`}>{type}</span>
                      <span className="text-sm font-medium text-[#e4e6f0]">{GROUP_LABEL[type] ?? type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#454c6a] font-mono">{items.length} items</span>
                      <span className="text-[#7880a0] text-xs">{open ? '▾' : '▸'}</span>
                    </div>
                  </button>

                  {open && (
                    <table className="w-full border-collapse text-sm border-t border-[#2e3348]">
                      <thead className="bg-[#22263a] text-left text-xs text-[#7880a0] uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 w-8"></th>
                          <th className="px-3 py-2">Part Number</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Material</th>
                          <th className="px-3 py-2 text-right">Unit Cost</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2e3348]">
                        {items.map(p => {
                          const selected = selection.has(p.id)
                          return (
                            <tr
                              key={p.id}
                              onClick={() => onToggle(p)}
                              className={`cursor-pointer transition-colors ${selected ? 'bg-[#0d1a3d]' : 'hover:bg-[#22263a]'}`}
                            >
                              <td className="px-3 py-1.5">
                                <input type="checkbox" readOnly checked={selected} className="accent-[#4d7eff] cursor-pointer" />
                              </td>
                              <td className="px-3 py-1.5 font-mono text-xs text-[#e4e6f0]">{p.plm_part_number}</td>
                              <td className="px-3 py-1.5 text-[#e4e6f0]">
                                {p.description ?? <span className="text-[#454c6a]">—</span>}
                              </td>
                              <td className="px-3 py-1.5 text-sm text-[#7880a0]">
                                {p.material ?? <span className="text-[#454c6a]">—</span>}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-[#7880a0]">
                                {fmtVal(p.unit_cost, p.currency)}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-[#7880a0]">
                                {fmtVal(p.unit_price, p.currency)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-[#454c6a] font-mono pt-1">{filtered.length} parts total</p>
        </div>
      )}

      {/* ── Sticky Next bar ── */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#2e3348] bg-[#1a1d27]/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-[#7880a0]">
          {selectedCount === 0
            ? 'Select one or more systems above to continue'
            : <><span className="text-[#e4e6f0] font-medium">{selectedCount}</span> system{selectedCount !== 1 ? 's' : ''} selected</>
          }
        </span>
        <button
          onClick={onNext}
          disabled={selectedCount === 0}
          className={`text-sm font-medium px-5 py-2 rounded transition-colors ${
            selectedCount > 0
              ? 'bg-[#4d7eff] hover:bg-[#3d6eef] text-white'
              : 'bg-[#2e3348] text-[#454c6a] cursor-not-allowed'
          }`}
        >
          Next: Review BOM →
        </button>
      </div>
    </div>
  )
}

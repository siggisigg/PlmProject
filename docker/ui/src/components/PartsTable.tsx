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

// Curated Unsplash robot / industrial-automation photos (stable IDs, no API key needed)
const ROBOT_IMGS = [
  '1485827404703-89b55fcc595e', // robotic arms in factory
  '1562408590-e32931084e23',   // orange industrial robot arm
  '1563770557593-b4f1e81f96dd', // robot arm close-up
  '1535378917042-10a22c95931a', // automated manufacturing line
  '1516110833967-0b5716ca1387', // factory floor robots
  '1620712943543-bcc4688e7485', // humanoid robot portrait
  '1677442135703-1787eea5ce01', // AI/robot concept
  '1677756119517-756a188d2d94', // robot in blue light
  '1676911809747-97b5e1a5da2c', // standing humanoid robot
  '1567789884554-0ac29e4bc68c', // robotic arm detail
  '1531746790731-6c087fecd65a', // tech/circuit abstract
  '1507146153580-69a1fe6d8aa1', // robot profile
]

function placeholderImg(index: number) {
  const id = ROBOT_IMGS[index % ROBOT_IMGS.length]
  return `https://images.unsplash.com/photo-${id}?w=400&h=225&fit=crop&auto=format&q=80`
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
                      {/* Robot placeholder image */}
                      <img
                        src={placeholderImg(idx)}
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

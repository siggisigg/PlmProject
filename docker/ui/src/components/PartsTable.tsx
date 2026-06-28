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
}

export default function PartsTable({ selection, onToggle }: Props) {
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

  return (
    <div className="flex flex-col gap-3">
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
        <div className="flex flex-col gap-2">

          {/* ── Assemblies — always expanded, primary focus ── */}
          <div className="rounded border border-[#4d7eff]/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0d1a3d]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#4d7eff] tracking-widest uppercase">Assemblies</span>
                <span className="text-xs text-[#7880a0]">top-level sellable systems · click to add to BOM</span>
              </div>
              <span className="text-xs text-[#454c6a] font-mono">{assemblies.length} items</span>
            </div>

            {assemblies.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#454c6a]">No assemblies match</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[#1a1d27] text-left text-xs text-[#7880a0] uppercase tracking-wider border-y border-[#2e3348]">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      {selection.size > 0 && (
                        <span className="text-[#4d7eff] font-mono normal-case tracking-normal">{selection.size}✓</span>
                      )}
                    </th>
                    <th className="px-3 py-2">Part Number</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e3348]">
                  {assemblies.map(p => {
                    const selected = selection.has(p.id)
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onToggle(p)}
                        className={`cursor-pointer transition-colors ${selected ? 'bg-[#0d1a3d]' : 'hover:bg-[#22263a]'}`}
                      >
                        <td className="px-3 py-2">
                          <input type="checkbox" readOnly checked={selected} className="accent-[#4d7eff] cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-[#e4e6f0]">{p.plm_part_number}</td>
                        <td className="px-3 py-2 text-[#e4e6f0]">
                          {p.description ?? <span className="text-[#454c6a]">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#7880a0] text-sm">
                          {fmtVal(p.unit_cost, p.currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#7880a0] text-sm">
                          {fmtVal(p.unit_price, p.currency)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Other types — collapsible ── */}
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

          <p className="text-xs text-[#454c6a] font-mono pt-1">{filtered.length} parts total</p>
        </div>
      )}
    </div>
  )
}

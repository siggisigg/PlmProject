import { useEffect, useState, useCallback } from 'react'
import { fetchParts } from '../api'
import type { Part, BomLine } from '../types'

const PROD_TYPES = ['', 'SS', 'SV', 'DJ', 'DL', 'DZ', 'DS', 'DT', 'DP']
const TYPE_LABEL: Record<string, string> = {
  SS: 'Assembling', SV: 'Welding', DJ: 'Saw cut', DL: 'Bending',
  DZ: 'Laser cut', DS: 'Standard', DT: 'Turning', DP: 'Distribution',
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
  const [parts, setParts] = useState<Part[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setParts(await fetchParts(search, typeFilter))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) =>
    n.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search part number or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-[#0f1117] border border-[#2e3348] rounded px-3 py-1.5 text-sm text-[#e4e6f0] placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff] focus:border-[#4d7eff] transition-colors"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1.5 text-sm text-[#e4e6f0] focus:outline-none focus:ring-1 focus:ring-[#4d7eff] transition-colors"
        >
          {PROD_TYPES.map(t => (
            <option key={t} value={t}>{t ? `${t} — ${TYPE_LABEL[t]}` : 'All types'}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
      )}

      <div className="overflow-auto rounded border border-[#2e3348]">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-[#22263a] text-left text-[11px] text-[#7880a0] uppercase tracking-wider sticky top-0">
            <tr>
              <th className="px-3 py-2 w-8">
                {selection.size > 0 && (
                  <span className="text-[#4d7eff] font-mono normal-case tracking-normal">{selection.size}✓</span>
                )}
              </th>
              <th className="px-3 py-2">Part Number</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2 text-right">Unit Cost</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e3348]">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#454c6a] text-xs">Loading…</td>
              </tr>
            )}
            {!loading && parts.map(p => {
              const selected = selection.has(p.id)
              return (
                <tr
                  key={p.id}
                  onClick={() => onToggle(p)}
                  className={`cursor-pointer transition-colors ${
                    selected ? 'bg-[#0d1a3d]' : 'hover:bg-[#22263a]'
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      readOnly
                      checked={selected}
                      className="accent-[#4d7eff] cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs text-[#e4e6f0]">{p.plm_part_number}</td>
                  <td className="px-3 py-1.5 text-[#e4e6f0]">
                    {p.description ?? <span className="text-[#454c6a]">—</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    {p.production_type
                      ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${BADGE[p.production_type] ?? 'bg-zinc-800 text-zinc-400'}`}>{p.production_type}</span>
                      : <span className="text-[#454c6a]">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-[#7880a0]">
                    {p.material ?? <span className="text-[#454c6a]">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#7880a0]">
                    {fmt(p.unit_cost)} <span className="text-[#454c6a] text-[11px]">{p.currency}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#7880a0]">
                    {fmt(p.unit_price)} <span className="text-[#454c6a] text-[11px]">{p.currency}</span>
                  </td>
                </tr>
              )
            })}
            {!loading && parts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#454c6a] text-xs">No parts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#454c6a] font-mono">{parts.length} parts</p>
    </div>
  )
}

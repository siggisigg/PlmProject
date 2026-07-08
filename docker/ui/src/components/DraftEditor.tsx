import { useState, useEffect } from 'react'
import { fetchParts } from '../api'
import { fmt, fmtISK } from '../utils'
import type { DraftLine, Part } from '../types'

interface Props {
  lines:          DraftLine[]
  onChange:       (lines: DraftLine[]) => void
  onAddRecipe:    () => void
  onComplete:     () => void
}

export default function DraftEditor({ lines, onChange, onAddRecipe, onComplete }: Props) {
  const [showSearch, setShowSearch] = useState(false)
  const [parts,      setParts]      = useState<Part[]>([])
  const [query,      setQuery]      = useState('')
  const [loadingP,   setLoadingP]   = useState(false)

  useEffect(() => {
    if (!showSearch || parts.length > 0) return
    setLoadingP(true)
    fetchParts().then(setParts).finally(() => setLoadingP(false))
  }, [showSearch])

  function updateQty(key: string, qty: number) {
    onChange(lines.map(l => l.key === key ? { ...l, quantity: Math.max(1, qty) } : l))
  }

  function removeLine(key: string) {
    onChange(lines.filter(l => l.key !== key))
  }

  function addPart(part: Part) {
    const key = `m-${part.id}-${Date.now()}`
    const newLine: DraftLine = {
      key,
      part_id:         part.id,
      plm_part_number: part.plm_part_number,
      description:     part.description,
      bom_type:        part.bom_type,
      production_type: part.production_type,
      quantity:        1,
      unit_cost:       part.unit_cost,
      unit_price:      part.unit_price,
      currency:        part.currency,
      source:          'manual',
    }
    onChange([...lines, newLine])
    setQuery('')
    setShowSearch(false)
  }

  const totalCost  = lines.reduce((s, l) => s + l.quantity * l.unit_cost,  0)
  const totalPrice = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const margin     = totalPrice - totalCost
  const marginPct  = totalPrice > 0 ? (margin / totalPrice * 100).toFixed(1) : '—'

  const q = query.toLowerCase()
  const filtered = parts.filter(p =>
    p.plm_part_number.toLowerCase().includes(q) ||
    (p.description ?? '').toLowerCase().includes(q)
  ).slice(0, 50)

  // Group lines by recipe instance for display
  const recipeGroups = new Map<number | string, DraftLine[]>()
  lines.forEach(l => {
    const key = l.source === 'recipe' && l.recipe_instance_id != null
      ? l.recipe_instance_id
      : '__manual__'
    const arr = recipeGroups.get(key) ?? []
    arr.push(l)
    recipeGroups.set(key, arr)
  })

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">Draft BOM</h2>
          <p className="text-sm text-[#7880a0] mt-0.5">
            Review and edit before finalising. Add more recipes or parts manually.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddRecipe}
            className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] hover:border-[#4d7eff]/40 transition-colors"
          >
            + Add Recipe
          </button>
          <button
            onClick={() => setShowSearch(s => !s)}
            className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] hover:border-[#4d7eff]/40 transition-colors"
          >
            + Add Part
          </button>
        </div>
      </div>

      {/* Part search panel */}
      {showSearch && (
        <div className="rounded border border-[#2e3348] bg-[#1a1d27] p-4 flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Search part number or description…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-2 text-sm text-[#e4e6f0] placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
          />
          {loadingP && <p className="text-xs text-[#454c6a] text-center py-2">Loading…</p>}
          {!loadingP && query.length > 0 && (
            <div className="max-h-48 overflow-y-auto divide-y divide-[#2e3348]">
              {filtered.length === 0 && (
                <p className="text-xs text-[#454c6a] py-3 text-center">No results</p>
              )}
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => addPart(p)}
                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-[#22263a] transition-colors text-left"
                >
                  <span className="font-mono text-xs text-[#4d7eff] shrink-0 w-40 truncate">{p.plm_part_number}</span>
                  <span className="text-sm text-[#e4e6f0] flex-1 truncate">{p.description ?? '—'}</span>
                  <span className="text-xs text-[#7880a0] font-mono shrink-0">{fmt(p.unit_price)} ISK</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {lines.length === 0 && (
        <div className="border border-dashed border-[#2e3348] rounded px-6 py-12 text-center">
          <p className="text-sm text-[#454c6a]">Draft is empty. Add a recipe or parts above.</p>
        </div>
      )}

      {/* Line groups */}
      {lines.length > 0 && (
        <div className="flex flex-col gap-4">
          {Array.from(recipeGroups.entries()).map(([groupKey, groupLines]) => {
            const isManual = groupKey === '__manual__'
            const label = isManual
              ? 'Manual additions'
              : `Recipe ${groupKey}${groupLines[0]?.recipe_name ? ` — ${groupLines[0].recipe_name}` : ''}`
            return (
              <div key={String(groupKey)} className="rounded border border-[#2e3348] overflow-hidden">
                <div className="px-4 py-2 bg-[#22263a] flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isManual
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-blue-950 text-blue-300 border-blue-800'
                  }`}>{isManual ? 'MANUAL' : 'RECIPE'}</span>
                  <span className="text-xs text-[#7880a0]">{label}</span>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#1a1d27] text-left text-xs text-[#7880a0] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2">Part</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Unit Cost</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total Price</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e3348]">
                    {groupLines.map(l => (
                      <tr key={l.key} className="bg-[#1a1d27] hover:bg-[#22263a] transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-[#4d7eff]">{l.plm_part_number}</td>
                        <td className="px-4 py-2 text-[#e4e6f0] max-w-xs truncate">{l.description ?? '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            l.bom_type === 'electrical'
                              ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                              : 'bg-blue-950 text-blue-300 border-blue-800'
                          }`}>
                            {l.bom_type === 'electrical' ? 'ELEC' : 'MECH'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number" min={1} step={1} value={l.quantity}
                            onChange={e => updateQty(l.key, Number(e.target.value))}
                            className="w-16 bg-[#0f1117] border border-[#2e3348] rounded px-2 py-0.5 text-xs text-right text-[#e4e6f0] font-mono focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">{fmt(l.unit_cost)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">{fmt(l.unit_price)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-[#e4e6f0]">{fmt(l.quantity * l.unit_price)}</td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeLine(l.key)}
                            className="text-[#454c6a] hover:text-[#e05555] transition-colors text-xs px-1"
                            title="Remove"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#2e3348] bg-[#1a1d27]/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="text-sm font-mono flex items-center gap-4">
          <span><span className="text-[#454c6a]">Cost </span><span className="text-[#e4e6f0]">{fmtISK(totalCost)}</span></span>
          <span className="text-[#2e3348]">|</span>
          <span><span className="text-[#454c6a]">Price </span><span className="text-[#4d7eff]">{fmtISK(totalPrice)}</span></span>
          <span className="text-[#2e3348]">|</span>
          <span><span className="text-[#454c6a]">Margin </span><span className="text-[#34d399]">{marginPct}%</span></span>
          <span className="text-[#454c6a] text-xs">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={onComplete}
          disabled={lines.length === 0}
          className={`text-sm font-medium px-6 py-2 rounded transition-colors ${
            lines.length > 0
              ? 'bg-[#4d7eff] hover:bg-[#3d6eef] text-white'
              : 'bg-[#2e3348] text-[#454c6a] cursor-not-allowed'
          }`}
        >
          Complete BOM ↓
        </button>
      </div>
    </div>
  )
}

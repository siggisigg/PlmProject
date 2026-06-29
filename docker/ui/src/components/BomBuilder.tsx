import type { BomLine } from '../types'

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
  onQtyChange: (partId: number, qty: number) => void
  onRemove: (partId: number) => void
  onClear: () => void
  onBack: () => void
}

export default function BomBuilder({ selection, onQtyChange, onRemove, onClear, onBack }: Props) {
  const lines    = Array.from(selection.values())
  const totalCost  = lines.reduce((s, l) => s + l.qty * l.part.unit_cost, 0)
  const totalPrice = lines.reduce((s, l) => s + l.qty * l.part.unit_price, 0)
  const margin     = totalPrice - totalCost
  const marginPct  = totalPrice > 0 ? (margin / totalPrice) * 100 : 0
  const currency   = lines[0]?.part.currency ?? 'ISK'

  const fmt = (n: number) =>
    n.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  function downloadCSV() {
    const header = [
      'Part Number', 'Description', 'Type', 'Qty',
      'Unit Cost', 'Line Cost', 'Unit Price', 'Line Price', 'Currency',
    ]
    const rows = lines.map(({ part, qty }) => [
      part.plm_part_number,
      part.description ?? '',
      part.production_type ?? '',
      String(qty),
      String(part.unit_cost),
      String(qty * part.unit_cost),
      String(part.unit_price),
      String(qty * part.unit_price),
      part.currency,
    ])
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `bom-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#454c6a] gap-4">
        <p className="text-sm">No systems selected</p>
        <p className="text-xs">Go back and select one or more systems to build a BOM.</p>
        <button
          onClick={onBack}
          className="mt-2 text-xs text-[#7880a0] hover:text-[#e4e6f0] border border-[#2e3348] hover:border-[#454c6a] px-4 py-2 rounded transition-colors"
        >
          ← Back to Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-auto max-h-[calc(100vh-260px)] rounded border border-[#2e3348]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#22263a] text-left text-xs text-[#7880a0] uppercase tracking-wider sticky top-0">
            <tr>
              <th className="px-3 py-2">Part Number</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 w-20 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Unit Cost</th>
              <th className="px-3 py-2 text-right">Line Cost</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Line Price</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e3348]">
            {lines.map(({ part, qty }) => (
              <tr key={part.id} className="hover:bg-[#22263a] transition-colors">
                <td className="px-3 py-1.5 font-mono text-xs text-[#e4e6f0]">{part.plm_part_number}</td>
                <td className="px-3 py-1.5 text-[#e4e6f0]">
                  {part.description ?? <span className="text-[#454c6a]">—</span>}
                </td>
                <td className="px-3 py-1.5">
                  {part.production_type
                    ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${BADGE[part.production_type] ?? 'bg-zinc-800 text-zinc-400'}`}>{part.production_type}</span>
                    : <span className="text-[#454c6a]">—</span>}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={e => onQtyChange(part.id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-[#0f1117] border border-[#2e3348] rounded px-1 py-0.5 text-center text-sm text-[#e4e6f0] focus:outline-none focus:ring-1 focus:ring-[#4d7eff] focus:border-[#4d7eff] transition-colors"
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-[#7880a0]">{fmt(part.unit_cost)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[#e4e6f0]">{fmt(qty * part.unit_cost)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[#7880a0]">{fmt(part.unit_price)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[#e4e6f0]">{fmt(qty * part.unit_price)}</td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    onClick={() => onRemove(part.id)}
                    className="text-[#454c6a] hover:text-[#e05555] transition-colors text-base leading-none"
                    title="Remove"
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[#2e3348]">
            <tr className="bg-[#22263a]">
              <td colSpan={5} className="px-3 py-2 text-xs text-[#7880a0]">
                {lines.length} line{lines.length !== 1 ? 's' : ''}
              </td>
              <td className="px-3 py-2 text-right font-mono text-sm text-[#e4e6f0]">
                {fmt(totalCost)} <span className="text-[#454c6a] text-[11px]">{currency}</span>
              </td>
              <td></td>
              <td className="px-3 py-2 text-right font-mono text-sm text-[#e4e6f0]">
                {fmt(totalPrice)} <span className="text-[#454c6a] text-[11px]">{currency}</span>
              </td>
              <td></td>
            </tr>
            <tr className="bg-[#1a1d27]">
              <td colSpan={9} className="px-3 py-2">
                <div className="flex gap-6 text-xs">
                  <span className="text-[#7880a0]">
                    Cost: <span className="text-[#e4e6f0] font-mono">{fmt(totalCost)} {currency}</span>
                  </span>
                  <span className="text-[#7880a0]">
                    Price: <span className="text-[#e4e6f0] font-mono">{fmt(totalPrice)} {currency}</span>
                  </span>
                  <span className="text-[#7880a0]">
                    Margin: <span className="text-[#34c97e] font-mono">{fmt(margin)} {currency} ({marginPct.toFixed(1)}%)</span>
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-xs text-[#7880a0] hover:text-[#e4e6f0] border border-[#2e3348] hover:border-[#454c6a] px-3 py-1.5 rounded transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1" />
        <button
          onClick={onClear}
          className="text-xs text-[#454c6a] hover:text-[#e05555] border border-[#2e3348] hover:border-[#e05555]/50 px-3 py-1.5 rounded transition-colors"
        >
          Clear all
        </button>
        <button
          onClick={downloadCSV}
          className="text-xs font-medium bg-[#4d7eff] hover:bg-[#3d6eef] text-white px-4 py-1.5 rounded transition-colors"
        >
          Generate BOM ↓
        </button>
      </div>
    </div>
  )
}

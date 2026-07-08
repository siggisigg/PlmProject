import { fmt } from '../utils'
import type { DraftLine } from '../types'

interface Props {
  lines:        DraftLine[]
  onNewProject: () => void
}

export default function ProjectBom({ lines, onNewProject }: Props) {
  const totalCost  = lines.reduce((s, l) => s + l.quantity * l.unit_cost,  0)
  const totalPrice = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const margin     = totalPrice - totalCost
  const marginPct  = totalPrice > 0 ? (margin / totalPrice * 100).toFixed(1) : '0.0'

  function exportCsv() {
    const header = 'Part Number,Description,Type,Qty,Unit Cost (ISK),Unit Price (ISK),Total Cost (ISK),Total Price (ISK),Source'
    const rows = lines.map(l =>
      [
        l.plm_part_number,
        `"${(l.description ?? '').replace(/"/g, '""')}"`,
        l.bom_type,
        l.quantity,
        l.unit_cost,
        l.unit_price,
        l.quantity * l.unit_cost,
        l.quantity * l.unit_price,
        l.source,
      ].join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `bom-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">Project BOM</h2>
          <p className="text-sm text-[#7880a0] mt-0.5">Read-only snapshot — financials are locked at this point.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] hover:border-[#4d7eff]/40 transition-colors"
          >
            Export CSV ↓
          </button>
          <button
            onClick={onNewProject}
            className="text-sm px-4 py-1.5 rounded bg-[#22263a] text-[#e4e6f0] hover:bg-[#2e3348] transition-colors"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Cost',  value: `${fmt(totalCost)} ISK`,  color: 'text-[#e4e6f0]' },
          { label: 'Total Price', value: `${fmt(totalPrice)} ISK`, color: 'text-[#4d7eff]'  },
          { label: 'Margin',      value: `${marginPct}%`,          color: 'text-[#34d399]'  },
        ].map(c => (
          <div key={c.label} className="bg-[#1a1d27] border border-[#2e3348] rounded px-4 py-3">
            <p className="text-xs text-[#7880a0] uppercase tracking-widest font-mono">{c.label}</p>
            <p className={`text-xl font-semibold font-mono mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* BOM table */}
      <div className="rounded border border-[#2e3348] overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#22263a] text-left text-xs text-[#7880a0] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2">Part Number</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Unit Cost</th>
              <th className="px-4 py-2 text-right">Unit Price</th>
              <th className="px-4 py-2 text-right">Line Total</th>
              <th className="px-4 py-2">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e3348]">
            {lines.map(l => (
              <tr key={l.key} className="bg-[#1a1d27]">
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
                <td className="px-4 py-2 text-right font-mono text-xs text-[#e4e6f0]">{l.quantity}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">{fmt(l.unit_cost)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">{fmt(l.unit_price)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[#e4e6f0]">{fmt(l.quantity * l.unit_price)}</td>
                <td className="px-4 py-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    l.source === 'recipe'
                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>{l.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#22263a] border-t border-[#2e3348] text-xs font-mono">
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-[#7880a0] uppercase tracking-wide">Totals</td>
              <td className="px-4 py-2 text-right text-[#4d7eff] font-semibold">{fmt(totalPrice)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

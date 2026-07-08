import { fmt, fmtISK } from '../utils.ts'
import type { DraftLine } from '../types.ts'

interface Props {
  lines:        DraftLine[]
  onNewProject: () => void
}

export default function ProjectBom({ lines, onNewProject }: Props) {
  const totalCost  = lines.reduce((s, l) => s + l.quantity * l.unit_cost,  0)
  const totalPrice = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const margin     = totalPrice - totalCost
  const marginPct  = totalPrice > 0 ? (margin / totalPrice * 100).toFixed(1) : '—'

  function downloadCsv() {
    const esc = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`
    const header = ['Part Number', 'Description', 'Type', 'Qty', 'Unit Cost ISK', 'Unit Price ISK', 'Total Price ISK']
    const rows = lines.map(l => [
      esc(l.plm_part_number),
      esc(l.description),
      esc(l.bom_type),
      String(l.quantity),
      String(l.unit_cost),
      String(l.unit_price),
      String(l.quantity * l.unit_price),
    ])
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `bom-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">Project BOM</h2>
          <p className="text-sm text-[#7880a0] mt-0.5">Final read-only BOM snapshot.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCsv}
            className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] transition-colors"
          >
            ↓ Export CSV
          </button>
          <button
            onClick={onNewProject}
            className="text-sm px-4 py-1.5 rounded bg-[#4d7eff] hover:bg-[#3d6eef] text-white transition-colors"
          >
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Cost', value: fmtISK(totalCost), color: 'text-[#e4e6f0]' },
          { label: 'Total Price', value: fmtISK(totalPrice), color: 'text-[#4d7eff]' },
          { label: 'Margin', value: `${marginPct}%`, color: 'text-[#34d399]' },
        ].map(c => (
          <div key={c.label} className="rounded border border-[#2e3348] bg-[#1a1d27] px-4 py-3">
            <p className="text-xs text-[#7880a0] mb-1">{c.label}</p>
            <p className={`text-xl font-mono font-semibold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded border border-[#2e3348] overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#22263a] text-left text-xs text-[#7880a0] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2">Part</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Unit Cost</th>
              <th className="px-4 py-2 text-right">Unit Price</th>
              <th className="px-4 py-2 text-right">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e3348]">
            {lines.map(l => (
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
                <td className="px-4 py-2 text-right font-mono text-xs text-[#e4e6f0]">{l.quantity}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">{fmt(l.unit_cost)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">{fmt(l.unit_price)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[#e4e6f0]">{fmt(l.quantity * l.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

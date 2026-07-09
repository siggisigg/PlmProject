import { fmt, fmtISK } from '../utils.ts'
import type { ProjectBomLine, ProjectBomResponse } from '../types.ts'

interface Props {
  data: ProjectBomResponse
  onNewProject: () => void
}

// Frozen snapshot tree, rendered depth-indented in snapshot order.
// Assembly rows are structural: they show read-time rollups (rolled_*),
// never stored money. Leaf rows show frozen unit + extended values.
export default function ProjectBom({ data, onNewProject }: Props) {
  const { project, lines, totals } = data

  const totalCost = totals.total_cost ?? 0
  const totalPrice = totals.total_price ?? 0
  const margin = totalPrice - totalCost
  const marginPct = totalPrice > 0 ? (margin / totalPrice * 100).toFixed(1) : '—'

  const depth = (l: ProjectBomLine) =>
    l.level_path ? l.level_path.split('.').length - 1 : 0

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">
            Project BOM — {project.name}
          </h2>
          <p className="text-sm text-[#7880a0] mt-0.5">
            Frozen snapshot
            {lines[0]?.snapshotted_at &&
              ` · ${new Date(lines[0].snapshotted_at).toLocaleString()}`}
            {project.solution_code && (
              <span className="font-mono"> · {project.solution_code}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/projects/${project.id}/bom?format=csv`}
            download
            className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] transition-colors"
          >
            ↓ Export CSV
          </a>
          <button
            onClick={onNewProject}
            className="text-sm px-4 py-1.5 rounded bg-[#4d7eff] hover:bg-[#3d6eef] text-white transition-colors"
          >
            ← Projects
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
              <th className="px-4 py-2 w-16">Level</th>
              <th className="px-4 py-2">Part</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Unit Cost</th>
              <th className="px-4 py-2 text-right">Unit Price</th>
              <th className="px-4 py-2 text-right">Total Cost</th>
              <th className="px-4 py-2 text-right">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2e3348]">
            {lines.map(l => {
              const d = depth(l)
              const rowCost = l.is_assembly
                ? l.rolled_cost
                : l.snapshot_unit_cost !== null ? l.effective_qty * l.snapshot_unit_cost : null
              const rowPrice = l.is_assembly
                ? l.rolled_price
                : l.snapshot_unit_price !== null ? l.effective_qty * l.snapshot_unit_price : null
              return (
                <tr
                  key={l.id}
                  className={`transition-colors hover:bg-[#22263a] ${
                    l.is_assembly ? 'bg-[#1e2235]' : 'bg-[#1a1d27]'
                  }`}
                >
                  <td className="px-4 py-2 font-mono text-xs text-[#454c6a]">{l.level_path}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[#4d7eff]">
                    <span style={{ paddingLeft: `${d * 16}px` }} className={l.is_assembly ? 'font-semibold' : ''}>
                      {l.is_assembly ? '▸ ' : ''}{l.plm_part_number}
                    </span>
                  </td>
                  <td className={`px-4 py-2 max-w-xs truncate ${l.is_assembly ? 'text-[#e4e6f0] font-medium' : 'text-[#e4e6f0]'}`}>
                    {l.description ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      l.bom_type === 'electrical'
                        ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                        : l.is_assembly
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {l.bom_type === 'electrical' ? 'ELEC' : l.is_assembly ? 'ASSY' : (l.production_type ?? 'MECH')}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#e4e6f0]">{fmt(l.effective_qty)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">
                    {l.is_assembly ? '' : l.snapshot_unit_cost !== null ? fmt(l.snapshot_unit_cost) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-[#7880a0]">
                    {l.is_assembly ? '' : l.snapshot_unit_price !== null ? fmt(l.snapshot_unit_price) : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono text-xs ${l.is_assembly ? 'text-[#7880a0]' : 'text-[#e4e6f0]'}`}>
                    {rowCost !== null ? fmt(rowCost) : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono text-xs ${l.is_assembly ? 'text-[#4d7eff]/70' : 'text-[#4d7eff]'}`}>
                    {rowPrice !== null ? fmt(rowPrice) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-[#22263a] text-xs font-mono">
            <tr>
              <td colSpan={7} className="px-4 py-2 text-right text-[#7880a0] uppercase tracking-wider">
                Totals (leaf parts)
              </td>
              <td className="px-4 py-2 text-right text-[#e4e6f0] font-semibold">{fmt(totalCost)}</td>
              <td className="px-4 py-2 text-right text-[#4d7eff] font-semibold">{fmt(totalPrice)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'preact/hooks'
import { fetchRecipeLines, fetchRecipeRules, fetchRecipeStages } from '../api.ts'
import { fmt, fmtISK } from '../utils.ts'
import type { Recipe, RecipeLine, RecipeRule, RecipeStage, DraftLine } from '../types.ts'

interface Props {
  recipe: Recipe
  onAdd:  (lines: DraftLine[]) => void
  onBack: () => void
}

const BADGE: Record<string, string> = {
  SS: 'bg-blue-950 text-blue-300 border border-blue-800',
  SV: 'bg-orange-950 text-orange-300 border border-orange-800',
  DS: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
  DP: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
}

export default function RecipeWizard({ recipe, onAdd, onBack }: Props) {
  const [lines,   setLines]   = useState<RecipeLine[]>([])
  const [rules,   setRules]   = useState<RecipeRule[]>([])
  const [stages,  setStages]  = useState<RecipeStage[]>([])
  const [stageIdx, setStageIdx] = useState(0)
  const [qtys,    setQtys]    = useState<Record<number, number>>({})
  const [enabled, setEnabled] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchRecipeLines(recipe.id),
      fetchRecipeRules(recipe.id),
      fetchRecipeStages(recipe.id),
    ])
      .then(([ls, rs, ss]) => {
        setLines(ls)
        setRules(rs)
        setStages(ss)
        setStageIdx(0)
        const initQtys: Record<number, number>  = {}
        const initEnabled: Record<number, boolean> = {}
        ls.forEach(l => {
          initQtys[l.id]    = l.default_qty
          initEnabled[l.id] = !l.is_optional
        })
        setQtys(initQtys)
        setEnabled(initEnabled)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [recipe.id])

  function handleQtyChange(lineId: number, qty: number) {
    setQtys(prev => {
      const next = { ...prev, [lineId]: qty }
      rules.filter(r => r.trigger_line_id === lineId && r.rule_type === 'multiplies').forEach(r => {
        next[r.target_line_id] = qty * (r.qty_multiplier ?? 1)
      })
      return next
    })
  }

  function handleToggle(lineId: number, on: boolean) {
    setEnabled(prev => {
      const next = { ...prev, [lineId]: on }
      rules.filter(r => r.trigger_line_id === lineId && r.rule_type === 'requires').forEach(r => {
        if (on) next[r.target_line_id] = true
      })
      // 'excludes' is symmetric: enabling this line forces its exclusion
      // counterparts off, whichever side of the rule they sit on.
      if (on) {
        rules.filter(r => r.rule_type === 'excludes').forEach(r => {
          if (r.trigger_line_id === lineId) next[r.target_line_id] = false
          if (r.target_line_id === lineId) next[r.trigger_line_id] = false
        })
      }
      return next
    })
  }

  // Line is blocked when an 'excludes' counterpart is currently enabled.
  function excludedBy(lineId: number): RecipeLine | null {
    for (const r of rules) {
      if (r.rule_type !== 'excludes') continue
      const otherId = r.trigger_line_id === lineId
        ? r.target_line_id
        : r.target_line_id === lineId
        ? r.trigger_line_id
        : null
      if (otherId !== null && enabled[otherId]) {
        return lines.find(l => l.id === otherId) ?? null
      }
    }
    return null
  }

  function handleAdd() {
    const draftLines: DraftLine[] = lines
      .filter(l => enabled[l.id] && !excludedBy(l.id))
      .map(l => ({
        key:             `w${recipe.id}-${l.id}`,
        part_id:         l.part_id,
        plm_part_number: l.plm_part_number,
        description:     l.description,
        bom_type:        l.bom_type,
        production_type: l.production_type,
        quantity:        qtys[l.id] ?? l.default_qty,
        unit_cost:       l.unit_cost,
        unit_price:      l.unit_price,
        currency:        l.currency,
        source:          'recipe' as const,
        recipe_name:     recipe.name,
      }))
    onAdd(draftLines)
  }

  const activeCost  = lines.filter(l => enabled[l.id]).reduce((s, l) => s + (qtys[l.id] ?? 0) * l.unit_cost,  0)
  const activePrice = lines.filter(l => enabled[l.id]).reduce((s, l) => s + (qtys[l.id] ?? 0) * l.unit_price, 0)

  // Stage stepper: rules keep whole-recipe state; the UI walks one stage at a
  // time. Lines with stage_id NULL belong to the first stage. Single-stage
  // recipes render exactly as before (no stepper chrome).
  const multiStage = stages.length > 1
  const stageLines = multiStage
    ? lines.filter(l => (l.stage_id ?? stages[0]?.id) === stages[stageIdx]?.id)
    : lines
  const isLastStage = !multiStage || stageIdx === stages.length - 1

  const required = stageLines.filter(l => !l.is_optional)
  const optional = stageLines.filter(l =>  l.is_optional)

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-xs text-[#7880a0] hover:text-[#e4e6f0] mb-2">← Back to recipes</button>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">{recipe.name}</h2>
          {recipe.description && <p className="text-sm text-[#7880a0] mt-0.5">{recipe.description}</p>}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
      )}
      {loading && <p className="text-sm text-[#454c6a] py-8 text-center">Loading recipe…</p>}

      {!loading && !error && multiStage && (
        <div className="flex items-center gap-2 text-xs font-mono">
          {stages.map((s, i) => (
            <span key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => setStageIdx(i)}
                className={`px-2 py-1 rounded border transition-colors ${
                  i === stageIdx
                    ? 'border-[#4d7eff] text-[#e4e6f0] bg-[#4d7eff]/10'
                    : i < stageIdx
                    ? 'border-[#2e3348] text-[#4d7eff]'
                    : 'border-[#2e3348] text-[#454c6a]'
                }`}
              >
                {i + 1}. {s.name}
              </button>
              {i < stages.length - 1 && <span className="text-[#2e3348]">→</span>}
            </span>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {required.length > 0 && (
            <section>
              <p className="text-xs text-[#7880a0] uppercase tracking-widest font-mono mb-2">Required</p>
              <div className="rounded border border-[#2e3348] divide-y divide-[#2e3348]">
                {required.map(l => (
                  <LineRow key={l.id} line={l} qty={qtys[l.id] ?? l.default_qty}
                    enabled={true} locked={true}
                    onQtyChange={q => handleQtyChange(l.id, q)} onToggle={() => {}} />
                ))}
              </div>
            </section>
          )}

          {optional.length > 0 && (
            <section>
              <p className="text-xs text-[#7880a0] uppercase tracking-widest font-mono mb-2">Optional — include?</p>
              <div className="rounded border border-[#2e3348] divide-y divide-[#2e3348]">
                {optional.map(l => {
                  const isOn = !!enabled[l.id]
                  const rule = rules.find(r => r.target_line_id === l.id && r.rule_type === 'requires')
                  const forcedBy = rule ? lines.find(tl => tl.id === rule.trigger_line_id) : null
                  const excluder = excludedBy(l.id)
                  return (
                    <LineRow key={l.id} line={l} qty={qtys[l.id] ?? l.default_qty}
                      enabled={isOn && !excluder} locked={!!(forcedBy && enabled[forcedBy.id])}
                      forcedByLabel={forcedBy ? forcedBy.plm_part_number : undefined}
                      excludedByLabel={excluder ? excluder.plm_part_number : undefined}
                      onQtyChange={q => handleQtyChange(l.id, q)}
                      onToggle={on => handleToggle(l.id, on)} />
                  )
                })}
              </div>
            </section>
          )}

          {required.length === 0 && optional.length === 0 && (
            <p className="text-sm text-[#454c6a] py-6 text-center border border-dashed border-[#2e3348] rounded">
              No lines in this stage.
            </p>
          )}

          <div className="flex items-center justify-between border-t border-[#2e3348] pt-4">
            <div className="text-sm font-mono">
              <span className="text-[#454c6a]">Cost </span>
              <span className="text-[#e4e6f0]">{fmtISK(activeCost)}</span>
              <span className="mx-3 text-[#2e3348]">|</span>
              <span className="text-[#454c6a]">Price </span>
              <span className="text-[#4d7eff]">{fmtISK(activePrice)}</span>
              {multiStage && (
                <span className="ml-3 text-xs text-[#454c6a]">whole recipe</span>
              )}
            </div>
            <div className="flex gap-2">
              {multiStage && stageIdx > 0 && (
                <button
                  onClick={() => setStageIdx(i => i - 1)}
                  className="text-sm px-4 py-2 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] transition-colors"
                >
                  ← Back
                </button>
              )}
              {!isLastStage && (
                <button
                  onClick={() => setStageIdx(i => i + 1)}
                  className="bg-[#4d7eff] hover:bg-[#3d6eef] text-white text-sm font-medium px-5 py-2 rounded transition-colors"
                >
                  Next stage →
                </button>
              )}
              {isLastStage && (
                <button
                  onClick={handleAdd}
                  className="bg-[#4d7eff] hover:bg-[#3d6eef] text-white text-sm font-medium px-5 py-2 rounded transition-colors"
                >
                  Add to Draft →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function LineRow({
  line, qty, enabled, locked, forcedByLabel, excludedByLabel, onQtyChange, onToggle,
}: {
  line: RecipeLine; qty: number; enabled: boolean; locked: boolean
  forcedByLabel?: string
  excludedByLabel?: string
  onQtyChange: (q: number) => void
  onToggle: (on: boolean) => void
}) {
  const total = qty * (enabled ? line.unit_cost : 0)
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${enabled ? 'bg-[#1a1d27]' : 'bg-[#12141c]'}`}>
      <div className="w-5 shrink-0 flex items-center justify-center">
        {locked ? (
          <span className="text-[#7880a0] text-xs" title={forcedByLabel ? `Required by ${forcedByLabel}` : 'Required'}>⬤</span>
        ) : (
          <input type="checkbox" checked={enabled}
            disabled={!!excludedByLabel}
            onChange={e => onToggle((e.target as HTMLInputElement).checked)}
            className="accent-[#4d7eff] cursor-pointer w-4 h-4 disabled:opacity-30 disabled:cursor-not-allowed" />
        )}
      </div>

      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded leading-none shrink-0 ${
        line.bom_type === 'electrical' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
        BADGE[line.production_type ?? ''] ?? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
      }`}>
        {line.bom_type === 'electrical' ? 'ELEC' : (line.production_type ?? '—')}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${enabled ? 'text-[#e4e6f0]' : 'text-[#454c6a]'}`}>
          {line.description ?? line.plm_part_number}
        </p>
        <p className="text-xs text-[#454c6a] font-mono">{line.plm_part_number}</p>
        {forcedByLabel && !locked && enabled && (
          <p className="text-[10px] text-[#4d7eff] mt-0.5">Required by {forcedByLabel}</p>
        )}
        {excludedByLabel && (
          <p className="text-[10px] text-[#e0a555] mt-0.5">Excluded by {excludedByLabel}</p>
        )}
      </div>

      <div className="shrink-0">
        <input
          type="number" min={1} step={1} value={qty}
          onChange={e => onQtyChange(Math.max(1, Number((e.target as HTMLInputElement).value)))}
          disabled={!enabled}
          className="w-16 bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1 text-xs text-right text-[#e4e6f0] font-mono focus:outline-none focus:ring-1 focus:ring-[#4d7eff] disabled:opacity-40"
        />
      </div>

      <div className="w-28 text-right shrink-0">
        <p className={`text-xs font-mono ${enabled ? 'text-[#7880a0]' : 'text-[#2e3348]'}`}>
          {enabled ? `${fmt(total)} ISK` : '—'}
        </p>
      </div>
    </div>
  )
}

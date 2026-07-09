import '../../assets/styles.css'
import { useEffect, useState } from 'preact/hooks'
import {
  addLine,
  addRule,
  addStage,
  deleteLine,
  deleteRule,
  deleteStage,
  fetchAdminRecipe,
  fetchParts,
  patchLine,
  patchRecipe,
  patchStage,
} from '../api.ts'
import { fmt } from '../utils.ts'
import type { AdminRecipePayload, Part, RecipeRule } from '../types.ts'

interface Props {
  recipeId: number
}

const RULE_LABEL: Record<RecipeRule['rule_type'], string> = {
  requires: 'requires',
  multiplies: 'qty ×',
  excludes: 'excludes',
}

// Recipe editor — three panels: stages, lines per stage, rules.
// Every mutation hits the admin API then refetches the full payload.
export default function RecipeEditor({ recipeId }: Props) {
  const [data, setData] = useState<AdminRecipePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // line search
  const [searchStage, setSearchStage] = useState<number | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [query, setQuery] = useState('')

  // rule form
  const [ruleTrigger, setRuleTrigger] = useState(0)
  const [ruleTarget, setRuleTarget] = useState(0)
  const [ruleType, setRuleType] = useState<RecipeRule['rule_type']>('requires')
  const [ruleMult, setRuleMult] = useState(1)

  const [newStageName, setNewStageName] = useState('')

  function load() {
    fetchAdminRecipe(recipeId)
      .then(setData)
      .catch(e => setError(String(e)))
  }
  useEffect(load, [recipeId])

  useEffect(() => {
    if (searchStage === null || parts.length > 0) return
    fetchParts().then(setParts).catch(e => setError(String(e)))
  }, [searchStage])

  async function act(fn: () => Promise<unknown>) {
    setError(null)
    setNotice(null)
    try {
      await fn()
      load()
    } catch (e) {
      setError(String(e))
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0] p-8">
        {error
          ? <p className="text-sm text-[#e05555] font-mono">{error}</p>
          : <p className="text-sm text-[#454c6a]">Loading…</p>}
      </div>
    )
  }

  const { recipe, stages, lines, rules } = data
  const lineById = new Map(lines.map(l => [l.id, l]))
  const q = query.toLowerCase()
  const filtered = parts.filter(p =>
    p.plm_part_number.toLowerCase().includes(q) ||
    (p.description ?? '').toLowerCase().includes(q)
  ).slice(0, 30)

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0]">
      <header className="bg-[#1a1d27] border-b border-[#2e3348] px-6 py-3 flex items-center gap-6">
        <h1 className="text-sm font-semibold tracking-tight">Samey PLM — Recipe Creator</h1>
        <a href="/admin" className="text-xs text-[#7880a0] hover:text-[#e4e6f0]">← All recipes</a>
        <span className="ml-auto text-xs font-mono text-[#7880a0]">
          v{recipe.version} · {recipe.is_active ? 'active' : 'inactive'}
        </span>
      </header>

      <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8 pb-24">
        {/* ── Recipe meta ── */}
        <section className="flex flex-col gap-2">
          <input
            type="text" value={recipe.name}
            onChange={e => act(() => patchRecipe(recipeId, { name: (e.target as HTMLInputElement).value }))}
            className="bg-transparent text-lg font-semibold border-b border-transparent hover:border-[#2e3348] focus:border-[#4d7eff] focus:outline-none pb-1"
          />
          <input
            type="text" value={recipe.description ?? ''} placeholder="Description…"
            onChange={e => act(() => patchRecipe(recipeId, { description: (e.target as HTMLInputElement).value }))}
            className="bg-transparent text-sm text-[#7880a0] border-b border-transparent hover:border-[#2e3348] focus:border-[#4d7eff] focus:outline-none pb-1 placeholder-[#454c6a]"
          />
        </section>

        {error && (
          <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
        )}
        {notice && (
          <p className="text-sm text-[#e0a555] font-mono border border-[#e0a555]/30 bg-[#e0a555]/10 px-3 py-2 rounded">{notice}</p>
        )}

        {/* ── Stages + lines ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-[#7880a0] uppercase tracking-widest font-mono">
              Stages & lines — wizard order
            </h3>
            <form
              onSubmit={e => {
                e.preventDefault()
                if (!newStageName.trim()) return
                act(() => addStage(recipeId, newStageName.trim()))
                setNewStageName('')
              }}
              className="flex gap-2"
            >
              <input
                type="text" placeholder="New stage name…" value={newStageName}
                onInput={e => setNewStageName((e.target as HTMLInputElement).value)}
                className="bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1 text-xs placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
              />
              <button type="submit" disabled={!newStageName.trim()}
                className="text-xs px-3 py-1 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] disabled:opacity-40">
                + Stage
              </button>
            </form>
          </div>

          {stages.map((s, si) => {
            const stageLines = lines.filter(l => (l.stage_id ?? stages[0]?.id) === s.id)
            return (
              <div key={s.id} className="rounded border border-[#2e3348] overflow-hidden">
                <div className="px-4 py-2 bg-[#22263a] flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#454c6a]">STAGE {si + 1}</span>
                  <input
                    type="text" value={s.name}
                    onChange={e => act(() => patchStage(recipeId, { id: s.id, name: (e.target as HTMLInputElement).value }))}
                    className="bg-transparent text-xs font-medium text-[#e4e6f0] border-b border-transparent hover:border-[#2e3348] focus:border-[#4d7eff] focus:outline-none flex-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {si > 0 && (
                      <button title="Move up"
                        onClick={() => act(async () => {
                          const above = stages[si - 1]
                          await patchStage(recipeId, { id: s.id, sort_order: above.sort_order })
                          await patchStage(recipeId, { id: above.id, sort_order: s.sort_order })
                        })}
                        className="text-[#454c6a] hover:text-[#e4e6f0] text-xs px-1">↑</button>
                    )}
                    {si < stages.length - 1 && (
                      <button title="Move down"
                        onClick={() => act(async () => {
                          const below = stages[si + 1]
                          await patchStage(recipeId, { id: s.id, sort_order: below.sort_order })
                          await patchStage(recipeId, { id: below.id, sort_order: s.sort_order })
                        })}
                        className="text-[#454c6a] hover:text-[#e4e6f0] text-xs px-1">↓</button>
                    )}
                    <button
                      onClick={() => act(() => deleteStage(recipeId, s.id))}
                      disabled={stageLines.length > 0}
                      title={stageLines.length > 0 ? 'Stage has lines' : 'Delete stage'}
                      className="text-[#454c6a] hover:text-[#e05555] disabled:opacity-30 text-xs px-1"
                    >✕</button>
                    <button
                      onClick={() => { setSearchStage(searchStage === s.id ? null : s.id); setQuery('') }}
                      className="text-xs px-2 py-0.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] ml-2"
                    >+ Line</button>
                  </div>
                </div>

                {searchStage === s.id && (
                  <div className="px-4 py-3 bg-[#1a1d27] border-b border-[#2e3348] flex flex-col gap-2">
                    <input
                      autoFocus type="text" placeholder="Search part number or description…"
                      value={query} onInput={e => setQuery((e.target as HTMLInputElement).value)}
                      className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-1.5 text-sm placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
                    />
                    {query.length > 0 && (
                      <div className="max-h-40 overflow-y-auto divide-y divide-[#2e3348]">
                        {filtered.map(p => (
                          <button key={p.id}
                            onClick={() => {
                              act(() => addLine(recipeId, { part_id: p.id, stage_id: s.id }))
                              setSearchStage(null)
                            }}
                            className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-[#22263a] text-left">
                            <span className="font-mono text-xs text-[#4d7eff] w-44 truncate shrink-0">{p.plm_part_number}</span>
                            <span className="text-xs flex-1 truncate">{p.description ?? '—'}</span>
                            <span className="text-xs text-[#7880a0] font-mono shrink-0">{fmt(p.unit_price)} ISK</span>
                          </button>
                        ))}
                        {filtered.length === 0 && <p className="text-xs text-[#454c6a] py-2 text-center">No results</p>}
                      </div>
                    )}
                  </div>
                )}

                {stageLines.length === 0
                  ? <p className="text-xs text-[#454c6a] px-4 py-3">No lines in this stage.</p>
                  : (
                    <div className="divide-y divide-[#2e3348]">
                      {stageLines.map(l => (
                        <div key={l.id} className="flex items-center gap-3 px-4 py-2 bg-[#1a1d27]">
                          <span className="font-mono text-xs text-[#4d7eff] w-44 truncate shrink-0">{l.plm_part_number}</span>
                          <span className="text-xs flex-1 truncate">{l.description ?? '—'}</span>
                          <label className="flex items-center gap-1 text-[10px] text-[#7880a0] shrink-0">
                            qty
                            <input
                              type="number" min={0.0001} step={1} value={l.default_qty}
                              onChange={e => act(() => patchLine(recipeId, { id: l.id, default_qty: Number((e.target as HTMLInputElement).value) }))}
                              className="w-16 bg-[#0f1117] border border-[#2e3348] rounded px-1.5 py-0.5 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
                            />
                          </label>
                          <label className="flex items-center gap-1 text-[10px] text-[#7880a0] shrink-0 cursor-pointer">
                            <input
                              type="checkbox" checked={l.is_optional}
                              onChange={e => act(() => patchLine(recipeId, { id: l.id, is_optional: (e.target as HTMLInputElement).checked }))}
                              className="accent-[#4d7eff] w-3 h-3"
                            />
                            optional
                          </label>
                          {stages.length > 1 && (
                            <select
                              value={l.stage_id ?? stages[0]?.id}
                              onChange={e => act(() => patchLine(recipeId, { id: l.id, stage_id: Number((e.target as HTMLSelectElement).value) }))}
                              className="bg-[#0f1117] border border-[#2e3348] rounded px-1 py-0.5 text-[10px] text-[#7880a0] focus:outline-none shrink-0"
                            >
                              {stages.map((os, oi) => <option key={os.id} value={os.id}>stage {oi + 1}</option>)}
                            </select>
                          )}
                          <button
                            onClick={() => act(() => deleteLine(recipeId, l.id))}
                            className="text-[#454c6a] hover:text-[#e05555] text-xs px-1 shrink-0" title="Delete line (and its rules)"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )
          })}
        </section>

        {/* ── Rules ── */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs text-[#7880a0] uppercase tracking-widest font-mono">
            Rules — requires / multiplies / excludes
          </h3>

          {rules.length > 0 && (
            <div className="rounded border border-[#2e3348] divide-y divide-[#2e3348] overflow-hidden">
              {rules.map(r => {
                const trig = lineById.get(r.trigger_line_id)
                const targ = lineById.get(r.target_line_id)
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2 bg-[#1a1d27] text-xs">
                    <span className="font-mono text-[#4d7eff] truncate">{trig?.plm_part_number ?? `#${r.trigger_line_id}`}</span>
                    <span className={`font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                      r.rule_type === 'excludes'
                        ? 'bg-red-950 text-red-300 border-red-800'
                        : r.rule_type === 'multiplies'
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : 'bg-blue-950 text-blue-300 border-blue-800'
                    }`}>
                      {RULE_LABEL[r.rule_type]}{r.rule_type === 'multiplies' ? ` ${r.qty_multiplier}` : ''}
                    </span>
                    <span className="font-mono text-[#4d7eff] truncate">{targ?.plm_part_number ?? `#${r.target_line_id}`}</span>
                    <button
                      onClick={() => act(() => deleteRule(recipeId, r.id))}
                      className="ml-auto text-[#454c6a] hover:text-[#e05555] px-1 shrink-0"
                    >✕</button>
                  </div>
                )
              })}
            </div>
          )}

          {lines.length >= 2 && (
            <form
              onSubmit={e => {
                e.preventDefault()
                if (!ruleTrigger || !ruleTarget) return
                act(async () => {
                  const res = await addRule(recipeId, {
                    trigger_line_id: ruleTrigger,
                    target_line_id: ruleTarget,
                    rule_type: ruleType,
                    qty_multiplier: ruleType === 'multiplies' ? ruleMult : undefined,
                  })
                  if (res.warnings?.length) setNotice(res.warnings.join(' '))
                })
              }}
              className="rounded border border-[#2e3348] bg-[#1a1d27] p-3 flex items-center gap-2 flex-wrap text-xs"
            >
              <select value={ruleTrigger} onChange={e => setRuleTrigger(Number((e.target as HTMLSelectElement).value))}
                className="bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1 focus:outline-none">
                <option value={0}>— trigger line —</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.plm_part_number}</option>)}
              </select>
              <select value={ruleType} onChange={e => setRuleType((e.target as HTMLSelectElement).value as RecipeRule['rule_type'])}
                className="bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1 focus:outline-none">
                <option value="requires">requires</option>
                <option value="multiplies">multiplies</option>
                <option value="excludes">excludes</option>
              </select>
              {ruleType === 'multiplies' && (
                <input type="number" min={0.0001} step={0.5} value={ruleMult}
                  onInput={e => setRuleMult(Number((e.target as HTMLInputElement).value))}
                  className="w-16 bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1 text-right font-mono focus:outline-none" />
              )}
              <select value={ruleTarget} onChange={e => setRuleTarget(Number((e.target as HTMLSelectElement).value))}
                className="bg-[#0f1117] border border-[#2e3348] rounded px-2 py-1 focus:outline-none">
                <option value={0}>— target line —</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.plm_part_number}</option>)}
              </select>
              <button type="submit" disabled={!ruleTrigger || !ruleTarget || ruleTrigger === ruleTarget}
                className="px-3 py-1 rounded bg-[#4d7eff] hover:bg-[#3d6eef] text-white disabled:bg-[#2e3348] disabled:text-[#454c6a]">
                + Add Rule
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}

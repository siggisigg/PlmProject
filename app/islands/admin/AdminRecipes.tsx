import '../../assets/styles.css'
import { useEffect, useState } from 'preact/hooks'
import { createRecipe, fetchAdminRecipes, patchRecipe } from '../api.ts'
import type { AdminRecipe } from '../types.ts'

// Recipe creator — list view. Engineers manage recipes; sales consume them.
export default function AdminRecipes() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  function load() {
    fetchAdminRecipes()
      .then(setRecipes)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate(e: Event) {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const r = await createRecipe(name.trim(), description.trim() || undefined)
      location.href = `/admin/${r.id}`
    } catch (err) {
      setError(String(err))
      setCreating(false)
    }
  }

  async function toggleActive(r: AdminRecipe) {
    try {
      await patchRecipe(r.id, { is_active: !r.is_active })
      load()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0]">
      <header className="bg-[#1a1d27] border-b border-[#2e3348] px-6 py-3 flex items-center gap-6">
        <h1 className="text-sm font-semibold tracking-tight">Samey PLM — Recipe Creator</h1>
        <a href="/" className="ml-auto text-xs text-[#7880a0] hover:text-[#e4e6f0]">← Sales app</a>
      </header>

      <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Recipes</h2>
            <p className="text-sm text-[#7880a0] mt-0.5">
              Configuration templates that drive the sales wizard. Inactive recipes are hidden from sales.
            </p>
          </div>
          <button
            onClick={() => setShowNew(s => !s)}
            className="text-sm px-4 py-1.5 rounded bg-[#4d7eff] hover:bg-[#3d6eef] text-white transition-colors shrink-0"
          >
            + New Recipe
          </button>
        </div>

        {error && (
          <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
        )}

        {showNew && (
          <form onSubmit={handleCreate} className="rounded border border-[#2e3348] bg-[#1a1d27] p-4 flex flex-col gap-3">
            <input
              autoFocus type="text" placeholder="Recipe name (e.g. SBPC-2LD — 8P Wide)"
              value={name} onInput={e => setName((e.target as HTMLInputElement).value)}
              className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-2 text-sm placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
            />
            <input
              type="text" placeholder="Description (optional)"
              value={description} onInput={e => setDescription((e.target as HTMLInputElement).value)}
              className="w-full bg-[#0f1117] border border-[#2e3348] rounded px-3 py-2 text-sm placeholder-[#454c6a] focus:outline-none focus:ring-1 focus:ring-[#4d7eff]"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)}
                className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0]">
                Cancel
              </button>
              <button type="submit" disabled={!name.trim() || creating}
                className={`text-sm font-medium px-5 py-1.5 rounded ${
                  name.trim() && !creating ? 'bg-[#4d7eff] hover:bg-[#3d6eef] text-white' : 'bg-[#2e3348] text-[#454c6a] cursor-not-allowed'
                }`}>
                {creating ? 'Creating…' : 'Create & Edit →'}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-sm text-[#454c6a] py-8 text-center">Loading…</p>}

        {!loading && recipes.length > 0 && (
          <div className="rounded border border-[#2e3348] divide-y divide-[#2e3348] overflow-hidden">
            {recipes.map(r => (
              <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${r.is_active ? 'bg-[#1a1d27]' : 'bg-[#12141c] opacity-70'}`}>
                <a href={`/admin/${r.id}`} className="flex-1 min-w-0 group">
                  <p className="text-sm font-medium group-hover:text-[#4d7eff] transition-colors truncate">{r.name}</p>
                  {r.description && <p className="text-xs text-[#7880a0] truncate">{r.description}</p>}
                </a>
                <span className="text-xs text-[#454c6a] font-mono shrink-0">
                  {r.stage_count ?? 0} stage{(r.stage_count ?? 0) !== 1 ? 's' : ''} · {r.line_count ?? 0} line{(r.line_count ?? 0) !== 1 ? 's' : ''} · v{r.version}
                </span>
                <button
                  onClick={() => toggleActive(r)}
                  className={`text-[10px] font-mono px-2 py-1 rounded border shrink-0 transition-colors ${
                    r.is_active
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:border-emerald-600'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}
                  title={r.is_active ? 'Deactivate (hide from sales)' : 'Activate'}
                >
                  {r.is_active ? 'ACTIVE' : 'INACTIVE'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

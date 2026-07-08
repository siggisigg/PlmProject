import { useEffect, useState } from 'preact/hooks'
import { fetchRecipes } from '../api.ts'
import { robotSvg } from '../utils.ts'
import type { Recipe } from '../types.ts'

interface Props {
  onPickRecipe:  (recipe: Recipe) => void
  onSkipToManual: () => void
  draftCount:    number
}

export default function RecipeCatalog({ onPickRecipe, onSkipToManual, draftCount }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#e4e6f0]">Select a Recipe</h2>
          <p className="text-sm text-[#7880a0] mt-0.5">
            Choose a system configuration template to start your project.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {draftCount > 0 && (
            <button
              onClick={onSkipToManual}
              className="text-sm px-4 py-1.5 rounded border border-[#4d7eff]/40 text-[#4d7eff] hover:bg-[#4d7eff]/10 transition-colors"
            >
              Resume Draft ({draftCount} lines)
            </button>
          )}
          <button
            onClick={onSkipToManual}
            className="text-sm px-4 py-1.5 rounded border border-[#2e3348] text-[#7880a0] hover:text-[#e4e6f0] hover:border-[#2e3348] transition-colors"
          >
            Manual Build
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
      )}
      {loading && <p className="text-sm text-[#454c6a] py-8 text-center">Loading recipes…</p>}

      {!loading && !error && recipes.length === 0 && (
        <div className="border border-dashed border-[#2e3348] rounded px-6 py-12 text-center">
          <p className="text-sm text-[#454c6a]">No active recipes found. Use Manual Build or ask an admin to create recipes.</p>
        </div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recipes.map((r, i) => (
            <button
              key={r.id}
              onClick={() => onPickRecipe(r)}
              className="text-left rounded border border-[#2e3348] bg-[#1a1d27] hover:border-[#4d7eff]/50 hover:bg-[#1e2235] transition-colors overflow-hidden group"
            >
              <img
                src={robotSvg(i)}
                alt=""
                className="w-full h-32 object-cover"
              />
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-[#e4e6f0] group-hover:text-white transition-colors">{r.name}</p>
                {r.description && (
                  <p className="text-xs text-[#7880a0] mt-1 line-clamp-2">{r.description}</p>
                )}
                <p className="text-xs text-[#454c6a] font-mono mt-2">v{r.version}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

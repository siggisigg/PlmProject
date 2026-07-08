import { useEffect, useState } from 'react'
import { fetchRecipes } from '../api'
import { robotSvg } from '../utils'
import type { Recipe } from '../types'

interface Props {
  onPickRecipe:   (recipe: Recipe) => void
  onSkipToManual: () => void
  draftCount:     number
}

export default function RecipeCatalog({ onPickRecipe, onSkipToManual, draftCount }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchRecipes()
      .then(setRecipes)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-[#e4e6f0]">Select a Recipe</h2>
        <p className="text-sm text-[#7880a0] mt-0.5">
          A recipe guides you through configuring a valid system. Choose one below, or skip to build manually.
        </p>
      </div>

      {error && (
        <p className="text-sm text-[#e05555] font-mono border border-[#e05555]/30 bg-[#e05555]/10 px-3 py-2 rounded">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-[#454c6a] text-center py-12">Loading recipes…</p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recipes.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => onPickRecipe(r)}
              className="text-left rounded border border-[#2e3348] hover:border-[#4d7eff]/60 bg-[#1a1d27] hover:bg-[#1e2233] transition-all overflow-hidden group"
            >
              <img
                src={robotSvg(idx)}
                alt={r.name}
                className="w-full aspect-video object-cover"
              />
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-[#e4e6f0] group-hover:text-white leading-snug">{r.name}</p>
                {r.description && (
                  <p className="text-xs text-[#7880a0] mt-1 leading-relaxed line-clamp-2">{r.description}</p>
                )}
                <p className="text-xs text-[#4d7eff] mt-2 font-medium">Configure →</p>
              </div>
            </button>
          ))}

          {/* Manual build option */}
          <button
            onClick={onSkipToManual}
            className="text-left rounded border border-dashed border-[#2e3348] hover:border-[#7880a0] bg-transparent hover:bg-[#1a1d27] transition-all p-6 flex flex-col items-center justify-center gap-2 text-[#454c6a] hover:text-[#7880a0]"
          >
            <span className="text-2xl">＋</span>
            <span className="text-sm font-medium">Manual Build</span>
            <span className="text-xs text-center">Add parts directly without a recipe</span>
          </button>
        </div>
      )}

      {/* Shortcut back to draft if one is in progress */}
      {draftCount > 0 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-[#7880a0]">
            You have an active draft ({draftCount} lines).{' '}
            <button onClick={onSkipToManual} className="text-[#4d7eff] underline">
              Return to draft
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

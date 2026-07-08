import type { Part, Recipe, RecipeLine, RecipeRule } from './types.ts'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

export const fetchParts = (q?: string): Promise<Part[]> =>
  get(`/parts${q ? `?q=${encodeURIComponent(q)}&limit=600` : '?limit=600'}`)

export const fetchRecipes = (): Promise<Recipe[]> =>
  get('/recipes')

export const fetchRecipeLines = (recipeId: number): Promise<RecipeLine[]> =>
  get(`/recipe-lines/${recipeId}`)

export const fetchRecipeRules = (recipeId: number): Promise<RecipeRule[]> =>
  get(`/recipe-rules/${recipeId}`)

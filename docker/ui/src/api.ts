import type { Part, Recipe, RecipeLine, RecipeRule } from './types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`PostgREST ${res.status}: ${path}`)
  return res.json()
}

export const fetchParts = (): Promise<Part[]> =>
  get('/parts_with_cost?order=plm_part_number&limit=600')

export const fetchRecipes = (): Promise<Recipe[]> =>
  get('/recipes?is_active=eq.true&order=name')

export const fetchRecipeLines = (recipeId: number): Promise<RecipeLine[]> =>
  get(`/recipe_lines_detail?recipe_id=eq.${recipeId}&order=sort_order`)

export const fetchRecipeRules = (recipeId: number): Promise<RecipeRule[]> =>
  get(`/recipe_rules?recipe_id=eq.${recipeId}`)

import type {
  AdminRecipe,
  AdminRecipePayload,
  DraftDetailRow,
  DraftLine,
  Part,
  Project,
  ProjectBomResponse,
  Recipe,
  RecipeLine,
  RecipeRule,
  RecipeStage,
} from './types.ts'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${path}${detail ? ` — ${detail}` : ''}`)
  }
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

export const fetchRecipeStages = (recipeId: number): Promise<RecipeStage[]> =>
  get(`/recipe-stages/${recipeId}`)

// ── Projects ────────────────────────────────────────────────────────────────

export const fetchProjects = (): Promise<Project[]> =>
  get('/projects')

export const createProject = (name: string, solutionCode?: string): Promise<Project> =>
  send('POST', '/projects', { name, solution_code: solutionCode })

export const fetchDraft = (projectId: number): Promise<DraftDetailRow[]> =>
  get(`/projects/${projectId}/draft`)

export const saveDraft = (projectId: number, lines: DraftLine[]): Promise<{ saved: number }> =>
  send('PUT', `/projects/${projectId}/draft`, {
    lines: lines.map((l, i) => ({
      part_id: l.part_id,
      quantity: l.quantity,
      source: l.source,
      recipe_instance_id: l.recipe_instance_id ?? null,
      sort_order: (i + 1) * 10,
    })),
  })

export const completeProject = (projectId: number): Promise<{
  snapshot_lines: number
  leaf_lines: number
  assembly_lines: number
  warnings: string[]
}> => send('POST', `/projects/${projectId}/complete`)

export const fetchProjectBom = (projectId: number): Promise<ProjectBomResponse> =>
  get(`/projects/${projectId}/bom`)

// ── Admin: recipe creator ───────────────────────────────────────────────────

export const fetchAdminRecipes = (): Promise<AdminRecipe[]> =>
  get('/admin/recipes')

export const createRecipe = (name: string, description?: string): Promise<AdminRecipe> =>
  send('POST', '/admin/recipes', { name, description })

export const fetchAdminRecipe = (id: number): Promise<AdminRecipePayload> =>
  get(`/admin/recipes/${id}`)

export const patchRecipe = (
  id: number,
  patch: { name?: string; description?: string; is_active?: boolean },
): Promise<AdminRecipe> => send('PATCH', `/admin/recipes/${id}`, patch)

export const addStage = (recipeId: number, name: string): Promise<RecipeStage> =>
  send('POST', `/admin/recipes/${recipeId}/stages`, { name })

export const patchStage = (
  recipeId: number,
  patch: { id: number; name?: string; sort_order?: number },
): Promise<RecipeStage> => send('PATCH', `/admin/recipes/${recipeId}/stages`, patch)

export const deleteStage = (recipeId: number, id: number): Promise<{ deleted: number }> =>
  send('DELETE', `/admin/recipes/${recipeId}/stages`, { id })

export const addLine = (
  recipeId: number,
  line: { part_id: number; stage_id?: number; default_qty?: number; is_optional?: boolean },
): Promise<RecipeLine> => send('POST', `/admin/recipes/${recipeId}/lines`, line)

export const patchLine = (
  recipeId: number,
  patch: { id: number; default_qty?: number; is_optional?: boolean; sort_order?: number; stage_id?: number },
): Promise<RecipeLine> => send('PATCH', `/admin/recipes/${recipeId}/lines`, patch)

export const deleteLine = (recipeId: number, id: number): Promise<{ deleted: number }> =>
  send('DELETE', `/admin/recipes/${recipeId}/lines`, { id })

export const addRule = (
  recipeId: number,
  rule: {
    trigger_line_id: number
    target_line_id: number
    rule_type: 'requires' | 'multiplies' | 'excludes'
    qty_multiplier?: number
  },
): Promise<RecipeRule & { warnings: string[] }> =>
  send('POST', `/admin/recipes/${recipeId}/rules`, rule)

export const deleteRule = (recipeId: number, id: number): Promise<{ deleted: number }> =>
  send('DELETE', `/admin/recipes/${recipeId}/rules`, { id })

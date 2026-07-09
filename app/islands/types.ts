export interface Part {
  id: number
  plm_part_number: string
  description: string | null
  material: string | null
  production_type: string | null
  manufacturer: string | null
  is_assembly: boolean
  is_master_assembly: boolean
  bom_type: string
  revision: string | null
  unit_cost: number
  unit_price: number
  installation_cost: number
  currency: string
}

export interface Recipe {
  id: number
  name: string
  description: string | null
  version: number
  is_active: boolean
}

export interface RecipeLine {
  id: number
  recipe_id: number
  part_id: number
  bom_type: string
  default_qty: number
  is_optional: boolean
  sort_order: number | null
  stage_id?: number | null
  plm_part_number: string
  description: string | null
  is_assembly: boolean
  production_type: string | null
  unit_cost: number
  unit_price: number
  currency: string
}

export interface RecipeStage {
  id: number
  recipe_id: number
  name: string
  sort_order: number
}

export interface AdminRecipe extends Recipe {
  created_at?: string
  updated_at?: string
  line_count?: number
  stage_count?: number
}

export interface AdminRecipePayload {
  recipe: AdminRecipe
  stages: RecipeStage[]
  lines: RecipeLine[]
  rules: RecipeRule[]
}

export interface RecipeRule {
  id: number
  recipe_id: number
  trigger_line_id: number
  target_line_id: number
  rule_type: 'requires' | 'multiplies' | 'excludes'
  qty_multiplier: number | null
}

export interface DraftLine {
  key: string
  id?: number // project_draft_lines.id once persisted
  part_id: number
  plm_part_number: string
  description: string | null
  bom_type: string
  production_type: string | null
  quantity: number
  unit_cost: number
  unit_price: number
  currency: string
  source: 'recipe' | 'manual'
  recipe_instance_id?: number
  recipe_name?: string
}

export interface Project {
  id: number
  name: string
  solution_code: string | null
  status: 'draft' | 'complete'
  created_at: string
  updated_at: string
  draft_count?: number
}

// Row of project_draft_detail (GET /api/projects/:id/draft)
export interface DraftDetailRow {
  id: number
  project_id: number
  part_id: number
  quantity: number
  source: 'recipe' | 'manual'
  recipe_instance_id: number | null
  sort_order: number | null
  plm_part_number: string
  description: string | null
  is_assembly: boolean
  production_type: string | null
  bom_type: string
  unit_cost: number
  unit_price: number
  currency: string
}

// Frozen snapshot row (GET /api/projects/:id/bom).
// Assembly rows carry NULL snapshot money; rolled_* are read-time rollups.
export interface ProjectBomLine {
  id: number
  project_id: number
  part_id: number
  effective_qty: number
  snapshot_unit_cost: number | null
  snapshot_unit_price: number | null
  snapshot_installation_cost: number | null
  currency: string
  source: string | null
  snapshotted_at: string
  plm_part_number: string
  description: string | null
  production_type: string | null
  bom_type: string
  parent_line_id: number | null
  is_assembly: boolean
  level_path: string | null
  sort_order: number | null
  rolled_cost: number | null
  rolled_price: number | null
  rolled_installation: number | null
}

export interface ProjectBomResponse {
  project: Project
  lines: ProjectBomLine[]
  totals: {
    total_cost: number | null
    total_price: number | null
    total_installation: number | null
  }
}

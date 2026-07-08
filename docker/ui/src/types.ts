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
  // joined from parts + part_revisions
  plm_part_number: string
  description: string | null
  is_assembly: boolean
  production_type: string | null
  unit_cost: number
  unit_price: number
  currency: string
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
  key: string                  // stable React key: `r${instanceId}-${line.id}` or `m-${part.id}-${ts}`
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

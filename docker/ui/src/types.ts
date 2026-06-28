export interface Part {
  id: number
  plm_part_number: string
  description: string | null
  material: string | null
  production_type: string | null
  manufacturer: string | null
  is_assembly: boolean
  revision: string | null
  unit_cost: number
  unit_price: number
  currency: string
}

export interface BomLine {
  part: Part
  qty: number
}

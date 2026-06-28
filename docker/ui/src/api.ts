import type { Part } from './types'

const BASE = '/api'

export async function fetchParts(search: string, typeFilter: string): Promise<Part[]> {
  const params = new URLSearchParams()
  params.set('order', 'plm_part_number')
  params.set('limit', '500')

  if (typeFilter) {
    params.set('production_type', `eq.${typeFilter}`)
  }
  if (search.trim()) {
    // PostgREST full-text ilike on two columns via "or" filter
    params.set('or', `(plm_part_number.ilike.*${search}*,description.ilike.*${search}*)`)
  }

  const res = await fetch(`${BASE}/parts_with_cost?${params}`)
  if (!res.ok) throw new Error(`PostgREST error ${res.status}`)
  return res.json()
}

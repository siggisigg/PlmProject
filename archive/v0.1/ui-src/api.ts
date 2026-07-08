import type { Part } from './types'

const BASE = '/api'

export async function fetchAllParts(): Promise<Part[]> {
  const res = await fetch(`${BASE}/parts_with_cost?order=plm_part_number&limit=600`)
  if (!res.ok) throw new Error(`PostgREST error ${res.status}`)
  return res.json()
}

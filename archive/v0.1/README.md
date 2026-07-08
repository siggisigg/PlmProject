# v0.1 Archive — PLM Demo

**Archived:** 2026-07-07  
**Config:** `config-01-single-blended` — single currency (ISK), blended cost, no BOM hierarchy

## What this was

First working demo. Proved out the core data flow:
- PostgreSQL + PostgREST + React/Vite stack
- Parts catalog with cost/price (seeded from SR-SBPC-2LD-6P-6POC-EPC BOM)
- Two-step UX: ① Select Systems (assembly cards) → ② Review BOM (edit quantities, export CSV)
- Inline SVG robot arm schematics as assembly card images

## What was NOT in v0.1

- No BOM hierarchy (`bom_headers` / `bom_lines`)
- No recipe system
- No project snapshot (`project_bom_lines`)
- No draft BOM (`project_draft_lines`)
- Assembly selection was a raw parts list, not recipe-guided

## To run (reference only)

```
cd db/
docker compose --env-file ../../.env up -d
```

UI served on port 5173, PostgREST on 3001, PostgreSQL on 5432.

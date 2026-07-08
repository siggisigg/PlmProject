-- Installation cost (per-line, Option A) — additive migration, safe to re-run.
-- NULL = no installation cost defined yet for this part.
-- Populated via admin UI; not present in any ingest source.
ALTER TABLE part_revisions
    ADD COLUMN IF NOT EXISTS installation_cost NUMERIC(14,4);

-- Frozen at project-creation time alongside snapshot_unit_cost / snapshot_unit_price.
ALTER TABLE project_bom_lines
    ADD COLUMN IF NOT EXISTS snapshot_installation_cost NUMERIC(14,4);

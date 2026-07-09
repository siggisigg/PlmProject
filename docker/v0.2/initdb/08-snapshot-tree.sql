-- Snapshot as a full frozen tree — additive migration, safe to re-run.
--
-- project_bom_lines now stores the ENTIRE expanded hierarchy at completion
-- time: assembly rows, sub-assemblies, and leaf parts, wired by parent_line_id.
-- Convention:
--   * Assembly rows (is_assembly = true) are structural: snapshot money is NULL.
--   * Only leaf rows (is_assembly = false) carry snapshot_unit_cost /
--     snapshot_unit_price / snapshot_installation_cost.
--   * Rollups are computed on read (project_bom_rollup view) — never stored.
--
-- Apply to a running DB with:
--   docker exec -i v02-db-1 psql -U plm -d plm < docker/v0.2/initdb/08-snapshot-tree.sql

ALTER TABLE project_bom_lines
    ADD COLUMN IF NOT EXISTS parent_line_id INTEGER REFERENCES project_bom_lines (id),
    ADD COLUMN IF NOT EXISTS is_assembly    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS level_path     TEXT,
    ADD COLUMN IF NOT EXISTS sort_order     INTEGER;

CREATE INDEX IF NOT EXISTS project_bom_lines_parent_idx ON project_bom_lines (parent_line_id);

-- Guarded CHECK: assembly rows must not carry money.
DO $$
BEGIN
  ALTER TABLE project_bom_lines
    ADD CONSTRAINT project_bom_lines_assembly_no_money
    CHECK (NOT is_assembly OR (snapshot_unit_cost IS NULL AND snapshot_unit_price IS NULL));
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already applied
END $$;

-- ── Views ───────────────────────────────────────────────────────────────────
-- Same as 03-views.sql definition with tree + installation columns appended
-- (CREATE OR REPLACE requires existing columns keep name/order — only append).
CREATE OR REPLACE VIEW public.project_bom_detail AS
SELECT
    bl.id,
    bl.project_id,
    bl.part_id,
    bl.effective_qty,
    bl.snapshot_unit_cost,
    bl.snapshot_unit_price,
    bl.currency,
    bl.source,
    bl.snapshotted_at,
    p.plm_part_number,
    p.description,
    p.production_type,
    p.bom_type,
    bl.snapshot_installation_cost,
    bl.parent_line_id,
    bl.is_assembly,
    bl.level_path,
    bl.sort_order
FROM project_bom_lines bl
JOIN parts p ON p.id = bl.part_id;

-- Per-row subtree rollup over the FROZEN snapshot (reads no live costs).
-- For leaf rows this equals the row's own extended values; for assembly rows
-- it is the sum over all leaf descendants. Margin derived on read, never stored.
CREATE OR REPLACE VIEW public.project_bom_rollup AS
WITH RECURSIVE sub AS (
  SELECT id AS root_id, id, effective_qty, snapshot_unit_cost, snapshot_unit_price,
         snapshot_installation_cost, is_assembly
  FROM project_bom_lines
  UNION ALL
  SELECT s.root_id, c.id, c.effective_qty, c.snapshot_unit_cost, c.snapshot_unit_price,
         c.snapshot_installation_cost, c.is_assembly
  FROM project_bom_lines c
  JOIN sub s ON c.parent_line_id = s.id
)
SELECT root_id AS id,
       SUM(effective_qty * snapshot_unit_cost)         FILTER (WHERE NOT is_assembly) AS rolled_cost,
       SUM(effective_qty * snapshot_unit_price)        FILTER (WHERE NOT is_assembly) AS rolled_price,
       SUM(effective_qty * snapshot_installation_cost) FILTER (WHERE NOT is_assembly) AS rolled_installation
FROM sub
GROUP BY root_id;

-- ── Grants (mirrors 04-postgrest-role.sql) ─────────────────────────────────
GRANT SELECT ON recipe_stages, project_bom_rollup TO anon;
GRANT SELECT ON project_bom_detail TO anon;  -- re-grant after REPLACE (no-op if kept)

-- Snapshot immutability — DB-level guard, safe to re-run.
--
-- project_bom_lines is a frozen financial record (10-year accuracy rule).
-- INSERTs happen while the project is still 'draft' (status flips to
-- 'complete' in the same transaction, after the inserts), so this trigger
-- never blocks snapshot creation. UPDATE/DELETE are never legitimate:
-- corrections require a new project.
--
-- Dev escape hatch (superuser only, use with care):
--   ALTER TABLE project_bom_lines DISABLE TRIGGER project_bom_lines_immutable;
--
-- Apply to a running DB with:
--   docker exec -i v02-db-1 psql -U plm -d plm < docker/v0.2/initdb/09-snapshot-immutable.sql

CREATE OR REPLACE FUNCTION block_snapshot_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'project_bom_lines is an immutable snapshot (project %). Corrections require a new project.',
    COALESCE(OLD.project_id, NEW.project_id);
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_bom_lines_immutable ON project_bom_lines;
CREATE TRIGGER project_bom_lines_immutable
  BEFORE UPDATE OR DELETE ON project_bom_lines
  FOR EACH ROW EXECUTE FUNCTION block_snapshot_mutation();

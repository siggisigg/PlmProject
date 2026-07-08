-- PostgREST anon role — read-only on catalog, read-write on projects/drafts
CREATE ROLE anon NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon;

-- Read-only catalog
GRANT SELECT ON parts, part_revisions, parts_with_cost TO anon;
GRANT SELECT ON bom_headers, bom_lines TO anon;
GRANT SELECT ON recipes, recipe_lines, recipe_lines_detail TO anon;
GRANT SELECT ON recipe_rules TO anon;

-- Project lifecycle (create project, build draft, complete BOM)
GRANT SELECT, INSERT, UPDATE ON projects TO anon;
GRANT SELECT, INSERT, DELETE ON project_draft_lines TO anon;
GRANT SELECT, INSERT ON project_bom_lines TO anon;
GRANT SELECT ON project_draft_detail, project_bom_detail TO anon;

-- Sequences needed for INSERT
GRANT USAGE ON SEQUENCE
  projects_id_seq,
  project_draft_lines_id_seq,
  project_bom_lines_id_seq
TO anon;

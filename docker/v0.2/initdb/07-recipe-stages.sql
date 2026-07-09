-- Recipe stages — sequential wizard steps within a recipe. Additive, safe to re-run.
-- Lines with stage_id NULL are treated as belonging to the first stage.
--
-- Apply to a running DB with:
--   docker exec -i v02-db-1 psql -U plm -d plm < docker/v0.2/initdb/07-recipe-stages.sql

CREATE TABLE IF NOT EXISTS recipe_stages (
    id         SERIAL PRIMARY KEY,
    recipe_id  INTEGER NOT NULL REFERENCES recipes (id),
    name       TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS recipe_stages_recipe_idx ON recipe_stages (recipe_id);

ALTER TABLE recipe_lines
    ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES recipe_stages (id);

-- Backfill: one default stage per recipe, attach any unstaged lines to it.
INSERT INTO recipe_stages (recipe_id, name, sort_order)
SELECT r.id, 'Configuration', 0
FROM recipes r
WHERE NOT EXISTS (SELECT 1 FROM recipe_stages s WHERE s.recipe_id = r.id);

UPDATE recipe_lines rl
SET stage_id = s.id
FROM recipe_stages s
WHERE rl.stage_id IS NULL AND s.recipe_id = rl.recipe_id;

-- ── Demo data: give 'SBPC-2LD — 6P Standard' two real stages ───────────────
-- Lives here (not 02-seed.sql) so fresh-volume lexical ordering works:
-- 02 runs before recipe_stages exists; 07 runs after both schema and seed.
DO $$
DECLARE
  r1 INTEGER;
  stage_core INTEGER;
  stage_conv INTEGER;
BEGIN
  SELECT id INTO r1 FROM recipes WHERE name = 'SBPC-2LD — 6P Standard';
  IF r1 IS NULL THEN RETURN; END IF;                       -- seed not present
  IF (SELECT count(*) FROM recipe_stages WHERE recipe_id = r1) <> 1 THEN
    RETURN;                                                -- already staged
  END IF;

  -- Rename the backfilled default stage → stage 1
  UPDATE recipe_stages SET name = 'Core system', sort_order = 10
  WHERE recipe_id = r1
  RETURNING id INTO stage_core;

  -- Stage 2
  INSERT INTO recipe_stages (recipe_id, name, sort_order)
  VALUES (r1, 'Conveyors & electrical', 20)
  RETURNING id INTO stage_conv;

  -- Move conveyor + electrical lines to stage 2
  UPDATE recipe_lines rl SET stage_id = stage_conv
  FROM parts p
  WHERE rl.recipe_id = r1 AND p.id = rl.part_id
    AND p.plm_part_number IN ('SR-6POC', 'SR-EPC-PUOE-6500', 'SR-EC-STD');
END $$;

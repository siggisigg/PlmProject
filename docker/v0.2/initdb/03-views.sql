-- v0.2 PostgREST views

-- Parts with current revision cost/price (same as v0.1)
CREATE VIEW public.parts_with_cost AS
SELECT
    p.id,
    p.plm_part_number,
    p.description,
    p.material,
    p.production_type,
    p.manufacturer,
    p.is_assembly,
    p.is_master_assembly,
    p.bom_type,
    r.revision,
    COALESCE(r.unit_cost,  0) AS unit_cost,
    COALESCE(r.unit_price, 0) AS unit_price,
    COALESCE(r.currency, 'ISK') AS currency
FROM parts p
LEFT JOIN part_revisions r ON r.part_id = p.id AND r.valid_to IS NULL;

-- Recipe lines joined with part info — used by the recipe wizard
CREATE VIEW public.recipe_lines_detail AS
SELECT
    rl.id,
    rl.recipe_id,
    rl.part_id,
    rl.bom_type,
    rl.default_qty,
    rl.is_optional,
    rl.sort_order,
    p.plm_part_number,
    p.description,
    p.is_assembly,
    p.production_type,
    COALESCE(r.unit_cost,  0) AS unit_cost,
    COALESCE(r.unit_price, 0) AS unit_price,
    COALESCE(r.currency, 'ISK') AS currency
FROM recipe_lines rl
JOIN  parts p ON p.id = rl.part_id
LEFT JOIN part_revisions r ON r.part_id = p.id AND r.valid_to IS NULL;

-- Project draft lines joined with part info — used by the draft editor
CREATE VIEW public.project_draft_detail AS
SELECT
    dl.id,
    dl.project_id,
    dl.part_id,
    dl.quantity,
    dl.source,
    dl.recipe_instance_id,
    dl.sort_order,
    dl.added_at,
    p.plm_part_number,
    p.description,
    p.is_assembly,
    p.production_type,
    p.bom_type,
    COALESCE(r.unit_cost,  0) AS unit_cost,
    COALESCE(r.unit_price, 0) AS unit_price,
    COALESCE(r.currency, 'ISK') AS currency
FROM project_draft_lines dl
JOIN  parts p ON p.id = dl.part_id
LEFT JOIN part_revisions r ON r.part_id = p.id AND r.valid_to IS NULL;

-- Project BOM snapshot joined with part info — read-only completed view
CREATE VIEW public.project_bom_detail AS
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
    p.bom_type
FROM project_bom_lines bl
JOIN parts p ON p.id = bl.part_id;

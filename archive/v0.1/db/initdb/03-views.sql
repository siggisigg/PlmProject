-- Convenience view: parts joined with their current revision cost/price.
-- Used by the UI via PostgREST — single endpoint, no client-side join needed.
CREATE VIEW public.parts_with_cost AS
SELECT
    p.id,
    p.plm_part_number,
    p.description,
    p.material,
    p.production_type,
    p.manufacturer,
    p.is_assembly,
    r.revision,
    r.unit_cost,
    r.unit_price,
    r.currency
FROM parts p
JOIN part_revisions r ON r.part_id = p.id AND r.valid_to IS NULL;

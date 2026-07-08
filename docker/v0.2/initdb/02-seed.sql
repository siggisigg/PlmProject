-- v0.2 seed — demo data with recipe system
-- Two demo recipes showing the guided configuration flow.

-- ── Parts ──────────────────────────────────────────────────────────────────
INSERT INTO parts (plm_part_number, description, production_type, is_assembly, is_master_assembly, bom_type) VALUES
  ('SR-SBPR',             'Samey Box Palletising Robot with gripper',           'SS', true,  false, 'mechanical'),
  ('SR-RF-F-M410-510',    'Robot steel foundation for Fanuc M410 H=510',        'SS', true,  false, 'mechanical'),
  ('SR-RA-TPH',           'Fanuc TP holder Type 2',                              'SS', true,  false, 'mechanical'),
  ('SR-6POC',             '6 Pallets out conveyors assembly',                    'SS', true,  false, 'mechanical'),
  ('SR-2POC',             '2 Pallets out conveyors assembly',                    'SS', true,  false, 'mechanical'),
  ('SR-EPC-PUOE-6500',    'Empty pallet conveyor — pallet distribution L=6500', 'DS', false, false, 'mechanical'),
  ('SR-EC-STD',           'Standard electrical cabinet assembly',                'SS', true,  false, 'electrical'),
  ('DIN 933 M12x45-A2',   'Hexagon Head Screw M12×45 SS A2',                   'DP', false, false, 'mechanical'),
  ('WA49 DRN80M4 0.75kW', 'SEW Gearmotor 0.75 kW 40 rpm 174 Nm',               'DS', false, false, 'mechanical');

-- ── Part revisions (ISK prices) ────────────────────────────────────────────
-- Realistic Samey-scale ISK values (1 EUR ≈ 150 ISK)
INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 8500000, 12000000, 'ISK' FROM parts WHERE plm_part_number = 'SR-SBPR';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 950000, 1400000, 'ISK' FROM parts WHERE plm_part_number = 'SR-RF-F-M410-510';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 120000, 180000, 'ISK' FROM parts WHERE plm_part_number = 'SR-RA-TPH';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 3200000, 4800000, 'ISK' FROM parts WHERE plm_part_number = 'SR-6POC';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 1400000, 2100000, 'ISK' FROM parts WHERE plm_part_number = 'SR-2POC';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 2800000, 4200000, 'ISK' FROM parts WHERE plm_part_number = 'SR-EPC-PUOE-6500';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 1800000, 2700000, 'ISK' FROM parts WHERE plm_part_number = 'SR-EC-STD';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, '1', 450, 675, 'ISK' FROM parts WHERE plm_part_number = 'DIN 933 M12x45-A2';

INSERT INTO part_revisions (part_id, revision, unit_cost, unit_price, currency)
SELECT id, 'A', 68000, 102000, 'ISK' FROM parts WHERE plm_part_number = 'WA49 DRN80M4 0.75kW';

-- ── Recipes ────────────────────────────────────────────────────────────────
INSERT INTO recipes (name, description, version, is_active) VALUES
  ('SBPC-2LD — 6P Standard',
   '2-level box distribution · 6 pallet out positions · EPC empty pallet handling',
   1, true),
  ('SBPC-1LD — 2P Compact',
   '1-level box distribution · 2 pallet out positions · manual pallet removal',
   1, true);

-- ── Recipe lines and rules (using DO block to capture IDs) ─────────────────
DO $$
DECLARE
  r1 INTEGER; r2 INTEGER;
  p_sbpr INTEGER; p_found INTEGER; p_tph INTEGER;
  p_6poc INTEGER; p_2poc INTEGER; p_epc INTEGER; p_ec INTEGER;
  l1_sbpr INTEGER; l1_found INTEGER; l1_tph INTEGER;
  l1_6poc INTEGER; l1_epc INTEGER;  l1_ec1 INTEGER;
  l2_sbpr INTEGER; l2_found INTEGER; l2_2poc INTEGER; l2_ec2 INTEGER;
BEGIN
  -- recipe IDs
  SELECT id INTO r1 FROM recipes WHERE name = 'SBPC-2LD — 6P Standard';
  SELECT id INTO r2 FROM recipes WHERE name = 'SBPC-1LD — 2P Compact';

  -- part IDs
  SELECT id INTO p_sbpr  FROM parts WHERE plm_part_number = 'SR-SBPR';
  SELECT id INTO p_found FROM parts WHERE plm_part_number = 'SR-RF-F-M410-510';
  SELECT id INTO p_tph   FROM parts WHERE plm_part_number = 'SR-RA-TPH';
  SELECT id INTO p_6poc  FROM parts WHERE plm_part_number = 'SR-6POC';
  SELECT id INTO p_2poc  FROM parts WHERE plm_part_number = 'SR-2POC';
  SELECT id INTO p_epc   FROM parts WHERE plm_part_number = 'SR-EPC-PUOE-6500';
  SELECT id INTO p_ec    FROM parts WHERE plm_part_number = 'SR-EC-STD';

  -- ── Recipe 1: SBPC-2LD — 6P Standard ─────────────────────────────────
  --  Required lines
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r1, p_sbpr,  'mechanical', 1, false, 10) RETURNING id INTO l1_sbpr;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r1, p_found, 'mechanical', 1, false, 20) RETURNING id INTO l1_found;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r1, p_ec,    'electrical', 1, false, 30) RETURNING id INTO l1_ec1;
  --  Optional lines
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r1, p_tph,  'mechanical', 1, true, 40) RETURNING id INTO l1_tph;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r1, p_6poc, 'mechanical', 6, true, 50) RETURNING id INTO l1_6poc;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r1, p_epc,  'mechanical', 1, true, 60) RETURNING id INTO l1_epc;

  -- Rules for recipe 1:
  --  When robot (SBPR) qty changes → foundation qty mirrors it (1:1)
  INSERT INTO recipe_rules (recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier)
    VALUES (r1, l1_sbpr, l1_found, 'multiplies', 1.0);
  --  When robot qty changes → TP holder qty mirrors it (1:1)
  INSERT INTO recipe_rules (recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier)
    VALUES (r1, l1_sbpr, l1_tph, 'multiplies', 1.0);
  --  When 6POC conveyors are enabled → EPC is required (auto-enable)
  INSERT INTO recipe_rules (recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier)
    VALUES (r1, l1_6poc, l1_epc, 'requires', NULL);

  -- ── Recipe 2: SBPC-1LD — 2P Compact ──────────────────────────────────
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r2, p_sbpr,  'mechanical', 1, false, 10) RETURNING id INTO l2_sbpr;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r2, p_found, 'mechanical', 1, false, 20) RETURNING id INTO l2_found;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r2, p_ec,    'electrical', 1, false, 30) RETURNING id INTO l2_ec2;
  INSERT INTO recipe_lines (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order)
    VALUES (r2, p_2poc,  'mechanical', 2, true,  40) RETURNING id INTO l2_2poc;

  -- Rules for recipe 2:
  INSERT INTO recipe_rules (recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier)
    VALUES (r2, l2_sbpr, l2_found, 'multiplies', 1.0);
END $$;

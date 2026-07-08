-- v0.2 schema — full system
-- Parts → BOM hierarchy → Recipes → Projects → Draft → Snapshot

-- ── Staging ────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS _staging;

CREATE TABLE _staging.parts_raw (
    id               SERIAL PRIMARY KEY,
    source_file      TEXT        NOT NULL,
    row_num          INTEGER     NOT NULL,
    plm_part_number  TEXT,
    description      TEXT,
    material         TEXT,
    material_shape   TEXT,
    material_spec    TEXT,
    length_mm        TEXT,
    thickness_mm     TEXT,
    production_type  TEXT,
    manufacturer     TEXT,
    revision         TEXT,
    comment          TEXT,
    is_cut_list_item BOOLEAN     NOT NULL DEFAULT false,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Parts ──────────────────────────────────────────────────────────────────
CREATE TABLE parts (
    id                 SERIAL PRIMARY KEY,
    plm_part_number    TEXT    NOT NULL UNIQUE,
    description        TEXT,
    material           TEXT,
    production_type    TEXT,           -- code: SS SV DJ DL DZ DS DT DP
    manufacturer       TEXT,
    is_assembly        BOOLEAN NOT NULL DEFAULT false,
    is_master_assembly BOOLEAN NOT NULL DEFAULT false,  -- top-level sellable system; never a sub-assembly
    bom_type           TEXT    NOT NULL DEFAULT 'mechanical'  -- 'mechanical' | 'electrical'
);

CREATE TABLE part_revisions (
    id         SERIAL PRIMARY KEY,
    part_id    INTEGER     NOT NULL REFERENCES parts (id),
    revision   TEXT,
    unit_cost  NUMERIC(14, 4),
    unit_price NUMERIC(14, 4),
    currency   TEXT        NOT NULL DEFAULT 'ISK',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to   TIMESTAMPTZ             -- NULL = current revision
);

CREATE INDEX ON part_revisions (part_id);
CREATE INDEX ON part_revisions (part_id, valid_to) WHERE valid_to IS NULL;

-- ── BOM Hierarchy ──────────────────────────────────────────────────────────
-- One row per imported BOM document (each Master Assembly gets its own header).
CREATE TABLE bom_headers (
    id           SERIAL PRIMARY KEY,
    root_part_id INTEGER     NOT NULL REFERENCES parts (id),
    source_file  TEXT,
    bom_type     TEXT        NOT NULL DEFAULT 'mechanical',
    imported_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revision     TEXT
);

-- Adjacency-list tree. parent_line_id NULL = direct child of root assembly.
-- Assembly rows (is_assembly=true) carry quantity multipliers only; unit_cost=0.
-- Only leaf parts (is_assembly=false) contribute to cost/price totals.
CREATE TABLE bom_lines (
    id             SERIAL PRIMARY KEY,
    bom_header_id  INTEGER       NOT NULL REFERENCES bom_headers (id),
    parent_line_id INTEGER       REFERENCES bom_lines (id),  -- NULL = root's direct child
    part_id        INTEGER       NOT NULL REFERENCES parts (id),
    quantity       NUMERIC(12,4) NOT NULL,
    level_path     TEXT,    -- dotted decimal from export e.g. "1.1.2" — display/sort only
    sort_order     INTEGER
);

CREATE INDEX ON bom_lines (bom_header_id);
CREATE INDEX ON bom_lines (parent_line_id);

-- ── Recipes ────────────────────────────────────────────────────────────────
-- A recipe is a maintainable sales configuration template.
-- Recipe authors (product managers) manage these; salespeople consume them.
CREATE TABLE recipes (
    id          SERIAL PRIMARY KEY,
    name        TEXT    NOT NULL,
    description TEXT,
    version     INTEGER NOT NULL DEFAULT 1,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each line in a recipe references a part (assembly or component).
CREATE TABLE recipe_lines (
    id          SERIAL PRIMARY KEY,
    recipe_id   INTEGER       NOT NULL REFERENCES recipes (id),
    part_id     INTEGER       NOT NULL REFERENCES parts (id),
    bom_type    TEXT          NOT NULL DEFAULT 'mechanical',
    default_qty NUMERIC(12,4) NOT NULL DEFAULT 1,
    is_optional BOOLEAN       NOT NULL DEFAULT false,
    sort_order  INTEGER
);

CREATE INDEX ON recipe_lines (recipe_id);

-- Dependency rules between recipe lines.
-- rule_type:
--   'requires'   — when trigger is selected, target is forced on
--   'multiplies' — target qty = trigger qty × qty_multiplier
--   'excludes'   — trigger and target cannot both be selected
CREATE TABLE recipe_rules (
    id              SERIAL PRIMARY KEY,
    recipe_id       INTEGER       NOT NULL REFERENCES recipes (id),
    trigger_line_id INTEGER       NOT NULL REFERENCES recipe_lines (id),
    target_line_id  INTEGER       NOT NULL REFERENCES recipe_lines (id),
    rule_type       TEXT          NOT NULL CHECK (rule_type IN ('requires','multiplies','excludes')),
    qty_multiplier  NUMERIC(12,4)
);

CREATE INDEX ON recipe_rules (recipe_id);

-- ── Projects ───────────────────────────────────────────────────────────────
CREATE TABLE projects (
    id            SERIAL PRIMARY KEY,
    name          TEXT    NOT NULL,
    solution_code TEXT,
    status        TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mutable working state; holds top-level selected items (assemblies included).
-- Cleared / archived once "Complete BOM" is executed.
CREATE TABLE project_draft_lines (
    id                 SERIAL PRIMARY KEY,
    project_id         INTEGER       NOT NULL REFERENCES projects (id),
    part_id            INTEGER       NOT NULL REFERENCES parts (id),
    quantity           NUMERIC(12,4) NOT NULL,
    source             TEXT          NOT NULL DEFAULT 'manual' CHECK (source IN ('recipe','manual')),
    recipe_instance_id INTEGER,     -- which recipe run added this line; NULL if manual
    sort_order         INTEGER,
    added_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON project_draft_lines (project_id);

-- Immutable cost/price snapshot written by "Complete BOM".
-- Stores expanded leaf parts only — never assembly rows.
-- NEVER updated after creation. Financial reports read only this table.
CREATE TABLE project_bom_lines (
    id                  SERIAL PRIMARY KEY,
    project_id          INTEGER       NOT NULL REFERENCES projects (id),
    part_id             INTEGER       NOT NULL REFERENCES parts (id),
    effective_qty       NUMERIC(12,4) NOT NULL,  -- product of all ancestor quantities
    snapshot_unit_cost  NUMERIC(14,4),
    snapshot_unit_price NUMERIC(14,4),
    currency            TEXT          NOT NULL DEFAULT 'ISK',
    source              TEXT,                    -- 'recipe' | 'manual'
    snapshotted_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX ON project_bom_lines (project_id);

-- ── Sync log ───────────────────────────────────────────────────────────────
CREATE TABLE sync_log (
    id          SERIAL PRIMARY KEY,
    run_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_file TEXT,
    rows_added  INTEGER     NOT NULL DEFAULT 0,
    rows_updated INTEGER    NOT NULL DEFAULT 0,
    rows_skipped INTEGER    NOT NULL DEFAULT 0,
    notes       TEXT
);

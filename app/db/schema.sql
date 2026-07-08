-- PLM SQLite schema — migrated from PostgreSQL v0.2 + migrations 05/06
-- Differences from PostgreSQL:
--   SERIAL PRIMARY KEY → INTEGER PRIMARY KEY
--   TIMESTAMPTZ DEFAULT now() → TEXT DEFAULT (datetime('now'))
--   NUMERIC(14,4) → NUMERIC  (dynamic typing; monetary stored as REAL)
--   BOOLEAN → INTEGER  (0=false, 1=true)
--   _staging schema → staging_ prefix
--   Foreign keys require: PRAGMA foreign_keys = ON

PRAGMA foreign_keys = ON;

-- ── Staging ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staging_parts_raw (
    id               INTEGER PRIMARY KEY,
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
    is_cut_list_item INTEGER     NOT NULL DEFAULT 0,
    ingested_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_voruskra_raw (
    id             INTEGER PRIMARY KEY,
    source_file    TEXT        NOT NULL,
    vorunumer      TEXT,
    vorulysingur   TEXT,
    vorulysingur_2 TEXT,
    kostnadarverd  NUMERIC,
    verd_1         NUMERIC,
    grunneining    TEXT,
    voruflokk      TEXT,
    breytt_dags    TEXT,
    ingested_at    TEXT        NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staging_electrical_bom_raw (
    id               INTEGER PRIMARY KEY,
    source_file      TEXT        NOT NULL,
    row_num          INTEGER     NOT NULL,
    manufacturer     TEXT,
    equipment        TEXT,
    type_description TEXT,
    goods_group      TEXT,
    num_pieces       TEXT,
    quantity         TEXT,
    length_m         TEXT,
    price            TEXT,
    unit_price_raw   TEXT,
    order_number     TEXT,
    supplier         TEXT,
    ingested_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

-- ── Parts ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parts (
    id                 INTEGER PRIMARY KEY,
    plm_part_number    TEXT    NOT NULL UNIQUE,
    description        TEXT,
    material           TEXT,
    production_type    TEXT,
    manufacturer       TEXT,
    is_assembly        INTEGER NOT NULL DEFAULT 0,
    is_master_assembly INTEGER NOT NULL DEFAULT 0,
    bom_type           TEXT    NOT NULL DEFAULT 'mechanical',
    unit_of_measure    TEXT,
    erp_category       TEXT
);

CREATE TABLE IF NOT EXISTS part_revisions (
    id                INTEGER PRIMARY KEY,
    part_id           INTEGER     NOT NULL REFERENCES parts (id),
    revision          TEXT,
    unit_cost         NUMERIC,
    unit_price        NUMERIC,
    installation_cost NUMERIC,
    currency          TEXT        NOT NULL DEFAULT 'ISK',
    valid_from        TEXT        NOT NULL DEFAULT (datetime('now')),
    valid_to          TEXT
);

CREATE INDEX IF NOT EXISTS idx_part_revisions_part_id ON part_revisions (part_id);
CREATE INDEX IF NOT EXISTS idx_part_revisions_current ON part_revisions (part_id) WHERE valid_to IS NULL;

-- ── BOM Hierarchy ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bom_headers (
    id           INTEGER PRIMARY KEY,
    root_part_id INTEGER     NOT NULL REFERENCES parts (id),
    source_file  TEXT,
    bom_type     TEXT        NOT NULL DEFAULT 'mechanical',
    imported_at  TEXT        NOT NULL DEFAULT (datetime('now')),
    revision     TEXT
);

CREATE TABLE IF NOT EXISTS bom_lines (
    id             INTEGER PRIMARY KEY,
    bom_header_id  INTEGER       NOT NULL REFERENCES bom_headers (id),
    parent_line_id INTEGER       REFERENCES bom_lines (id),
    part_id        INTEGER       NOT NULL REFERENCES parts (id),
    quantity       NUMERIC       NOT NULL,
    level_path     TEXT,
    sort_order     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_bom_lines_header ON bom_lines (bom_header_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_parent ON bom_lines (parent_line_id);

-- ── Recipes ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipes (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    description TEXT,
    version     INTEGER NOT NULL DEFAULT 1,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_lines (
    id          INTEGER PRIMARY KEY,
    recipe_id   INTEGER       NOT NULL REFERENCES recipes (id),
    part_id     INTEGER       NOT NULL REFERENCES parts (id),
    bom_type    TEXT          NOT NULL DEFAULT 'mechanical',
    default_qty NUMERIC       NOT NULL DEFAULT 1,
    is_optional INTEGER       NOT NULL DEFAULT 0,
    sort_order  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipe_lines_recipe ON recipe_lines (recipe_id);

CREATE TABLE IF NOT EXISTS recipe_rules (
    id              INTEGER PRIMARY KEY,
    recipe_id       INTEGER       NOT NULL REFERENCES recipes (id),
    trigger_line_id INTEGER       NOT NULL REFERENCES recipe_lines (id),
    target_line_id  INTEGER       NOT NULL REFERENCES recipe_lines (id),
    rule_type       TEXT          NOT NULL CHECK (rule_type IN ('requires','multiplies','excludes')),
    qty_multiplier  NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_recipe_rules_recipe ON recipe_rules (recipe_id);

-- ── Projects ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id            INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL,
    solution_code TEXT,
    status        TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_draft_lines (
    id                 INTEGER PRIMARY KEY,
    project_id         INTEGER       NOT NULL REFERENCES projects (id),
    part_id            INTEGER       NOT NULL REFERENCES parts (id),
    quantity           NUMERIC       NOT NULL,
    source             TEXT          NOT NULL DEFAULT 'manual' CHECK (source IN ('recipe','manual')),
    recipe_instance_id INTEGER,
    sort_order         INTEGER,
    added_at           TEXT          NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_draft_lines_project ON project_draft_lines (project_id);

CREATE TABLE IF NOT EXISTS project_bom_lines (
    id                          INTEGER PRIMARY KEY,
    project_id                  INTEGER       NOT NULL REFERENCES projects (id),
    part_id                     INTEGER       NOT NULL REFERENCES parts (id),
    effective_qty               NUMERIC       NOT NULL,
    snapshot_unit_cost          NUMERIC,
    snapshot_unit_price         NUMERIC,
    snapshot_installation_cost  NUMERIC,
    currency                    TEXT          NOT NULL DEFAULT 'ISK',
    source                      TEXT,
    snapshotted_at              TEXT          NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bom_lines_project ON project_bom_lines (project_id);

-- ── Sync log ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_log (
    id           INTEGER PRIMARY KEY,
    run_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    source_file  TEXT,
    rows_added   INTEGER NOT NULL DEFAULT 0,
    rows_updated INTEGER NOT NULL DEFAULT 0,
    rows_skipped INTEGER NOT NULL DEFAULT 0,
    notes        TEXT
);

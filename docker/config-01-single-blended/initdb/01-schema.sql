-- Config-01: single-currency, blended cost
-- Parts catalog experiment — INPUT side of the system only.
-- Flow: PDM export → _staging.parts_raw → parts + part_revisions

-- ── Staging ────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS _staging;

-- Raw part records as they arrive from a PDM BOM export.
-- All columns TEXT; no validation at this stage.
CREATE TABLE _staging.parts_raw (
    id               SERIAL PRIMARY KEY,
    source_file      TEXT        NOT NULL,
    row_num          INTEGER     NOT NULL,
    plm_part_number  TEXT,
    description      TEXT,
    material         TEXT,
    material_shape   TEXT,       -- "Description - Blank" xlsx column
    material_spec    TEXT,       -- "Part number - Blank" xlsx column
    length_mm        TEXT,
    thickness_mm     TEXT,
    production_type  TEXT,       -- full label, e.g. "Saw cutting (DJ)"
    manufacturer     TEXT,
    revision         TEXT,
    comment          TEXT,
    is_cut_list_item BOOLEAN     NOT NULL DEFAULT false,
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Core ───────────────────────────────────────────────────────────────────

-- Unique parts (one row per physical part number in the PDM vault).
CREATE TABLE parts (
    id               SERIAL PRIMARY KEY,
    plm_part_number  TEXT        NOT NULL UNIQUE,
    description      TEXT,
    material         TEXT,
    production_type  TEXT,       -- code only: SS SV DJ DL DZ DS DT DP
    manufacturer     TEXT,       -- set for purchased parts (DS / DP)
    is_assembly      BOOLEAN     NOT NULL DEFAULT false
);

-- Versioned cost/price per part revision.
-- unit_cost and unit_price stored as NUMERIC — never FLOAT.
-- currency always recorded, even in single-currency mode.
CREATE TABLE part_revisions (
    id               SERIAL PRIMARY KEY,
    part_id          INTEGER     NOT NULL REFERENCES parts (id),
    revision         TEXT,
    unit_cost        NUMERIC(12, 4),
    unit_price       NUMERIC(12, 4),
    currency         TEXT        NOT NULL DEFAULT 'ISK',
    valid_from       TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to         TIMESTAMPTZ             -- NULL = current revision
);

CREATE INDEX ON part_revisions (part_id);
CREATE INDEX ON part_revisions (part_id, valid_to) WHERE valid_to IS NULL;

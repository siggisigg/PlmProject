-- Additive schema changes to support ingest scripts.
-- Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it is safe to re-run.

ALTER TABLE parts ADD COLUMN IF NOT EXISTS unit_of_measure TEXT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS erp_category     TEXT;

-- Raw staging table for Vöruskrá rows (one row per source row, never deleted)
CREATE TABLE IF NOT EXISTS _staging.voruskra_raw (
    id             SERIAL PRIMARY KEY,
    source_file    TEXT        NOT NULL,
    vorunumer      TEXT,
    vorulysingur   TEXT,
    vorulysingur_2 TEXT,
    kostnadarverd  NUMERIC(14,4),
    verd_1         NUMERIC(14,4),
    grunneining    TEXT,
    voruflokk      TEXT,
    breytt_dags    DATE,
    ingested_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw staging table for SEE Electrical BOM rows
CREATE TABLE IF NOT EXISTS _staging.electrical_bom_raw (
    id               SERIAL PRIMARY KEY,
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
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

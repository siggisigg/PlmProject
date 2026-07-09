import { define } from "../../utils.ts";
import { queryAll } from "../../db/client.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 600), 2000);

    const rows = q
      ? await queryAll(
          `SELECT p.id, p.plm_part_number, p.description, p.material,
                  p.production_type, p.manufacturer, p.is_assembly,
                  p.is_master_assembly, p.bom_type, p.unit_of_measure,
                  r.revision,
                  COALESCE(r.unit_cost, 0)          AS unit_cost,
                  COALESCE(r.unit_price, 0)         AS unit_price,
                  COALESCE(r.installation_cost, 0)  AS installation_cost,
                  COALESCE(r.currency, 'ISK')       AS currency
           FROM parts p
           LEFT JOIN part_revisions r
                  ON r.part_id = p.id AND r.valid_to IS NULL
           WHERE p.plm_part_number ILIKE ? OR p.description ILIKE ?
           ORDER BY p.plm_part_number
           LIMIT ?`,
          [`%${q}%`, `%${q}%`, limit],
        )
      : await queryAll(
          `SELECT p.id, p.plm_part_number, p.description, p.material,
                  p.production_type, p.manufacturer, p.is_assembly,
                  p.is_master_assembly, p.bom_type, p.unit_of_measure,
                  r.revision,
                  COALESCE(r.unit_cost, 0)          AS unit_cost,
                  COALESCE(r.unit_price, 0)         AS unit_price,
                  COALESCE(r.installation_cost, 0)  AS installation_cost,
                  COALESCE(r.currency, 'ISK')       AS currency
           FROM parts p
           LEFT JOIN part_revisions r
                  ON r.part_id = p.id AND r.valid_to IS NULL
           ORDER BY p.plm_part_number
           LIMIT ?`,
          [limit],
        );

    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

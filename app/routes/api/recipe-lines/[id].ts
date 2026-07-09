import { define } from "../../../utils.ts";
import { queryAll } from "../../../db/client.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
      return new Response("Bad id", { status: 400 });
    }

    const rows = await queryAll(
      `SELECT rl.id, rl.recipe_id, rl.part_id, rl.bom_type,
              rl.default_qty, rl.is_optional, rl.sort_order, rl.stage_id,
              p.plm_part_number, p.description, p.is_assembly, p.production_type,
              COALESCE(r.unit_cost, 0)   AS unit_cost,
              COALESCE(r.unit_price, 0)  AS unit_price,
              COALESCE(r.currency,'ISK') AS currency
       FROM recipe_lines rl
       JOIN parts p ON p.id = rl.part_id
       LEFT JOIN part_revisions r ON r.part_id = p.id AND r.valid_to IS NULL
       WHERE rl.recipe_id = ?
       ORDER BY rl.sort_order`,
      [id],
    );

    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

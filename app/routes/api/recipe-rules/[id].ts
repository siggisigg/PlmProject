import { define } from "../../../utils.ts";
import { queryAll } from "../../../db/client.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
      return new Response("Bad id", { status: 400 });
    }

    const rows = await queryAll(
      `SELECT id, recipe_id, trigger_line_id, target_line_id,
              rule_type, qty_multiplier
       FROM recipe_rules
       WHERE recipe_id = ?`,
      [id],
    );

    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

import { define } from "../../../utils.ts";
import { queryAll } from "../../../db/client.ts";

// Ordered wizard stages for a recipe.
export const handler = define.handlers({
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
      return new Response("Bad id", { status: 400 });
    }

    const rows = await queryAll(
      `SELECT id, recipe_id, name, sort_order
       FROM recipe_stages
       WHERE recipe_id = ?
       ORDER BY sort_order, id`,
      [id],
    );

    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

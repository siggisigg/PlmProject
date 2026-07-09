import { define } from "../../../../utils.ts";
import { queryAll, withTx } from "../../../../db/client.ts";

// Admin recipe CRUD — no auth (single-client internal tool; future hardening).
export const handler = define.handlers({
  // All recipes including inactive, with line/stage counts.
  async GET() {
    const rows = await queryAll(
      `SELECT r.id, r.name, r.description, r.version, r.is_active,
              r.created_at, r.updated_at,
              (SELECT count(*)::int FROM recipe_lines  rl WHERE rl.recipe_id = r.id) AS line_count,
              (SELECT count(*)::int FROM recipe_stages rs WHERE rs.recipe_id = r.id) AS stage_count
       FROM recipes r
       ORDER BY r.is_active DESC, r.name`,
    );
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Create a recipe (with its default stage): { name, description? }
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return new Response("name is required", { status: 400 });
    const description = typeof body?.description === "string"
      ? body.description.trim() || null
      : null;

    const recipe = await withTx(async (tx) => {
      const r = await tx.one<{ id: number }>(
        `INSERT INTO recipes (name, description)
         VALUES (?, ?)
         RETURNING id, name, description, version, is_active, created_at, updated_at`,
        [name, description],
      );
      await tx.all(
        `INSERT INTO recipe_stages (recipe_id, name, sort_order)
         VALUES (?, 'Configuration', 10)`,
        [r!.id],
      );
      return r;
    });

    return new Response(JSON.stringify(recipe), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
});

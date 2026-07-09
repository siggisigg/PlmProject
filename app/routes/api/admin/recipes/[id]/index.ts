import { define } from "../../../../../utils.ts";
import { queryAll, queryOne } from "../../../../../db/client.ts";

export const handler = define.handlers({
  // Full recipe payload: recipe + stages + lines (with part detail) + rules.
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const recipe = await queryOne(
      `SELECT id, name, description, version, is_active, created_at, updated_at
       FROM recipes WHERE id = ?`,
      [id],
    );
    if (!recipe) return new Response("Not found", { status: 404 });

    const [stages, lines, rules] = await Promise.all([
      queryAll(
        `SELECT id, recipe_id, name, sort_order
         FROM recipe_stages WHERE recipe_id = ? ORDER BY sort_order, id`,
        [id],
      ),
      queryAll(
        `SELECT rl.id, rl.recipe_id, rl.part_id, rl.bom_type, rl.default_qty,
                rl.is_optional, rl.sort_order, rl.stage_id,
                p.plm_part_number, p.description, p.is_assembly, p.production_type,
                COALESCE(r.unit_cost, 0)   AS unit_cost,
                COALESCE(r.unit_price, 0)  AS unit_price,
                COALESCE(r.currency,'ISK') AS currency
         FROM recipe_lines rl
         JOIN parts p ON p.id = rl.part_id
         LEFT JOIN part_revisions r ON r.part_id = p.id AND r.valid_to IS NULL
         WHERE rl.recipe_id = ?
         ORDER BY rl.sort_order, rl.id`,
        [id],
      ),
      queryAll(
        `SELECT id, recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier
         FROM recipe_rules WHERE recipe_id = ? ORDER BY id`,
        [id],
      ),
    ]);

    return new Response(JSON.stringify({ recipe, stages, lines, rules }), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Edit name/description/is_active. Bumps version and touches updated_at.
  async PATCH(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const body = await ctx.req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const description = typeof body?.description === "string"
      ? body.description.trim()
      : null;
    const isActive = typeof body?.is_active === "boolean"
      ? body.is_active
      : null;
    if (name === null && description === null && isActive === null) {
      return new Response("Nothing to update", { status: 400 });
    }

    const row = await queryOne(
      `UPDATE recipes
       SET name        = COALESCE(?, name),
           description = COALESCE(?, description),
           is_active   = COALESCE(?, is_active),
           version     = version + 1,
           updated_at  = now()
       WHERE id = ?
       RETURNING id, name, description, version, is_active, created_at, updated_at`,
      [name, description, isActive, id],
    );
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Soft delete: deactivate. Lines/rules/stages are kept for history.
  async DELETE(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const row = await queryOne(
      `UPDATE recipes SET is_active = false, updated_at = now()
       WHERE id = ?
       RETURNING id, is_active`,
      [id],
    );
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

import { define } from "../../../../../utils.ts";
import { queryOne } from "../../../../../db/client.ts";

async function recipeExists(id: number): Promise<boolean> {
  return !!(await queryOne(`SELECT 1 AS x FROM recipes WHERE id = ?`, [id]));
}

export const handler = define.handlers({
  // Add a stage: { name, sort_order? }
  async POST(ctx) {
    const recipeId = Number(ctx.params.id);
    if (!Number.isFinite(recipeId)) {
      return new Response("Bad id", { status: 400 });
    }
    if (!(await recipeExists(recipeId))) {
      return new Response("Recipe not found", { status: 404 });
    }

    const body = await ctx.req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return new Response("name is required", { status: 400 });

    const sortOrder = Number.isFinite(body?.sort_order)
      ? Number(body.sort_order)
      : null;
    const row = await queryOne(
      `INSERT INTO recipe_stages (recipe_id, name, sort_order)
       VALUES (?, ?, COALESCE(?::int,
         (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM recipe_stages WHERE recipe_id = ?)))
       RETURNING id, recipe_id, name, sort_order`,
      [recipeId, name, sortOrder, recipeId],
    );
    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },

  // Rename / reorder: { id, name?, sort_order? }
  async PATCH(ctx) {
    const recipeId = Number(ctx.params.id);
    const body = await ctx.req.json().catch(() => null);
    const stageId = Number(body?.id);
    if (!Number.isFinite(recipeId) || !Number.isFinite(stageId)) {
      return new Response("Bad id", { status: 400 });
    }
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const sortOrder = Number.isFinite(body?.sort_order)
      ? Number(body.sort_order)
      : null;
    if (name === null && sortOrder === null) {
      return new Response("Nothing to update", { status: 400 });
    }

    const row = await queryOne(
      `UPDATE recipe_stages
       SET name = COALESCE(?, name), sort_order = COALESCE(?::int, sort_order)
       WHERE id = ? AND recipe_id = ?
       RETURNING id, recipe_id, name, sort_order`,
      [name, sortOrder, stageId, recipeId],
    );
    if (!row) return new Response("Stage not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Delete: { id }. 409 if the stage still has lines.
  async DELETE(ctx) {
    const recipeId = Number(ctx.params.id);
    const body = await ctx.req.json().catch(() => null);
    const stageId = Number(body?.id);
    if (!Number.isFinite(recipeId) || !Number.isFinite(stageId)) {
      return new Response("Bad id", { status: 400 });
    }

    const inUse = await queryOne(
      `SELECT count(*)::int AS n FROM recipe_lines WHERE stage_id = ?`,
      [stageId],
    );
    if (inUse && (inUse.n as number) > 0) {
      return new Response("Stage has lines — move or delete them first", {
        status: 409,
      });
    }

    const row = await queryOne(
      `DELETE FROM recipe_stages WHERE id = ? AND recipe_id = ? RETURNING id`,
      [stageId, recipeId],
    );
    if (!row) return new Response("Stage not found", { status: 404 });
    return new Response(JSON.stringify({ deleted: stageId }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

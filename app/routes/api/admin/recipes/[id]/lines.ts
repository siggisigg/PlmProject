import { define } from "../../../../../utils.ts";
import { queryOne, withTx } from "../../../../../db/client.ts";

export const handler = define.handlers({
  // Add a line: { part_id, stage_id?, default_qty?, is_optional?, sort_order? }
  // bom_type is derived from the part, not client-supplied.
  async POST(ctx) {
    const recipeId = Number(ctx.params.id);
    if (!Number.isFinite(recipeId)) {
      return new Response("Bad id", { status: 400 });
    }

    const body = await ctx.req.json().catch(() => null);
    const partId = Number(body?.part_id);
    if (!Number.isFinite(partId)) {
      return new Response("part_id is required", { status: 400 });
    }

    const part = await queryOne<{ bom_type: string }>(
      `SELECT bom_type FROM parts WHERE id = ?`,
      [partId],
    );
    if (!part) return new Response("Part not found", { status: 404 });

    const stageId = Number.isFinite(body?.stage_id)
      ? Number(body.stage_id)
      : null;
    if (stageId !== null) {
      const stage = await queryOne(
        `SELECT 1 AS x FROM recipe_stages WHERE id = ? AND recipe_id = ?`,
        [stageId, recipeId],
      );
      if (!stage) {
        return new Response("stage_id does not belong to this recipe", {
          status: 400,
        });
      }
    }

    const row = await queryOne(
      `INSERT INTO recipe_lines
         (recipe_id, part_id, bom_type, default_qty, is_optional, sort_order, stage_id)
       VALUES (?, ?, ?, ?, ?, COALESCE(?::int,
         (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM recipe_lines WHERE recipe_id = ?)), ?)
       RETURNING id, recipe_id, part_id, bom_type, default_qty, is_optional, sort_order, stage_id`,
      [
        recipeId,
        partId,
        part.bom_type,
        Number.isFinite(body?.default_qty) ? Number(body.default_qty) : 1,
        body?.is_optional === true,
        Number.isFinite(body?.sort_order) ? Number(body.sort_order) : null,
        recipeId,
        stageId,
      ],
    );
    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },

  // Edit a line: { id, default_qty?, is_optional?, sort_order?, stage_id? }
  async PATCH(ctx) {
    const recipeId = Number(ctx.params.id);
    const body = await ctx.req.json().catch(() => null);
    const lineId = Number(body?.id);
    if (!Number.isFinite(recipeId) || !Number.isFinite(lineId)) {
      return new Response("Bad id", { status: 400 });
    }

    const stageId = Number.isFinite(body?.stage_id)
      ? Number(body.stage_id)
      : null;
    if (stageId !== null) {
      const stage = await queryOne(
        `SELECT 1 AS x FROM recipe_stages WHERE id = ? AND recipe_id = ?`,
        [stageId, recipeId],
      );
      if (!stage) {
        return new Response("stage_id does not belong to this recipe", {
          status: 400,
        });
      }
    }

    const row = await queryOne(
      `UPDATE recipe_lines
       SET default_qty = COALESCE(?::numeric, default_qty),
           is_optional = COALESCE(?::boolean, is_optional),
           sort_order  = COALESCE(?::int, sort_order),
           stage_id    = COALESCE(?::int, stage_id)
       WHERE id = ? AND recipe_id = ?
       RETURNING id, recipe_id, part_id, bom_type, default_qty, is_optional, sort_order, stage_id`,
      [
        Number.isFinite(body?.default_qty) ? Number(body.default_qty) : null,
        typeof body?.is_optional === "boolean" ? body.is_optional : null,
        Number.isFinite(body?.sort_order) ? Number(body.sort_order) : null,
        stageId,
        lineId,
        recipeId,
      ],
    );
    if (!row) return new Response("Line not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Delete a line: { id }. Rules referencing it go with it, same tx.
  async DELETE(ctx) {
    const recipeId = Number(ctx.params.id);
    const body = await ctx.req.json().catch(() => null);
    const lineId = Number(body?.id);
    if (!Number.isFinite(recipeId) || !Number.isFinite(lineId)) {
      return new Response("Bad id", { status: 400 });
    }

    const deleted = await withTx(async (tx) => {
      await tx.all(
        `DELETE FROM recipe_rules
         WHERE recipe_id = ? AND (trigger_line_id = ? OR target_line_id = ?)`,
        [recipeId, lineId, lineId],
      );
      const rows = await tx.all<{ id: number }>(
        `DELETE FROM recipe_lines WHERE id = ? AND recipe_id = ? RETURNING id`,
        [lineId, recipeId],
      );
      return rows.length > 0;
    });

    if (!deleted) return new Response("Line not found", { status: 404 });
    return new Response(JSON.stringify({ deleted: lineId }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

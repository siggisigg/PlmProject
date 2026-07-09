import { define } from "../../../../../utils.ts";
import { queryAll, queryOne } from "../../../../../db/client.ts";

const RULE_TYPES = ["requires", "multiplies", "excludes"] as const;

export const handler = define.handlers({
  // Add a rule: { trigger_line_id, target_line_id, rule_type, qty_multiplier? }
  async POST(ctx) {
    const recipeId = Number(ctx.params.id);
    if (!Number.isFinite(recipeId)) {
      return new Response("Bad id", { status: 400 });
    }

    const body = await ctx.req.json().catch(() => null);
    const triggerId = Number(body?.trigger_line_id);
    const targetId = Number(body?.target_line_id);
    const ruleType = body?.rule_type;
    if (!Number.isFinite(triggerId) || !Number.isFinite(targetId)) {
      return new Response("trigger_line_id and target_line_id are required", {
        status: 400,
      });
    }
    if (!RULE_TYPES.includes(ruleType)) {
      return new Response(
        `rule_type must be one of: ${RULE_TYPES.join(", ")}`,
        {
          status: 400,
        },
      );
    }
    if (triggerId === targetId) {
      return new Response("A rule cannot reference the same line twice", {
        status: 400,
      });
    }
    const multiplier = Number.isFinite(body?.qty_multiplier)
      ? Number(body.qty_multiplier)
      : null;
    if (ruleType === "multiplies" && multiplier === null) {
      return new Response("'multiplies' rules need qty_multiplier", {
        status: 400,
      });
    }

    // Both lines must belong to this recipe.
    const lines = await queryAll<{ id: number }>(
      `SELECT id FROM recipe_lines WHERE recipe_id = ? AND id IN (?, ?)`,
      [recipeId, triggerId, targetId],
    );
    if (lines.length !== 2) {
      return new Response("Both lines must belong to this recipe", {
        status: 400,
      });
    }

    // Reject duplicates (same pair + type, either direction for excludes).
    const dup = await queryOne(
      `SELECT 1 AS x FROM recipe_rules
       WHERE recipe_id = ? AND rule_type = ?
         AND ((trigger_line_id = ? AND target_line_id = ?)
           OR (rule_type = 'excludes' AND trigger_line_id = ? AND target_line_id = ?))`,
      [recipeId, ruleType, triggerId, targetId, targetId, triggerId],
    );
    if (dup) return new Response("Duplicate rule", { status: 409 });

    // Warn (don't block) on a requires/excludes contradiction for the pair.
    const contradiction = await queryOne(
      `SELECT rule_type FROM recipe_rules
       WHERE recipe_id = ?
         AND rule_type IN ('requires', 'excludes') AND rule_type <> ?
         AND ((trigger_line_id = ? AND target_line_id = ?)
           OR (trigger_line_id = ? AND target_line_id = ?))`,
      [recipeId, ruleType, triggerId, targetId, targetId, triggerId],
    );

    const row = await queryOne(
      `INSERT INTO recipe_rules
         (recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, recipe_id, trigger_line_id, target_line_id, rule_type, qty_multiplier`,
      [recipeId, triggerId, targetId, ruleType, multiplier],
    );

    return new Response(
      JSON.stringify({
        ...row,
        warnings: contradiction
          ? [
            `This pair also has a '${contradiction.rule_type}' rule — requires and excludes on the same pair contradict each other.`,
          ]
          : [],
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  },

  // Delete a rule: { id }
  async DELETE(ctx) {
    const recipeId = Number(ctx.params.id);
    const body = await ctx.req.json().catch(() => null);
    const ruleId = Number(body?.id);
    if (!Number.isFinite(recipeId) || !Number.isFinite(ruleId)) {
      return new Response("Bad id", { status: 400 });
    }

    const row = await queryOne(
      `DELETE FROM recipe_rules WHERE id = ? AND recipe_id = ? RETURNING id`,
      [ruleId, recipeId],
    );
    if (!row) return new Response("Rule not found", { status: 404 });
    return new Response(JSON.stringify({ deleted: ruleId }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

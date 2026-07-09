import { define } from "../../../../utils.ts";
import { queryAll, queryOne, withTx } from "../../../../db/client.ts";

interface DraftLineIn {
  part_id: number;
  quantity: number;
  source: "recipe" | "manual";
  recipe_instance_id?: number | null;
  sort_order?: number | null;
}

export const handler = define.handlers({
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const rows = await queryAll(
      `SELECT id, project_id, part_id, quantity, source, recipe_instance_id,
              sort_order, added_at, plm_part_number, description, is_assembly,
              production_type, bom_type, unit_cost, unit_price, currency
       FROM project_draft_detail
       WHERE project_id = ?
       ORDER BY sort_order NULLS LAST, id`,
      [id],
    );
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Replace-all draft save: { lines: DraftLineIn[] }.
  // Matches the island's onChange(lines[]) model and is idempotent.
  async PUT(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const project = await queryOne<{ status: string }>(
      `SELECT status FROM projects WHERE id = ?`,
      [id],
    );
    if (!project) return new Response("Not found", { status: 404 });
    if (project.status === "complete") {
      return new Response("Project is complete; draft is read-only", {
        status: 409,
      });
    }

    const body = await ctx.req.json().catch(() => null);
    const lines: DraftLineIn[] = Array.isArray(body?.lines) ? body.lines : [];
    for (const l of lines) {
      if (!Number.isFinite(l.part_id) || !Number.isFinite(l.quantity)) {
        return new Response("Each line needs numeric part_id and quantity", {
          status: 400,
        });
      }
      if (l.source !== "recipe" && l.source !== "manual") {
        return new Response("line.source must be 'recipe' or 'manual'", {
          status: 400,
        });
      }
    }

    await withTx(async (tx) => {
      await tx.all(`DELETE FROM project_draft_lines WHERE project_id = ?`, [
        id,
      ]);
      let i = 0;
      for (const l of lines) {
        await tx.all(
          `INSERT INTO project_draft_lines
             (project_id, part_id, quantity, source, recipe_instance_id, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            l.part_id,
            l.quantity,
            l.source,
            l.recipe_instance_id ?? null,
            l.sort_order ?? ++i * 10,
          ],
        );
      }
      await tx.all(`UPDATE projects SET updated_at = now() WHERE id = ?`, [id]);
    });

    return new Response(JSON.stringify({ saved: lines.length }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

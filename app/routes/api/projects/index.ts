import { define } from "../../../utils.ts";
import { queryAll, queryOne } from "../../../db/client.ts";

export const handler = define.handlers({
  // List projects with draft-line counts, newest first.
  async GET() {
    const rows = await queryAll(
      `SELECT pj.id, pj.name, pj.solution_code, pj.status,
              pj.created_at, pj.updated_at,
              COUNT(dl.id)::int AS draft_count
       FROM projects pj
       LEFT JOIN project_draft_lines dl ON dl.project_id = pj.id
       GROUP BY pj.id
       ORDER BY pj.updated_at DESC`,
    );
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Create a project: { name, solution_code? }
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return new Response("name is required", { status: 400 });
    const solutionCode =
      typeof body?.solution_code === "string" && body.solution_code.trim()
        ? body.solution_code.trim()
        : null;

    const row = await queryOne(
      `INSERT INTO projects (name, solution_code)
       VALUES (?, ?)
       RETURNING id, name, solution_code, status, created_at, updated_at`,
      [name, solutionCode],
    );
    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
});

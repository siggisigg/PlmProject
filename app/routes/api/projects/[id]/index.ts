import { define } from "../../../../utils.ts";
import { queryOne } from "../../../../db/client.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const row = await queryOne(
      `SELECT id, name, solution_code, status, created_at, updated_at
       FROM projects WHERE id = ?`,
      [id],
    );
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Rename / edit solution_code. Rejected once the project is complete.
  async PATCH(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const project = await queryOne<{ status: string }>(
      `SELECT status FROM projects WHERE id = ?`,
      [id],
    );
    if (!project) return new Response("Not found", { status: 404 });
    if (project.status === "complete") {
      return new Response("Project is complete and read-only", { status: 409 });
    }

    const body = await ctx.req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const solutionCode = typeof body?.solution_code === "string"
      ? body.solution_code.trim()
      : null;
    if (!name && solutionCode === null) {
      return new Response("Nothing to update", { status: 400 });
    }

    const row = await queryOne(
      `UPDATE projects
       SET name          = COALESCE(?, name),
           solution_code = COALESCE(?, solution_code),
           updated_at    = now()
       WHERE id = ?
       RETURNING id, name, solution_code, status, created_at, updated_at`,
      [name, solutionCode, id],
    );
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

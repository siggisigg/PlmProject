import { define } from "../../utils.ts";
import { queryAll } from "../../db/client.ts";

export const handler = define.handlers({
  GET(_ctx) {
    const rows = queryAll(
      `SELECT id, name, description, version, is_active, created_at, updated_at
       FROM recipes
       WHERE is_active = 1
       ORDER BY name`,
    );
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

import { define } from "../../utils.ts";
import { queryAll } from "../../db/client.ts";

export const handler = define.handlers({
  async GET(_ctx) {
    const rows = await queryAll(
      `SELECT id, name, description, version, is_active, created_at, updated_at
       FROM recipes
       WHERE is_active = true
       ORDER BY name`,
    );
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

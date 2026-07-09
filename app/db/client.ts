import postgres from "postgres";

function connString(): string {
  const url = Deno.env.get("DATABASE_URL");
  if (url) return url;
  const u = Deno.env.get("POSTGRES_USER") ?? "plm";
  const p = Deno.env.get("POSTGRES_PASSWORD") ?? "";
  const h = Deno.env.get("POSTGRES_HOST") ?? "localhost";
  const port = Deno.env.get("POSTGRES_PORT") ?? "5432";
  const db = Deno.env.get("POSTGRES_DB") ?? "plm";
  return `postgresql://${u}:${p}@${h}:${port}/${db}`;
}

const sql = postgres(connString(), {
  // postgres.js returns NUMERIC/DECIMAL as strings by default to preserve
  // precision. The UI does arithmetic (quantity * unit_price), so parse
  // numeric (OID 1700) → JS number at the boundary. Storage precision is
  // still enforced by PostgreSQL's numeric type.
  types: {
    numeric: {
      to: 1700,
      from: [1700],
      parse: (x: string) => parseFloat(x),
      serialize: (x: number) => String(x),
    },
  },
});

// Convert '?' placeholders to '$1,$2,...' so existing route SQL is untouched.
function toPg(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

/** Run a SELECT and return all rows as plain objects. */
export async function queryAll<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await sql.unsafe(toPg(text), params as never[]);
  return rows as unknown as T[];
}

/** Run a SELECT and return the first row or undefined. */
export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const rows = await queryAll<T>(text, params);
  return rows[0];
}

/** Transaction-bound query helpers passed to withTx callbacks. */
export interface Tx {
  all<T extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
  one<T extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T | undefined>;
}

/**
 * Run `fn` inside a single transaction. Rolls back on throw.
 * Query text uses the same '?' placeholders as queryAll/queryOne.
 */
export async function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const result = await sql.begin(async (s) => {
    const all = async <R extends Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ): Promise<R[]> => {
      const rows = await s.unsafe(toPg(text), params as never[]);
      return rows as unknown as R[];
    };
    const tx: Tx = {
      all,
      one: async <R extends Record<string, unknown>>(
        text: string,
        params: unknown[] = [],
      ) => (await all<R>(text, params))[0],
    };
    return await fn(tx);
  });
  return result as T;
}

export default sql;

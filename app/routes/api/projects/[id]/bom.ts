import { define } from "../../../../utils.ts";
import { queryAll, queryOne } from "../../../../db/client.ts";

// Read the frozen snapshot tree. Never touches live part costs — everything
// comes from project_bom_lines (via project_bom_detail / project_bom_rollup).
export const handler = define.handlers({
  async GET(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const project = await queryOne(
      `SELECT id, name, solution_code, status, created_at, updated_at
       FROM projects WHERE id = ?`,
      [id],
    );
    if (!project) return new Response("Not found", { status: 404 });

    const lines = await queryAll(
      `SELECT d.id, d.project_id, d.part_id, d.effective_qty,
              d.snapshot_unit_cost, d.snapshot_unit_price,
              d.snapshot_installation_cost, d.currency, d.source,
              d.snapshotted_at, d.plm_part_number, d.description,
              d.production_type, d.bom_type, d.parent_line_id, d.is_assembly,
              d.level_path, d.sort_order,
              r.rolled_cost, r.rolled_price, r.rolled_installation
       FROM project_bom_detail d
       LEFT JOIN project_bom_rollup r ON r.id = d.id
       WHERE d.project_id = ?
       ORDER BY d.sort_order`,
      [id],
    );

    const totals = await queryOne(
      `SELECT SUM(effective_qty * snapshot_unit_cost)          AS total_cost,
              SUM(effective_qty * snapshot_unit_price)         AS total_price,
              SUM(effective_qty * snapshot_installation_cost)  AS total_installation
       FROM project_bom_lines
       WHERE project_id = ? AND NOT is_assembly`,
      [id],
    );

    const url = new URL(ctx.req.url);
    if (url.searchParams.get("format") === "csv") {
      return csvResponse(
        project as Record<string, unknown>,
        lines as unknown as CsvLine[],
        totals as Record<string, number | null>,
      );
    }

    return new Response(JSON.stringify({ project, lines, totals }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});

interface CsvLine {
  effective_qty: number;
  snapshot_unit_cost: number | null;
  snapshot_unit_price: number | null;
  snapshot_installation_cost: number | null;
  currency: string;
  plm_part_number: string;
  description: string | null;
  production_type: string | null;
  bom_type: string;
  is_assembly: boolean;
  level_path: string | null;
  rolled_cost: number | null;
  rolled_price: number | null;
}

// Hierarchical CSV: tree order, Level column, part numbers indented by depth.
// Assembly rows carry read-time rollups; leaf rows carry frozen unit values.
function csvResponse(
  project: Record<string, unknown>,
  lines: CsvLine[],
  totals: Record<string, number | null>,
): Response {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const num = (v: number | null) => (v === null ? "" : String(v));

  const header = [
    "Level",
    "Part Number",
    "Description",
    "Type",
    "Qty",
    "Unit Cost",
    "Unit Price",
    "Installation",
    "Total Cost",
    "Total Price",
    "Currency",
  ];
  const rows = lines.map((l) => {
    const depth = l.level_path ? l.level_path.split(".").length - 1 : 0;
    const indent = "  ".repeat(depth);
    const totalCost = l.is_assembly
      ? l.rolled_cost
      : l.snapshot_unit_cost === null
      ? null
      : l.effective_qty * l.snapshot_unit_cost;
    const totalPrice = l.is_assembly
      ? l.rolled_price
      : l.snapshot_unit_price === null
      ? null
      : l.effective_qty * l.snapshot_unit_price;
    return [
      esc(l.level_path),
      esc(indent + l.plm_part_number),
      esc(l.description),
      esc(
        l.is_assembly
          ? "ASSEMBLY"
          : `${l.bom_type}${
            l.production_type ? ` (${l.production_type})` : ""
          }`,
      ),
      String(l.effective_qty),
      l.is_assembly ? "" : num(l.snapshot_unit_cost),
      l.is_assembly ? "" : num(l.snapshot_unit_price),
      l.is_assembly ? "" : num(l.snapshot_installation_cost),
      num(totalCost),
      num(totalPrice),
      esc(l.currency),
    ].join(",");
  });

  const totalCost = totals.total_cost ?? 0;
  const totalPrice = totals.total_price ?? 0;
  const marginPct = totalPrice > 0
    ? ((totalPrice - totalCost) / totalPrice * 100).toFixed(1)
    : "";
  const footer = [
    "",
    ["", esc("TOTAL COST"), "", "", "", "", "", "", num(totalCost), "", ""]
      .join(","),
    ["", esc("TOTAL PRICE"), "", "", "", "", "", "", "", num(totalPrice), ""]
      .join(","),
    [
      "",
      esc("TOTAL INSTALLATION"),
      "",
      "",
      "",
      "",
      "",
      num(totals.total_installation),
      "",
      "",
      "",
    ].join(","),
    ["", esc("MARGIN %"), "", "", "", "", "", "", "", esc(marginPct), ""].join(
      ",",
    ),
  ];

  const csv = [header.join(","), ...rows, ...footer].join("\r\n");
  const slug = String(project.name ?? "project").replace(/[^\w-]+/g, "-")
    .toLowerCase();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bom-${slug}-${
        new Date().toISOString().slice(0, 10)
      }.csv"`,
    },
  });
}

import { define } from "../../../../utils.ts";
import { queryOne, type Tx, withTx } from "../../../../db/client.ts";

// "Complete BOM" — the snapshot. Expands every draft line to its full frozen
// tree in project_bom_lines and flips the project to 'complete', all in one
// transaction. After this, the project's financials never move (CLAUDE.md
// rule 3); the immutability trigger blocks UPDATE/DELETE on snapshot rows.
//
// Conventions:
//   * Assembly rows are structural: snapshot money NULL (CHECK-enforced).
//   * Leaf rows freeze the CURRENT revision's cost/price/installation.
//   * Parts with no current revision snapshot NULL money (absence is
//     information — never coalesce to 0).
//   * Draft lines whose part has no imported BOM (including seed assemblies)
//     become single root-level leaf rows carrying their revision money.

interface DraftRow extends Record<string, unknown> {
  id: number;
  part_id: number;
  quantity: number;
  source: string | null;
  is_assembly: boolean;
  bom_header_id: number | null;
  unit_cost: number | null;
  unit_price: number | null;
  installation_cost: number | null;
  currency: string | null;
}

interface TreeRow extends Record<string, unknown> {
  bom_line_id: number;
  parent_bom_line_id: number | null;
  part_id: number;
  eff_qty: number;
  is_assembly: boolean;
  unit_cost: number | null;
  unit_price: number | null;
  installation_cost: number | null;
  currency: string | null;
}

async function insertLine(
  tx: Tx,
  projectId: number,
  row: {
    part_id: number;
    effective_qty: number;
    is_assembly: boolean;
    unit_cost: number | null;
    unit_price: number | null;
    installation_cost: number | null;
    currency: string | null;
    source: string | null;
    parent_line_id: number | null;
    level_path: string;
    sort_order: number;
  },
): Promise<number> {
  const inserted = await tx.one<{ id: number }>(
    `INSERT INTO project_bom_lines
       (project_id, part_id, effective_qty, is_assembly,
        snapshot_unit_cost, snapshot_unit_price, snapshot_installation_cost,
        currency, source, parent_line_id, level_path, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      projectId,
      row.part_id,
      row.effective_qty,
      row.is_assembly,
      row.is_assembly ? null : row.unit_cost,
      row.is_assembly ? null : row.unit_price,
      row.is_assembly ? null : row.installation_cost,
      row.currency ?? "ISK",
      row.source,
      row.parent_line_id,
      row.level_path,
      row.sort_order,
    ],
  );
  return inserted!.id;
}

export const handler = define.handlers({
  async POST(ctx) {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) return new Response("Bad id", { status: 400 });

    const project = await queryOne<{ status: string }>(
      `SELECT status FROM projects WHERE id = ?`,
      [id],
    );
    if (!project) return new Response("Not found", { status: 404 });
    if (project.status === "complete") {
      return new Response("Project already complete", { status: 409 });
    }

    const result = await withTx(async (tx) => {
      const drafts = await tx.all<DraftRow>(
        `SELECT dl.id, dl.part_id, dl.quantity, dl.source,
                p.is_assembly,
                bh.id AS bom_header_id,
                pr.unit_cost, pr.unit_price, pr.installation_cost, pr.currency
         FROM project_draft_lines dl
         JOIN parts p ON p.id = dl.part_id
         LEFT JOIN LATERAL (
           SELECT id FROM bom_headers
           WHERE root_part_id = p.id
           ORDER BY imported_at DESC
           LIMIT 1
         ) bh ON true
         LEFT JOIN part_revisions pr
                ON pr.part_id = p.id AND pr.valid_to IS NULL
         WHERE dl.project_id = ?
         ORDER BY dl.sort_order NULLS LAST, dl.id`,
        [id],
      );
      if (drafts.length === 0) {
        throw new Response("Draft is empty — nothing to snapshot", {
          status: 400,
        });
      }

      let sortCounter = 0;
      let leafCount = 0;
      let assemblyCount = 0;
      // Assemblies that have BOTH an imported BOM and their own revision cost:
      // expansion wins, the revision cost is ignored. Surfaced as a warning.
      let ignoredRevisionCostCount = 0;

      let rootIndex = 0;
      for (const draft of drafts) {
        rootIndex++;
        const rootPath = String(rootIndex);

        if (draft.bom_header_id === null) {
          // Plain part, or assembly without an imported BOM: one leaf-style
          // root row carrying its own revision money.
          await insertLine(tx, id, {
            part_id: draft.part_id,
            effective_qty: draft.quantity,
            is_assembly: false,
            unit_cost: draft.unit_cost,
            unit_price: draft.unit_price,
            installation_cost: draft.installation_cost,
            currency: draft.currency,
            source: draft.source,
            parent_line_id: null,
            level_path: rootPath,
            sort_order: ++sortCounter,
          });
          leafCount++;
          continue;
        }

        // Assembly with an imported BOM: structural root row, then the
        // expanded tree. Flat electrical BOMs need no special-casing — all
        // their lines are anchor rows (parent_line_id IS NULL) under the root.
        if (draft.unit_cost !== null || draft.unit_price !== null) {
          ignoredRevisionCostCount++;
        }
        const rootId = await insertLine(tx, id, {
          part_id: draft.part_id,
          effective_qty: draft.quantity,
          is_assembly: true,
          unit_cost: null,
          unit_price: null,
          installation_cost: null,
          currency: draft.currency,
          source: draft.source,
          parent_line_id: null,
          level_path: rootPath,
          sort_order: ++sortCounter,
        });
        assemblyCount++;

        // Expand, multiplying quantities down the tree. ORDER BY path sorts
        // parents before their children (array prefix ordering).
        const rows = await tx.all<TreeRow>(
          `WITH RECURSIVE tree AS (
             SELECT bl.id AS bom_line_id, NULL::int AS parent_bom_line_id,
                    bl.part_id, (bl.quantity * ?::numeric) AS eff_qty,
                    p.is_assembly,
                    ARRAY[COALESCE(bl.sort_order, bl.id)] AS path
             FROM bom_lines bl JOIN parts p ON p.id = bl.part_id
             WHERE bl.bom_header_id = ? AND bl.parent_line_id IS NULL
             UNION ALL
             SELECT bl.id, bl.parent_line_id, bl.part_id,
                    (bl.quantity * t.eff_qty), p.is_assembly,
                    t.path || COALESCE(bl.sort_order, bl.id)
             FROM bom_lines bl
             JOIN tree t ON bl.parent_line_id = t.bom_line_id
             JOIN parts p ON p.id = bl.part_id
           )
           SELECT t.bom_line_id, t.parent_bom_line_id, t.part_id, t.eff_qty,
                  t.is_assembly,
                  pr.unit_cost, pr.unit_price, pr.installation_cost, pr.currency
           FROM tree t
           LEFT JOIN part_revisions pr
                  ON pr.part_id = t.part_id AND pr.valid_to IS NULL
           ORDER BY t.path`,
          [draft.quantity, draft.bom_header_id],
        );

        // Two-pass parent wiring: rows arrive parents-first; map each
        // bom_lines.id to its new project_bom_lines.id as we insert.
        const idMap = new Map<number, number>();
        const pathMap = new Map<number, string>(); // bom_line_id → level_path
        const childCounter = new Map<string, number>(); // parent path → next child ordinal
        for (const row of rows) {
          const parentSnapshotId = row.parent_bom_line_id === null
            ? rootId
            : idMap.get(row.parent_bom_line_id)!;
          const parentPath = row.parent_bom_line_id === null
            ? rootPath
            : pathMap.get(row.parent_bom_line_id)!;
          const ordinal = (childCounter.get(parentPath) ?? 0) + 1;
          childCounter.set(parentPath, ordinal);
          const path = `${parentPath}.${ordinal}`;

          const newId = await insertLine(tx, id, {
            part_id: row.part_id,
            effective_qty: row.eff_qty,
            is_assembly: row.is_assembly,
            unit_cost: row.unit_cost,
            unit_price: row.unit_price,
            installation_cost: row.installation_cost,
            currency: row.currency,
            source: draft.source,
            parent_line_id: parentSnapshotId,
            level_path: path,
            sort_order: ++sortCounter,
          });
          idMap.set(row.bom_line_id, newId);
          pathMap.set(row.bom_line_id, path);
          if (row.is_assembly) assemblyCount++;
          else leafCount++;
        }
      }

      // Status flips AFTER the inserts, in the same tx — the immutability
      // trigger only guards UPDATE/DELETE, so inserts above are unaffected.
      await tx.all(
        `UPDATE projects SET status = 'complete', updated_at = now()
         WHERE id = ?`,
        [id],
      );

      return {
        snapshot_lines: sortCounter,
        leaf_lines: leafCount,
        assembly_lines: assemblyCount,
        warnings: ignoredRevisionCostCount > 0
          ? [
            `${ignoredRevisionCostCount} assembly draft line(s) had their own revision cost; BOM expansion took precedence and the revision cost was ignored.`,
          ]
          : [],
      };
    }).catch((e) => {
      if (e instanceof Response) return e;
      throw e;
    });

    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
});

/**
 * Comparison table — the single most important visualization for the site's
 * thesis. It puts well-formed? / provable? / true? side by side for the four
 * canonical examples so the learner *sees* that the columns disagree.
 */
import type { ComparisonTableViz } from "../../types";
import { RichLine } from "../Math";

const CELL: Record<"yes" | "no" | "n/a", { text: string; cls: string }> = {
  yes: { text: "yes", cls: "cell-yes" },
  no: { text: "no", cls: "cell-no" },
  "n/a": { text: "n/a", cls: "cell-na" },
};

export function ComparisonTable({ viz }: { viz: ComparisonTableViz }) {
  return (
    <div className="comparison-table" role="img" aria-label={viz.textualSummary}>
      <table>
        <thead>
          <tr>
            <th scope="col">Expression</th>
            {viz.columns.map((c) => (
              <th key={c} scope="col">
                <RichLine text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viz.rows.map((row, i) => (
            <tr key={i}>
              <th scope="row" className="ct-rowlabel">
                <RichLine text={row.label} />
              </th>
              {viz.columns.map((col) => {
                const cell = row.cells[col];
                if (!cell) return <td key={col} />;
                const meta = CELL[cell.value];
                return (
                  <td key={col} className={meta.cls} title={cell.note}>
                    <span className="cell-value">{meta.text}</span>
                    {cell.note && <span className="cell-note">{cell.note}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Parse-tree explorer. Rendered as a recursive, expandable HTML tree (NOT React
 * Flow) because the data is a tree and the pedagogical act is "expand a sentence
 * into its grammatical parts." Each node is tagged with its grammatical category
 * so the learner sees term vs formula vs sentence vs symbol explicitly.
 *
 * It also shows a malformed string failing to parse, side by side, to make
 * "well-formed" concrete and contrastive.
 */
import { useState } from "react";
import type { ParseNode, ParseTreeViz } from "../../types";
import { RichLine } from "../Math";

const CATEGORY_LABEL: Record<ParseNode["category"], string> = {
  sentence: "sentence",
  formula: "formula",
  term: "term",
  symbol: "symbol",
  quantifier: "quantifier",
};

function TreeNode({ node, depth }: { node: ParseNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = !!node.children?.length;
  return (
    <li className="pt-node">
      <div className={`pt-row pt-cat-${node.category}`}>
        {hasChildren ? (
          <button
            className="pt-toggle"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            title={open ? "collapse" : "expand"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="pt-toggle pt-leaf">•</span>
        )}
        <span className="pt-tag">{CATEGORY_LABEL[node.category]}</span>
        <span className="pt-label">
          <RichLine text={node.label} />
        </span>
      </div>
      {hasChildren && open && (
        <ul className="pt-children">
          {node.children!.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ParseTree({ viz }: { viz: ParseTreeViz }) {
  return (
    <div className="parse-tree" role="img" aria-label={viz.textualSummary}>
      <ul className="pt-root">
        <TreeNode node={viz.root} depth={0} />
      </ul>
      {viz.malformedExample && (
        <div className="pt-malformed">
          <span className="pt-malformed-badge">does not parse</span>
          <code className="pt-malformed-input">{viz.malformedExample.input}</code>
          <span className="pt-malformed-reason">{viz.malformedExample.reason}</span>
        </div>
      )}
      <div className="pt-key" aria-hidden>
        <span className="pt-tag pt-cat-sentence">sentence</span>
        <span className="pt-tag pt-cat-formula">formula</span>
        <span className="pt-tag pt-cat-term">term</span>
        <span className="pt-tag pt-cat-quantifier">quantifier</span>
        <span className="pt-tag pt-cat-symbol">symbol</span>
      </div>
    </div>
  );
}

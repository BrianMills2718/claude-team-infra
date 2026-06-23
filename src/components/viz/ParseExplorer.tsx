/**
 * Interactive parse / parse-failure explorer (ADR-0002, Phase 3).
 *
 * Three panels: the formation RULES, a row of selectable example strings, and a
 * result that either renders the rule-by-rule parse tree (legal) or names the
 * exact rule that can't apply (illegal). Selecting an example highlights the
 * rules its parse uses (or the rule its failure tried), so "why does this parse
 * and that doesn't" is shown, not asserted.
 */
import { useMemo, useState } from "react";
import type { ParseExplorerViz, ParseNode } from "../../types";
import { RichLine } from "../Math";

const CATEGORY_LABEL: Record<ParseNode["category"], string> = {
  sentence: "sentence",
  formula: "formula",
  term: "term",
  symbol: "symbol",
  quantifier: "quantifier",
};

/** Collect every ruleId used in a parse tree (to highlight in the rules panel). */
function rulesUsed(node: ParseNode, acc: Set<string> = new Set()): Set<string> {
  if (node.ruleId) acc.add(node.ruleId);
  node.children?.forEach((c) => rulesUsed(c, acc));
  return acc;
}

function TreeNode({ node, depth }: { node: ParseNode; depth: number }) {
  const [open, setOpen] = useState(depth < 3);
  const hasChildren = !!node.children?.length;
  return (
    <li className="pt-node">
      <div className={`pt-row pt-cat-${node.category}`}>
        {hasChildren ? (
          <button className="pt-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="pt-toggle pt-leaf">•</span>
        )}
        <span className="pt-tag">{CATEGORY_LABEL[node.category]}</span>
        <span className="pt-label">
          <RichLine text={node.label} />
        </span>
        {node.ruleId && <span className="pe-by">by {node.ruleId}</span>}
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

export function ParseExplorer({ viz }: { viz: ParseExplorerViz }) {
  const [sel, setSel] = useState(0);
  const ex = viz.examples[sel];

  const highlight = useMemo(() => {
    if (ex.legal && ex.tree) return rulesUsed(ex.tree);
    if (ex.failure) return new Set([ex.failure.ruleTried]);
    return new Set<string>();
  }, [ex]);

  return (
    <div className="parse-explorer" role="img" aria-label={viz.textualSummary}>
      <div className="pe-examples" role="tablist" aria-label="Example strings">
        {viz.examples.map((e, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === sel}
            className={`pe-pick ${i === sel ? "is-active" : ""} ${i === sel ? (e.legal ? "is-legal" : "is-illegal") : ""}`}
            onClick={() => setSel(i)}
          >
            <RichLine text={e.input} />
          </button>
        ))}
      </div>

      <div className="pe-body">
        <div className="pe-rules">
          <h5>Formation rules</h5>
          <ul>
            {viz.rules.map((r) => (
              <li key={r.id} className={`pe-rule pe-rule-${r.category} ${highlight.has(r.id) ? "is-used" : ""}`}>
                <code className="pe-rule-id">{r.id}</code>
                <span className="pe-rule-text">
                  <RichLine text={r.text} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pe-result">
          {ex.legal && ex.tree ? (
            <>
              <div className="pe-verdict is-legal">✓ well-formed — there is a parse</div>
              <ul className="pt-root">
                <TreeNode node={ex.tree} depth={0} />
              </ul>
            </>
          ) : ex.failure ? (
            <>
              <div className="pe-verdict is-illegal">✗ malformed — no parse exists</div>
              <div className="pe-fail">
                <div className="pe-fail-at">
                  fails at <code>{ex.failure.at}</code>
                </div>
                <div className="pe-fail-reason">{ex.failure.reason}</div>
                <div className="pe-fail-rule">
                  rule that can't apply: <code>{ex.failure.ruleTried}</code>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

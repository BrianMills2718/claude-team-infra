/**
 * The Gödel-sentence self-reference loop. Renders the four stations
 *   G_T  →(encodes_as)→  ⌜G_T⌝  →(inserted into)→  ¬Prov_T(⌜G_T⌝)  →(is exactly)→  G_T
 * as a cycle, with an explicit banner that the self-reference is mediated by
 * coding (the Fixed-Point Lemma), NOT magic and NOT the liar paradox.
 */
import type { GodelLoopViz } from "../../types";
import { RichLine } from "../Math";

export function GodelLoop({ viz }: { viz: GodelLoopViz }) {
  return (
    <div className="godel-loop" role="img" aria-label={viz.textualSummary}>
      <div className="gl-banner">self-reference via coding — guaranteed by the Fixed-Point Lemma, not magic</div>
      <ol className="gl-stations">
        {viz.stations.map((s, i) => (
          <li className="gl-station" key={i}>
            <div className="gl-card">
              <div className="gl-card-main">
                <RichLine text={s.label} />
              </div>
              {s.sub && (
                <div className="gl-card-sub">
                  <RichLine text={s.sub} />
                </div>
              )}
            </div>
            <div className={`gl-arrow ${i === viz.stations.length - 1 ? "gl-arrow-loop" : ""}`}>
              <span className="gl-arrow-label">{viz.arrows[i]}</span>
              <span className="gl-arrow-glyph" aria-hidden>
                {i === viz.stations.length - 1 ? "↺" : "↓"}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="gl-foot">
        The last arrow closes the loop: <code>T ⊢ G_T ↔ ¬Prov_T(⌜G_T⌝)</code> — the
        two are <em>provably equivalent</em> (the Fixed-Point Lemma's biconditional),
        not the same string. So <code>G_T</code> says of its own code that no number
        codes a proof of it.
      </p>
    </div>
  );
}

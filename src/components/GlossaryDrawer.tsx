/**
 * Slide-in glossary drawer. Searchable; each entry shows definition, example,
 * and related terms. Always available (keyboard: 'g') so no technical word is
 * ever stranded without a definition — an explicit acceptance criterion.
 */
import { useMemo, useState } from "react";
import { GLOSSARY } from "../content/glossary";
import { RichLine } from "./Math";

export function GlossaryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter(
      (e) =>
        e.term.toLowerCase().includes(needle) ||
        e.definition.toLowerCase().includes(needle),
    );
  }, [q]);

  return (
    <>
      <div
        className={`drawer-scrim ${open ? "show" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`glossary-drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
        aria-label="Glossary"
      >
        <div className="drawer-head">
          <h3>Glossary</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close glossary">
            ×
          </button>
        </div>
        <input
          className="drawer-search"
          placeholder="Search terms…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="drawer-body">
          {filtered.map((e) => (
            <div className="gloss-entry" key={e.term} id={`gloss-${e.term}`}>
              <h4>{e.term}</h4>
              <p>
                <RichLine text={e.definition} />
              </p>
              {e.example && (
                <p className="gloss-example">
                  e.g. <RichLine text={e.example} />
                </p>
              )}
              {e.related.length > 0 && (
                <p className="gloss-related">
                  related: {e.related.map((r) => (
                    <span className="gloss-tag" key={r}>{r}</span>
                  ))}
                </p>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="gloss-empty">No matching terms.</p>}
        </div>
      </aside>
    </>
  );
}

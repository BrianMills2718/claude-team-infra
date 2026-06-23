/**
 * Open Debates (#/debates). Renders the CONTESTED claims from the claim ledger
 * (src/content/debates.ts, derived from claims.jsonl) so a learner sees the live
 * positions and arguments in the field — not just the curriculum's consensus.
 */
import { DEBATES } from "../content/debates";

/** Short, readable label for a source URL (host + a hint), opening in a new tab. */
function sourceLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceLinks({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <span className="dv-sources">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="dv-source">
          {sourceLabel(u)}
        </a>
      ))}
    </span>
  );
}

export function DebatesView() {
  return (
    <div className="debates-view">
      <header className="dv-head">
        <h1>Open debates</h1>
        <p className="dv-intro">
          The curriculum teaches a defensible setup, but the field is still arguing about
          parts of it. These are the live debates — each with the named positions and their
          evidence — so you can decide with eyes open. Derived from the verified claim ledger.
        </p>
      </header>

      <ol className="dv-list">
        {DEBATES.map((d) => (
          <li key={d.id} className="dv-card">
            <h2 className="dv-question">{d.question}</h2>
            <div className="dv-positions">
              {d.positions.map((p) => (
                <div key={p.name} className="dv-position">
                  <span className="dv-badge">{p.name}</span>
                  <p className="dv-claim">{p.claim}</p>
                  <SourceLinks urls={p.sources} />
                </div>
              ))}
            </div>
            {d.sources.length > 0 && (
              <footer className="dv-foot">
                <span className="dv-foot-label">Background</span>
                <SourceLinks urls={d.sources} />
              </footer>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

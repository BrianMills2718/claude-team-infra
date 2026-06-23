/**
 * Compendium (#/compendium). A browsable, distilled reference of team-setup /
 * optimal-use / best-practice material, synthesized from a full sweep of all 150
 * Claude Code docs pages (scripts/docs-sweep → synthesize-compendium). Each theme is
 * one section rendered from markdown; a sticky table of contents lets you jump around.
 */
import { useState } from "react";
import { Markdown } from "./Math";
import COMPENDIUM from "../content/compendium.json";

interface Entry { theme: string; markdown: string }
const ENTRIES = COMPENDIUM as Entry[];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CompendiumView() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!ENTRIES.length) {
    return (
      <div className="compendium">
        <h1>Compendium</h1>
        <p className="cm-intro">The compendium is being compiled from the full docs sweep.</p>
      </div>
    );
  }
  return (
    <div className="compendium">
      <header className="cm-head">
        <h1>Team setup compendium</h1>
        <p className="cm-intro">
          A distilled reference for setting up and optimally running Claude Code (+ Codex) on a
          team — synthesized from a complete sweep of all {150} official docs pages. Use the
          contents to jump to a theme; each section is dense and dedup'd.
        </p>
      </header>

      <nav className="cm-toc" aria-label="Compendium contents">
        <span className="cm-toc-label">Contents</span>
        <ul>
          {ENTRIES.map((e) => (
            <li key={e.theme}><a href={`#/compendium#${slugify(e.theme)}`} onClick={() => setOpen((o) => ({ ...o, [e.theme]: true }))}>{e.theme}</a></li>
          ))}
        </ul>
      </nav>

      <div className="cm-body">
        {ENTRIES.map((e) => {
          const isOpen = open[e.theme] ?? false;
          return (
            <section className="cm-section" id={slugify(e.theme)} key={e.theme}>
              <button className="cm-toggle" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [e.theme]: !isOpen }))}>
                <span className="cm-chevron">{isOpen ? "▾" : "▸"}</span> {e.theme}
              </button>
              {isOpen && <div className="cm-content"><Markdown text={stripLeadH1(e.markdown)} /></div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Drop a leading `## Theme` / `# Theme` line — the toggle already shows the theme. */
function stripLeadH1(md: string): string {
  return md.replace(/^\s*#{1,2}\s+.*\n/, "");
}

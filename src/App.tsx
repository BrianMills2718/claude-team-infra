/**
 * App shell + routing (ADR-0001). The skill tree is the homepage; routes:
 *   #/ or #/tree   → SkillTree
 *   #/node/<id>    → NodeDetail
 *   #/stage-<n>    → legacy redirect to the concept node for that stage
 * Hash-based so the static bundle deploys anywhere.
 */
import { useEffect, useState } from "react";
import { SkillTree } from "./components/SkillTree";
import { NodeDetail } from "./components/NodeDetail";
import { ConceptGraphView } from "./components/ConceptGraphView";
import { Sidebar } from "./components/Sidebar";
import { GlossaryDrawer } from "./components/GlossaryDrawer";
import { nodeForLesson } from "./content/graph";

type Route = { kind: "tree" } | { kind: "node"; id: string } | { kind: "concepts" };

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  if (h === "" || h === "tree") return { kind: "tree" };
  if (h === "concepts") return { kind: "concepts" };
  if (h.startsWith("node/")) return { kind: "node", id: h.slice(5) };
  if (h.startsWith("stage-")) {
    const n = nodeForLesson(h);
    if (n) return { kind: "node", id: n.id };
  }
  return { kind: "tree" };
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export function App() {
  const route = useRoute();
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      if (e.key === "g") setGlossaryOpen((o) => !o);
      if (e.key === "Escape") setGlossaryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <Sidebar
        route={route}
        onOpenGlossary={() => setGlossaryOpen(true)}
      />
      <main id="main" className="main" tabIndex={-1}>
        {route.kind === "tree" ? (
          <SkillTree />
        ) : route.kind === "concepts" ? (
          <ConceptGraphView />
        ) : (
          <NodeDetail nodeId={route.id} />
        )}
      </main>
      <GlossaryDrawer open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  );
}

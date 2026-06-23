/**
 * Deriving the skill-map DAG from the concept graph (ADR-0003).
 *
 * The concept graph is the source of truth and MAY contain cycles (mutually-
 * defining concepts). The canonical way to turn a cyclic directed graph into a
 * DAG is strongly-connected-component (SCC) condensation: collapse each cycle
 * into one cluster, and the condensation is provably acyclic. We then lift
 * concept dependencies to the group level (the `introducedIn` grouping) to get
 * the skill-map's prerequisite edges.
 *
 * Pure functions over CONCEPT_GRAPH so both the app (rendering) and the
 * validator/report can use them.
 */
import { CONCEPT_GRAPH } from "./concepts";

/** Dependency edges as [prereq, concept] — the prereq must precede the concept. */
export function conceptDepEdges(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const c of CONCEPT_GRAPH.concepts)
    for (const p of c.prerequisites) out.push([p, c.id]);
  return out;
}

// --- goal-closure lens (ADR-0004 §9) -----------------------------------------
// A concept is "core" if it lies on the backward prerequisite closure of some
// declared terminal goal; otherwise it is "enrichment" — valuable context that
// is off the critical path to the goals (not a defect; see EDGE_REVIEW / §9).

/** The topic's declared terminal goals (the headline capabilities). */
export const GOAL_CONCEPTS = ["shared-library"];

/** All concepts on the backward prerequisite closure of `goals` (incl. goals). */
export function goalClosure(goals: string[] = GOAL_CONCEPTS): Set<string> {
  const m: Record<string, { prerequisites: string[] }> = Object.fromEntries(
    CONCEPT_GRAPH.concepts.map((c) => [c.id, c]),
  );
  const core = new Set<string>(goals);
  const st = [...goals];
  while (st.length) {
    const id = st.pop()!;
    for (const p of m[id]?.prerequisites ?? []) if (!core.has(p)) { core.add(p); st.push(p); }
  }
  return core;
}

/** "core" (on a goal's path) or "enrichment" (off it). */
export function conceptRole(id: string, core: Set<string> = goalClosure()): "core" | "enrichment" {
  return core.has(id) ? "core" : "enrichment";
}

/** Concepts that are no other concept's prerequisite (graph sinks). A sink that
 *  is not a declared goal is an "undeclared terminal" — an enrichment leaf or a
 *  goal worth declaring. */
export function sinks(): string[] {
  const hasDependent = new Set<string>();
  for (const c of CONCEPT_GRAPH.concepts) for (const p of c.prerequisites) hasDependent.add(p);
  return CONCEPT_GRAPH.concepts.map((c) => c.id).filter((id) => !hasDependent.has(id));
}

/** Concept id → the group (stage/lesson id) it is introduced in. */
export function conceptGroup(): Record<string, string> {
  const g: Record<string, string> = {};
  for (const c of CONCEPT_GRAPH.concepts) g[c.id] = c.introducedIn;
  return g;
}

/**
 * Tarjan's algorithm. Returns the SCCs of the dependency graph (edge p→c), each
 * a list of concept ids. Output order is reverse-topological (a component
 * appears before its prerequisites). Singletons are ordinary concepts;
 * multi-member components are "learn-together" clusters (genuine cycles).
 */
export function conceptSCCs(): string[][] {
  const ids = CONCEPT_GRAPH.concepts.map((c) => c.id);
  const adj: Record<string, string[]> = {};
  for (const id of ids) adj[id] = [];
  for (const [p, c] of conceptDepEdges()) if (adj[p]) adj[p].push(c);

  let idx = 0;
  const index: Record<string, number> = {};
  const low: Record<string, number> = {};
  const onStack: Record<string, boolean> = {};
  const stack: string[] = [];
  const comps: string[][] = [];

  const strongconnect = (v: string) => {
    index[v] = idx;
    low[v] = idx;
    idx++;
    stack.push(v);
    onStack[v] = true;
    for (const w of adj[v]) {
      if (index[w] === undefined) {
        strongconnect(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack[w]) {
        low[v] = Math.min(low[v], index[w]);
      }
    }
    if (low[v] === index[v]) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack[w] = false;
        comp.push(w);
      } while (w !== v);
      comps.push(comp);
    }
  };

  for (const id of ids) if (index[id] === undefined) strongconnect(id);
  return comps;
}

/** The multi-member SCCs only — the genuine cycles ("learn-together" clusters). */
export function conceptCycles(): string[][] {
  return conceptSCCs().filter((c) => c.length > 1);
}

/**
 * Skill-map prerequisite edges between groups, derived by lifting concept
 * dependencies to the group level (cross-group edges only), de-duplicated.
 * Returns [fromGroup, toGroup] (i.e. fromGroup is a prerequisite of toGroup).
 */
export function deriveStageEdges(): Array<[string, string]> {
  const grp = conceptGroup();
  const seen = new Set<string>();
  const edges: Array<[string, string]> = [];
  for (const [p, c] of conceptDepEdges()) {
    const a = grp[p];
    const b = grp[c];
    if (!a || !b || a === b) continue;
    const key = `${a}>${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([a, b]);
  }
  return edges;
}

/** True iff the directed edge set contains a cycle (DFS colouring). */
export function hasCycle(edges: Array<[string, string]>): boolean {
  const succ: Record<string, string[]> = {};
  const nodes = new Set<string>();
  for (const [a, b] of edges) { (succ[a] ??= []).push(b); nodes.add(a); nodes.add(b); }
  const color: Record<string, number> = {};
  let cyclic = false;
  const visit = (u: string) => {
    color[u] = 1;
    for (const v of succ[u] ?? []) {
      if (color[v] === 1) { cyclic = true; return; }
      if (!color[v]) { visit(v); if (cyclic) return; }
    }
    color[u] = 2;
  };
  for (const n of nodes) { if (!color[n]) visit(n); if (cyclic) break; }
  return cyclic;
}

/**
 * Transitive reduction of a DAG: drop edge (u,v) when v is reachable from u
 * through another successor (so only the minimal "covering" edges remain). Keeps
 * the derived skill map free of transitive shortcuts for a clean rendering.
 *
 * REQUIRES acyclic input: on a cyclic graph the reduction over-removes (it can
 * erase a cycle and destroy reachability), so we refuse it loudly — this is also
 * the gate that catches a prerequisite cycle smuggled in via the hand-authored
 * overlay (the union is reduced here; see graph.ts).
 */
export function transitiveReduction(edges: Array<[string, string]>): Array<[string, string]> {
  if (hasCycle(edges))
    throw new Error("transitiveReduction: input graph has a cycle — only DAGs may be reduced (a prerequisite cycle slipped past the acyclicity gate, e.g. via a pedagogical-overlay edge)");
  const succ: Record<string, Set<string>> = {};
  for (const [a, b] of edges) (succ[a] ??= new Set()).add(b);
  const reachFrom: Record<string, Set<string>> = {};
  const compute = (start: string): Set<string> => {
    if (reachFrom[start]) return reachFrom[start];
    const seen = new Set<string>();
    const st = [...(succ[start] ?? [])];
    while (st.length) {
      const n = st.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      st.push(...(succ[n] ?? []));
    }
    return (reachFrom[start] = seen);
  };
  const result: Array<[string, string]> = [];
  for (const [u, v] of edges) {
    let redundant = false;
    for (const w of succ[u] ?? []) {
      if (w === v) continue;
      if (compute(w).has(v)) { redundant = true; break; }
    }
    if (!redundant) result.push([u, v]);
  }
  return result;
}

/** Reachability closure of a directed edge set: node → set of nodes reachable. */
export function reachability(edges: Array<[string, string]>): Record<string, Set<string>> {
  const adj: Record<string, string[]> = {};
  const nodes = new Set<string>();
  for (const [a, b] of edges) { (adj[a] ??= []).push(b); nodes.add(a); nodes.add(b); }
  const memo: Record<string, Set<string>> = {};
  const dfs = (n: string, acc: Set<string>) => {
    for (const m of adj[n] ?? []) if (!acc.has(m)) { acc.add(m); dfs(m, acc); }
  };
  for (const n of nodes) { // every node (incl. sinks) gets an entry, never undefined
    const acc = new Set<string>();
    dfs(n, acc);
    memo[n] = acc;
  }
  return memo;
}

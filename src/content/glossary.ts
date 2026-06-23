/**
 * Glossary — DERIVED from the concept graph (ADR-0003: concepts.ts is the source of
 * truth; the glossary, like the skill map, follows). Each concept becomes one entry:
 * term + its definition, with `related` linking to its prerequisites and contrasts.
 * Editing a concept updates the glossary automatically; there is no second authority
 * to keep in sync. (Replaces the hand-authored Gödel glossary — stress-finding S7.)
 */
import type { GlossaryEntry } from "../types";
import { CONCEPT_GRAPH, CONCEPT_BY_ID } from "./concepts";

const termOf = (id: string): string | undefined => CONCEPT_BY_ID[id]?.term;

export const GLOSSARY: GlossaryEntry[] = CONCEPT_GRAPH.concepts.map((c) => ({
  term: c.term,
  definition: c.short,
  example: c.example,
  related: [...(c.prerequisites ?? []), ...(c.contrasts ?? [])]
    .map(termOf)
    .filter((t): t is string => !!t),
}));

export const GLOSSARY_INDEX: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.map((e) => [e.term.toLowerCase(), e]),
);

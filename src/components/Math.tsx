/**
 * Rendering primitives: KaTeX + a small but real markdown renderer that composes
 * with inline math and inline definition chips.
 *
 * Renderers by capability:
 *   - Tex:       one KaTeX expression (inline or block), never throws.
 *   - MathText:  text with $...$ / $$...$$ ONLY (no chips, no emphasis). Used by
 *                the definition chips themselves to avoid recursive chips.
 *   - RichLine:  one line of prose — math + chips (@n{key}, @t{slug|label}) +
 *                **bold** / *italic* / `code`. Used for single-line fields.
 *   - Markdown:  block-level prose — paragraphs, `-` and `1.` lists, and pipe
 *                tables — with each line rendered by RichLine. Used for lesson
 *                section bodies.
 *
 * WHY hand-rolled rather than a markdown lib: lesson bodies use a tiny, fixed
 * subset and must interleave $math$, @chips, and emphasis. One tokenizer that
 * understands all three avoids plugin glue and keeps failures in our own code.
 */
import { useMemo, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { NotationChip, TermChip, ConceptChip } from "./Definitions";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderTex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, strict: false });
  } catch {
    // Fail visibly but safely — never inject unescaped content as HTML.
    return `<span class="tex-error">${escapeHtml(tex)}</span>`;
  }
}

/** Inline (or block) math, e.g. <Tex>{"\\forall x"}</Tex>. */
export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(() => renderTex(children, block), [children, block]);
  const Tag = block ? "div" : "span";
  return <Tag className="tex" dangerouslySetInnerHTML={{ __html: html }} />;
}

// --- math-only renderer (used by definition chips) ---------------------------

function tokenizeMath(text: string): ReactNode[] {
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    out.push(
      <Tex key={k++} block={m[1] !== undefined}>
        {m[1] ?? m[2]}
      </Tex>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{text.slice(last)}</span>);
  return out;
}

export function MathText({ text }: { text: string }) {
  return <>{useMemo(() => tokenizeMath(text), [text])}</>;
}

// --- inline renderer: math + chips + emphasis --------------------------------

// Order matters: $$ before $, ** before *. Math/chip runs are matched before
// emphasis so a `*` inside math or a `_` in code never trips the emphasis rules.
// Template only — renderInline clones it per call (see below).
const INLINE_RE =
  /\$\$([^$]+)\$\$|\$([^$]+)\$|@n\{([^}]+)\}|@t\{([^}|]+)(?:\|([^}]+))?\}|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|@c\{([^}|]+)(?:\|([^}]+))?\}/g;

function renderInline(text: string): ReactNode[] {
  // renderInline recurses (bold/italic re-parse their inner text). A SHARED
  // global regex carries `lastIndex` state, so a recursive call would reset the
  // outer loop's position → it re-matches forever (a synchronous infinite loop
  // that freezes the page). Clone per call so each frame has its own lastIndex.
  const re = new RegExp(INLINE_RE.source, INLINE_RE.flags);
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    if (m[1] !== undefined) out.push(<Tex key={k++} block>{m[1]}</Tex>);
    else if (m[2] !== undefined) out.push(<Tex key={k++}>{m[2]}</Tex>);
    else if (m[3] !== undefined) out.push(<NotationChip key={k++} keyName={m[3]} />);
    else if (m[4] !== undefined) out.push(<TermChip key={k++} slug={m[4]} label={m[5]} />);
    else if (m[6] !== undefined) out.push(<strong key={k++}>{renderInline(m[6])}</strong>);
    else if (m[7] !== undefined) out.push(<em key={k++}>{renderInline(m[7])}</em>);
    else if (m[8] !== undefined) out.push(<code key={k++}>{m[8]}</code>);
    else if (m[9] !== undefined) out.push(<ConceptChip key={k++} id={m[9]} label={m[10]} />);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{text.slice(last)}</span>);
  return out;
}

/** One line of prose: math + chips + emphasis. */
export function RichLine({ text }: { text: string }) {
  return <>{useMemo(() => renderInline(text), [text])}</>;
}

// --- block-level markdown ----------------------------------------------------

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] };

const isBullet = (l: string) => /^-\s+/.test(l);
const isOrdered = (l: string) => /^\d+\.\s+/.test(l);
const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
const splitCells = (l: string) =>
  l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitCells(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
    } else if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
    } else if (isOrdered(line)) {
      const items: string[] = [];
      while (i < lines.length && isOrdered(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
    } else {
      // Always consume the current line first, so a stray "|...|" line that is
      // NOT a real table (no separator row) can't stall the loop forever.
      const para: string[] = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !isBullet(lines[i]) &&
        !isOrdered(lines[i]) &&
        !(isTableRow(lines[i]) && isTableSep(lines[i + 1] ?? ""))
      ) {
        para.push(lines[i]);
        i++;
      }
      blocks.push({ kind: "p", lines: para });
    }
  }
  return blocks;
}

function renderBlock(b: Block, key: number): ReactNode {
  switch (b.kind) {
    case "p":
      // <div> not <p>: a paragraph may contain block math ($$) which renders a
      // <div>, illegal inside <p>.
      return (
        <div className="md-p" key={key}>
          <RichLine text={b.lines.join(" ")} />
        </div>
      );
    case "ul":
      return (
        <ul className="md-ul" key={key}>
          {b.items.map((it, j) => (
            <li key={j}><RichLine text={it} /></li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="md-ol" key={key}>
          {b.items.map((it, j) => (
            <li key={j}><RichLine text={it} /></li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="md-table-wrap" key={key}>
          <table className="md-table">
            <thead>
              <tr>{b.header.map((h, j) => <th key={j}><RichLine text={h} /></th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}><RichLine text={c} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Block-level markdown for lesson section bodies. */
export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text.trim()), [text]);
  return <>{blocks.map((b, i) => renderBlock(b, i))}</>;
}

/** Back-compat alias — prose bodies render as markdown. */
export const RichText = Markdown;

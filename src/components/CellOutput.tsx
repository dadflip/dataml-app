import { useState } from "react";
import type { ExecResult, DisplayOut } from "@/lib/kernel";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Download,
  Image,
  Loader2,
  Maximize2,
  Terminal,
  X,
  Table,
  FileText,
  Braces,
  SquareCode,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "prism-react-renderer";

// ─── ANSI stripping ───────────────────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][AB]/g;
const CTRL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "").replace(CTRL_RE, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({
  tone,
  children,
}: {
  tone: "success" | "danger" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]"
      : tone === "danger"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}

function OutputBlock({
  icon,
  kind,
  badge,
  children,
}: {
  icon: React.ReactNode;
  kind: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="flex items-center gap-1.5 border-b border-border bg-card/60 px-3 py-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {kind}
        </span>
        <span className="ml-auto">{badge}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Image Display ───────────────────────────────────────────────────────────
function ImageDisplay({ mime, data }: { mime: string; data: string }) {
  const [open, setOpen] = useState(false);
  const isSvg = mime === "image/svg+xml";
  const src = isSvg
    ? `data:${mime};utf8,${encodeURIComponent(data)}`
    : `data:${mime};base64,${data}`;

  return (
    <>
      <OutputBlock
        icon={<Image className="h-3 w-3" />}
        kind={mime}
        badge={
          <div className="flex items-center gap-1.5">
            <a
              href={src}
              download={`output.${mime.split("/")[1]}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Télécharger"
            >
              <Download className="h-3 w-3" />
            </a>
            <button
              onClick={() => setOpen(true)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Agrandir"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <Badge tone="success">ok</Badge>
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group block w-full overflow-hidden rounded-lg border border-border transition hover:border-foreground/30"
          title="Cliquer pour agrandir"
        >
          {isSvg ? (
            <div
              className="max-h-[420px] w-full object-contain transition group-hover:opacity-95"
              dangerouslySetInnerHTML={{ __html: data }}
            />
          ) : (
            <img
              src={src}
              alt="output"
              className="max-h-[420px] w-full object-contain transition group-hover:opacity-95"
            />
          )}
        </button>
      </OutputBlock>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] gap-2 border-border bg-card p-3 sm:max-w-[95vw]">
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {mime}
            </span>
            <div className="flex items-center gap-1">
              <a
                href={src}
                download={`output.${mime.split("/")[1]}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                Télécharger
              </a>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex max-h-[85vh] items-center justify-center overflow-auto rounded-lg bg-[oklch(0.08_0.004_260)] p-2">
            {isSvg ? (
              <div
                className="max-h-[80vh] w-auto max-w-full object-contain"
                dangerouslySetInnerHTML={{ __html: data }}
              />
            ) : (
              <img
                src={src}
                alt="output"
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── HTML Display ───────────────────────────────────────────────────────────
function HtmlDisplay({ data }: { data: string }) {
  return (
    <div
      className="overflow-auto text-xs"
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
}

// ─── Markdown Display ────────────────────────────────────────────────────────
function MarkdownDisplay({ data }: { data: string }) {
  return (
    <div className="prose max-w-none text-xs dark:prose-invert">
      <ReactMarkdown>{data}</ReactMarkdown>
    </div>
  );
}

// ─── LaTeX Display ─────────────────────────────────────────────────────────
function LatexDisplay({ data }: { data: string }) {
  return (
    <div
      className="overflow-auto text-xs"
      dangerouslySetInnerHTML={{
        __html: `<div class="katex">$$${data}$$</div>`,
      }}
    />
  );
}

// ─── JSON Display ─────────────────────────────────────────────────────────
function JsonDisplay({ data }: { data: string }) {
  try {
    const parsed = JSON.parse(data);
    return (
      <pre className="max-h-64 overflow-auto p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px]">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    return (
      <pre className="max-h-64 overflow-auto p-2 bg-red-50 dark:bg-red-900/20 rounded font-mono text-[11px] text-red-500">
        {data}
      </pre>
    );
  }
}

// ─── Table Display (CSV/TSV) ────────────────────────────────────────────────
function TableDisplay({ data, mime }: { data: string; mime: string }) {
  const separator = mime === "text/csv" ? "," : "\t";
  const rows = data.split("\n").map((row) => row.split(separator));

  return (
    <div className="overflow-auto">
      <table className="border-collapse border border-gray-300 dark:border-gray-600 w-full">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-gray-50 dark:bg-gray-800" : ""}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border border-gray-300 dark:border-gray-600 p-2 font-mono text-[11px]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Code Display (Syntax Highlighting) ────────────────────────────────────
function CodeDisplay({ data, language }: { data: string; language: string }) {
  return (
    <SyntaxHighlighter
      language={language}
      theme={undefined} // Utilise le thème par défaut (adapté au mode sombre/clair)
      className="rounded font-mono text-[11px]"
    >
      {data}
    </SyntaxHighlighter>
  );
}

// ─── Text Display (Fallback) ────────────────────────────────────────────────
function TextDisplay({ data }: { data: string }) {
  return (
    <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80">
      {stripAnsi(data)}
    </pre>
  );
}

// ─── DisplayBlock (Main Logic) ───────────────────────────────────────────────
function DisplayBlock({ mime, data, metadata }: DisplayOut) {
  // Utiliser les métadonnées pour déterminer le rendu
  const renderAs = metadata?.renderAs;
  const isTrusted = metadata?.isTrusted || false;

  // Si renderAs est défini, l'utiliser
  if (renderAs) {
    switch (renderAs) {
      case "image":
        return <ImageDisplay mime={mime} data={data} />;
      case "html":
        return (
          <OutputBlock
            icon={<Code2 className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <HtmlDisplay data={data} />
            {!isTrusted && (
              <p className="text-xs text-yellow-500 mt-2">
                Contenu HTML non vérifié. Utilisez un sanitizer comme DOMPurify.
              </p>
            )}
          </OutputBlock>
        );
      case "markdown":
        return (
          <OutputBlock
            icon={<FileText className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <MarkdownDisplay data={data} />
          </OutputBlock>
        );
      case "latex":
        return (
          <OutputBlock
            icon={<SquareCode className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <LatexDisplay data={data} />
          </OutputBlock>
        );
      case "json":
        return (
          <OutputBlock
            icon={<Braces className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <JsonDisplay data={data} />
          </OutputBlock>
        );
      case "table":
        return (
          <OutputBlock
            icon={<Table className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <TableDisplay data={data} mime={mime} />
          </OutputBlock>
        );
      case "code":
        const language = mime.split("/")[1] || "text";
        return (
          <OutputBlock
            icon={<Code2 className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <CodeDisplay data={data} language={language} />
          </OutputBlock>
        );
      default:
        return (
          <OutputBlock
            icon={<Code2 className="h-3 w-3" />}
            kind={mime}
            badge={<Badge tone="success">ok</Badge>}
          >
            <TextDisplay data={data} />
          </OutputBlock>
        );
    }
  }

  // Fallback pour les anciens appels sans métadonnées
  if (mime.startsWith("image/")) {
    return <ImageDisplay mime={mime} data={data} />;
  }

  if (mime === "text/html") {
    return (
      <OutputBlock
        icon={<Code2 className="h-3 w-3" />}
        kind="text/html"
        badge={<Badge tone="success">ok</Badge>}
      >
        <HtmlDisplay data={data} />
      </OutputBlock>
    );
  }

  return (
    <OutputBlock
      icon={<Code2 className="h-3 w-3" />}
      kind={mime}
      badge={<Badge tone="success">ok</Badge>}
    >
      <TextDisplay data={data} />
    </OutputBlock>
  );
}

// ─── ErrorBlock ───────────────────────────────────────────────────────────────
function ErrorBlock({ text }: { text: string }) {
  const clean = stripAnsi(text)
    .replace(/^[-─═]+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <OutputBlock
      icon={<AlertTriangle className="h-3 w-3 text-destructive" />}
      kind="stderr"
      badge={<Badge tone="danger">error</Badge>}
    >
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-destructive">
        {clean}
      </pre>
    </OutputBlock>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
interface Props {
  output: ExecResult;
}

export function CellOutput({ output }: Props) {
  const hasContent =
    output.stdout || output.stderr || output.displays.length > 0;

  if (output.status === "running") {
    return (
      <OutputBlock
        icon={<Loader2 className="h-3 w-3 animate-spin" />}
        kind="exécution en cours"
        badge={<Badge tone="muted">running</Badge>}
      >
        <p className="font-mono text-[11px] text-muted-foreground">
          Exécution de la cellule…
        </p>
      </OutputBlock>
    );
  }

  if (!hasContent) return null;

  return (
    <div className="space-y-2">
      {output.stdout && (
        <OutputBlock
          icon={<Terminal className="h-3 w-3" />}
          kind="stdout"
          badge={
            <Badge tone={output.status === "ok" ? "success" : "muted"}>
              ok
            </Badge>
          }
        >
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/90">
            {stripAnsi(output.stdout)}
          </pre>
        </OutputBlock>
      )}

      {output.stderr && <ErrorBlock text={output.stderr} />}

      {output.displays.map((d, i) => (
        <DisplayBlock key={i} {...d} />
      ))}
    </div>
  );
}

// components/CellOutput.tsx
import type { ExecResult } from "@/lib/kernel";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Image,
  Loader2,
  Terminal,
} from "lucide-react";

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
          badge={<Badge tone={output.status === "ok" ? "success" : "muted"}>ok</Badge>}
        >
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/90">
            {output.stdout}
          </pre>
        </OutputBlock>
      )}

      {output.stderr && (
        <OutputBlock
          icon={<AlertTriangle className="h-3 w-3 text-destructive" />}
          kind="stderr"
          badge={<Badge tone="danger">error</Badge>}
        >
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-destructive">
            {output.stderr}
          </pre>
        </OutputBlock>
      )}

      {output.displays.map((d, i) => (
        <DisplayBlock key={i} mime={d.mime} data={d.data} />
      ))}
    </div>
  );
}

function DisplayBlock({ mime, data }: { mime: string; data: string }) {
  if (mime.startsWith("image/")) {
    return (
      <OutputBlock
        icon={<Image className="h-3 w-3" />}
        kind="image"
        badge={<Badge tone="success">ok</Badge>}
      >
        <img
          src={`data:${mime};base64,${data}`}
          alt="output"
          className="max-w-full rounded-lg border border-border"
        />
      </OutputBlock>
    );
  }

  if (mime === "text/html") {
    return (
      <OutputBlock
        icon={<Code2 className="h-3 w-3" />}
        kind="text/html"
        badge={<Badge tone="success">ok</Badge>}
      >
        <div
          className="overflow-auto text-xs"
          dangerouslySetInnerHTML={{ __html: data }}
        />
      </OutputBlock>
    );
  }

  // text/plain or fallback
  return (
    <OutputBlock
      icon={<Code2 className="h-3 w-3" />}
      kind={mime === "text/plain" ? "text/plain" : mime}
      badge={<Badge tone="success">ok</Badge>}
    >
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-foreground/80">
        {mime === "text/plain" ? data : `[${mime}] ${data.slice(0, 200)}`}
      </pre>
    </OutputBlock>
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

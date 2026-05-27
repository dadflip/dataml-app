import { useMemo, useState, useEffect } from "react";
import type { ParamDef } from "@/lib/pipeline";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  X,
  FileText,
  FolderOpen,
  Columns3,
  Hash,
  Type,
  Code2,
  HelpCircle,
  HardDrive,
  AlignLeft,
} from "lucide-react";

const STRING_KINDS = new Set(["string", "file", "dir", "column"]);

function literalToDisplay(kind: ParamDef["kind"], lit: string): string {
  if (!lit) return "";
  if (kind === "text") {
    const m = lit.match(/^("""|''')([\s\S]*)\1$/);
    return m ? m[2] : lit;
  }
  if (STRING_KINDS.has(kind)) {
    const m = lit.match(/^["'](.*)["']$/s);
    return m ? m[1] : lit;
  }
  return lit;
}

function displayToLiteral(kind: ParamDef["kind"], value: string): string {
  if (value === "") return "";
  if (kind === "text") {
    // Use triple double-quotes; escape any existing triple-double-quote in body.
    const safe = value.replace(/"""/g, '\\"\\"\\"');
    return `"""${safe}"""`;
  }
  if (STRING_KINDS.has(kind)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

const KIND_META: Record<string, { icon: any; label: string }> = {
  file: { icon: FileText, label: "fichier" },
  dir: { icon: FolderOpen, label: "dossier" },
  column: { icon: Columns3, label: "colonne" },
  boolean: { icon: Code2, label: "bool" },
  int: { icon: Hash, label: "int" },
  number: { icon: Hash, label: "float" },
  string: { icon: Type, label: "str" },
  expr: { icon: Code2, label: "expr" },
};

// ─── Path hints ───────────────────────────────────────────────────────────────
// Detect the OS from the existing value to show the right placeholder.
function pathPlaceholder(kind: "file" | "dir", value: string): string {
  const isWindows = /^[A-Za-z]:[/\\]/.test(value);
  if (kind === "dir") {
    return isWindows ? "C:\\Users\\moi\\data" : "/home/moi/data";
  }
  return isWindows ? "C:\\Users\\moi\\data\\dataset.csv" : "/home/moi/data/dataset.csv";
}

// ─── FilePathInput ────────────────────────────────────────────────────────────
// Dedicated widget for file/dir params. Shows a tip explaining that the path
// is evaluated on the kernel machine (local or remote).

function FilePathInput({
  kind,
  value,
  onChange,
}: {
  kind: "file" | "dir";
  value: string;
  onChange: (v: string) => void;
}) {
  const placeholder = pathPlaceholder(kind, value);

  // Detect if the value looks like a relative path (no leading / or drive letter)
  const isRelative =
    value.length > 0 && !/^[/\\]/.test(value) && !/^[A-Za-z]:/.test(value);

  return (
    <div className="space-y-1.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 rounded-lg font-mono text-xs"
        spellCheck={false}
      />
      <div className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2 py-1.5">
        <HardDrive className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          {isRelative ? (
            <>
              Chemin <span className="text-[color:var(--color-warning)]">relatif</span> — résolu
              depuis le répertoire de lancement du gateway.
            </>
          ) : (
            <>
              Chemin évalué sur la machine qui exécute le kernel{" "}
              <span className="text-foreground/60">(local ou distant)</span>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── ParamInput ───────────────────────────────────────────────────────────────

interface Props {
  param: ParamDef;
  override?: string;
  onChange: (literal: string) => void;
  onReset: () => void;
}

export function ParamInput({ param, override, onChange, onReset }: Props) {
  const current = override ?? param.defaultLiteral;
  const display = useMemo(() => literalToDisplay(param.kind, current), [current, param.kind]);

  const [numericKind, setNumericKind] = useState<string>(param.kind);

  useEffect(() => {
    if (param.kind === "int" || param.kind === "number") {
      setNumericKind(param.kind);
    }
  }, [param.kind]);

  const meta = KIND_META[param.kind] || { icon: HelpCircle, label: param.kind || "inconnu" };
  const Icon = meta.icon;
  const isOverridden = override !== undefined && override !== "";

  const handleText = (v: string) => onChange(displayToLiteral(param.kind, v));

  const renderInputControl = () => {
    if (param.kind === "boolean") {
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={current === "True"}
            onCheckedChange={(v) => onChange(v ? "True" : "False")}
          />
          <span className="font-mono text-[11px] text-muted-foreground">{current}</span>
        </div>
      );
    }

    if (param.kind === "int" || param.kind === "number") {
      return (
        <div className="flex gap-1.5">
          <Input
            type="number"
            step={numericKind === "int" ? "1" : "any"}
            value={display}
            onChange={(e) => handleText(e.target.value)}
            className="h-8 flex-1 rounded-lg font-mono text-xs"
          />
          <select
            value={numericKind}
            onChange={(e) => setNumericKind(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 font-mono text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            title="Choisir le type numérique"
          >
            <option value="number">float</option>
            <option value="int">int</option>
          </select>
        </div>
      );
    }

    if (param.kind === "file" || param.kind === "dir") {
      return (
        <FilePathInput
          kind={param.kind}
          value={display}
          onChange={(v) => handleText(v)}
        />
      );
    }

    const placeholders: Record<string, string> = {
      column: "target",
    };

    return (
      <Input
        value={display}
        onChange={(e) => handleText(e.target.value)}
        placeholder={placeholders[param.kind] ?? ""}
        className="h-8 rounded-lg font-mono text-xs"
      />
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="truncate font-mono text-[11px] text-foreground" title={param.name}>
          {param.name}
        </span>
        <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {meta.label}
        </span>
        {isOverridden && (
          <button
            onClick={onReset}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            aria-label="Réinitialiser"
            title="Réinitialiser à la valeur par défaut"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {renderInputControl()}
    </div>
  );
}

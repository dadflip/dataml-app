import { useMemo } from "react";
import type { ParamDef } from "@/lib/pipeline";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X, FileText, FolderOpen, Columns3, Hash, Type, Code2 } from "lucide-react";

/**
 * Convertit la valeur de override (litéral Python brut) en valeur d'édition (string lisible).
 */
function literalToDisplay(kind: ParamDef["kind"], lit: string): string {
  if (!lit) return "";
  if (kind === "string" || kind === "file" || kind === "dir" || kind === "column") {
    const m = lit.match(/^["'](.*)["']$/);
    return m ? m[1] : lit;
  }
  return lit;
}

function displayToLiteral(kind: ParamDef["kind"], value: string): string {
  if (value === "") return "";
  if (kind === "string" || kind === "file" || kind === "dir" || kind === "column") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

const KIND_META: Record<
  ParamDef["kind"],
  { icon: typeof FileText; label: string }
> = {
  file: { icon: FileText, label: "fichier" },
  dir: { icon: FolderOpen, label: "dossier" },
  column: { icon: Columns3, label: "colonne" },
  boolean: { icon: Code2, label: "bool" },
  int: { icon: Hash, label: "int" },
  number: { icon: Hash, label: "float" },
  string: { icon: Type, label: "str" },
  expr: { icon: Code2, label: "expr" },
};

interface Props {
  param: ParamDef;
  override?: string;
  onChange: (literal: string) => void;
  onReset: () => void;
}

export function ParamInput({ param, override, onChange, onReset }: Props) {
  const current = override ?? param.defaultLiteral;
  const display = useMemo(
    () => literalToDisplay(param.kind, current),
    [current, param.kind]
  );

  const meta = KIND_META[param.kind];
  const Icon = meta.icon;
  const isOverridden = override !== undefined && override !== "";

  const handleText = (v: string) =>
    onChange(displayToLiteral(param.kind, v));

  return (
    <div className="rounded-xl border border-border bg-card/60 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="truncate font-mono text-[11px] text-foreground">
          {param.name}
        </span>

        <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {meta.label}
        </span>

        {isOverridden && (
          <button
            onClick={onReset}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {param.kind === "boolean" ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={current === "True"}
            onCheckedChange={(v) => onChange(v ? "True" : "False")}
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {current}
          </span>
        </div>
      ) : param.kind === "int" || param.kind === "number" ? (
        <Input
          type="number"
          step={param.kind === "int" ? 1 : "any"}
          value={display}
          onChange={(e) => handleText(e.target.value)}
          className="h-8 rounded-lg font-mono text-xs"
        />
      ) : (
        <Input
          value={display}
          onChange={(e) => handleText(e.target.value)}
          placeholder={
            param.kind === "file"
              ? "/path/to/data.csv"
              : param.kind === "dir"
              ? "/path/to/folder"
              : param.kind === "column"
              ? "target"
              : ""
          }
          className="h-8 rounded-lg font-mono text-xs"
        />
      )}
    </div>
  );
}

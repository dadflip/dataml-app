import { useMemo, useState, useEffect } from "react";
import type { ParamDef } from "@/lib/pipeline";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X, FileText, FolderOpen, Columns3, Hash, Type, Code2, HelpCircle } from "lucide-react";

const STRING_KINDS = new Set(["string", "file", "dir", "column"]);

function literalToDisplay(kind: ParamDef["kind"], lit: string): string {
  if (!lit) return "";
  if (STRING_KINDS.has(kind)) {
    const m = lit.match(/^["'](.*)["']$/);
    return m ? m[1] : lit;
  }
  return lit;
}

function displayToLiteral(kind: ParamDef["kind"], value: string): string {
  if (value === "") return "";
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

interface Props {
  param: ParamDef;
  override?: string;
  onChange: (literal: string) => void;
  onReset: () => void;
}

export function ParamInput({ param, override, onChange, onReset }: Props) {
  const current = override ?? param.defaultLiteral;
  const display = useMemo(() => literalToDisplay(param.kind, current), [current, param.kind]);
  
  // État local pour permettre à l'utilisateur de changer le type numérique à la volée
  const [numericKind, setNumericKind] = useState<string>(param.kind);

  // Synchroniser si le parent change la définition du paramètre
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

    // Ajout du sélecteur pour les types numériques
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

    const placeholders: Record<string, string> = {
      file: "/path/to/data.csv",
      dir: "/path/to/folder",
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

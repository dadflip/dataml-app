import { useMemo, useState } from "react";
import type { ParamDef } from "@/lib/pipeline";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { X, FileText, FolderOpen, Columns3, Hash, Type, Code2, Percent } from "lucide-react";

// ---------------------------------------------------------------------------
// Literal ↔ display helpers
// ---------------------------------------------------------------------------

function literalToDisplay(kind: ParamDef["kind"], lit: string): string {
  if (!lit) return "";
  if (kind === "string" || kind === "file" || kind === "dir" || kind === "column") {
    const m = lit.match(/^["'](.*)["']$/s);
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

// ---------------------------------------------------------------------------
// Kind metadata
// ---------------------------------------------------------------------------

const KIND_META: Record<ParamDef["kind"], { icon: typeof FileText; label: string; color: string }> = {
  file:    { icon: FileText,    label: "file",   color: "text-blue-400" },
  dir:     { icon: FolderOpen,  label: "dir",    color: "text-amber-400" },
  column:  { icon: Columns3,    label: "col",    color: "text-violet-400" },
  boolean: { icon: Code2,       label: "bool",   color: "text-emerald-400" },
  ratio:   { icon: Percent,     label: "ratio",  color: "text-rose-400" },
  int:     { icon: Hash,        label: "int",    color: "text-cyan-400" },
  number:  { icon: Hash,        label: "float",  color: "text-cyan-400" },
  string:  { icon: Type,        label: "str",    color: "text-orange-400" },
  expr:    { icon: Code2,       label: "expr",   color: "text-fuchsia-400" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Numeric input with optional min/max/step constraints */
function NumericInput({
  value,
  step,
  min,
  max,
  onChange,
}: {
  value: string;
  step: number | "any";
  min?: number;
  max?: number;
  onChange: (v: string) => void;
}) {
  const [raw, setRaw] = useState(value);

  const commit = (v: string) => {
    let n = parseFloat(v);
    if (isNaN(n)) { onChange(""); return; }
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    const out = step === 1 ? String(Math.round(n)) : String(n);
    setRaw(out);
    onChange(out);
  };

  return (
    <div className="flex items-center gap-1">
      {min !== undefined && (
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{min}</span>
      )}
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={raw !== value ? raw : value}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
        className="h-8 rounded-lg font-mono text-xs text-center"
      />
      {max !== undefined && (
        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{max}</span>
      )}
    </div>
  );
}

/** Ratio: percentage input + visual fill bar (no slider) */
function RatioInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const num = parseFloat(value);
  const pct = isNaN(num) ? 0 : Math.round(Math.min(1, Math.max(0, num)) * 100);

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    onChange(String(Math.min(1, Math.max(0, n))));
  };

  const commitPct = (raw: string) => {
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    onChange(String(Math.min(1, Math.max(0, n / 100))));
  };

  return (
    <div className="space-y-1.5">
      {/* Visual fill bar */}
      <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-rose-400/70 transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Two inputs: raw [0–1] and percentage */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="relative">
          <Input
            type="number"
            step={0.01}
            min={0}
            max={1}
            value={isNaN(num) ? "" : num}
            onChange={(e) => commit(e.target.value)}
            className="h-7 rounded-lg font-mono text-[11px] pr-7"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground">
            0-1
          </span>
        </div>
        <div className="relative">
          <Input
            type="number"
            step={1}
            min={0}
            max={100}
            value={pct}
            onChange={(e) => commitPct(e.target.value)}
            className="h-7 rounded-lg font-mono text-[11px] pr-5"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted-foreground">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

/** Expression / multiline string */
function ExprInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      spellCheck={false}
      className={[
        "w-full resize-y rounded-lg border border-input bg-background px-3 py-1.5",
        "font-mono text-[11px] text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-1 focus:ring-ring",
      ].join(" ")}
      placeholder="expression Python…"
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  param: ParamDef;
  override?: string;
  onChange: (literal: string) => void;
  onReset: () => void;
}

export function ParamInput({ param, override, onChange, onReset }: Props) {
  const current = override ?? param.defaultLiteral ?? "";
  const display = useMemo(() => literalToDisplay(param.kind, current), [current, param.kind]);

  const meta = KIND_META[param.kind];
  const Icon = meta.icon;
  const isOverridden = override !== undefined && override !== "";

  const handleText = (v: string) => onChange(displayToLiteral(param.kind, v));

  // Placeholder contextuel
  const placeholder =
    param.kind === "file"
      ? "/path/to/data.csv"
      : param.kind === "dir"
        ? "/path/to/folder"
        : param.kind === "column"
          ? "nom_de_colonne"
          : "";

  return (
    <div
      className={[
        "group rounded-xl border bg-card/60 p-2.5 transition-colors",
        isOverridden ? "border-border/80 bg-card/90" : "border-border/40",
      ].join(" ")}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className={`h-3 w-3 shrink-0 ${meta.color}`} />

        <span
          className="truncate font-mono text-[11px] text-foreground"
          title={param.name}
        >
          {param.name}
        </span>

        {/* Type badge */}
        <span
          className={[
            "ml-auto shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px]",
            isOverridden
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {meta.label}
        </span>

        {/* Reset button — visible seulement si overridé */}
        {isOverridden && (
          <button
            onClick={onReset}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
            aria-label="Réinitialiser"
            title={`Réinitialiser (défaut : ${param.defaultLiteral ?? "—"})`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Default value hint (when not overridden and default exists) */}
      {!isOverridden && param.defaultLiteral && (
        <p className="mb-1.5 font-mono text-[9px] text-muted-foreground/60 truncate">
          défaut : {param.defaultLiteral}
        </p>
      )}

      {/* ---- Input by kind ---- */}

      {param.kind === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch
            checked={current === "True"}
            onCheckedChange={(v) => onChange(v ? "True" : "False")}
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            {current === "True" ? "True" : "False"}
          </span>
        </div>
      )}

      {param.kind === "ratio" && (
        <RatioInput value={display} onChange={onChange} />
      )}

      {param.kind === "int" && (
        <NumericInput
          value={display}
          step={1}
          min={param.min as number | undefined}
          max={param.max as number | undefined}
          onChange={onChange}
        />
      )}

      {param.kind === "number" && (
        <NumericInput
          value={display}
          step="any"
          min={param.min as number | undefined}
          max={param.max as number | undefined}
          onChange={onChange}
        />
      )}

      {param.kind === "expr" && (
        <ExprInput value={display} onChange={onChange} />
      )}

      {(param.kind === "string" ||
        param.kind === "file" ||
        param.kind === "dir" ||
        param.kind === "column") && (
        <Input
          value={display}
          onChange={(e) => handleText(e.target.value)}
          placeholder={placeholder}
          className="h-8 rounded-lg font-mono text-xs"
        />
      )}
    </div>
  );
}

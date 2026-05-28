import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  initInstance,
  renderIntegrationCode,
  type IntegrationField,
  type IntegrationSpec,
  type IntegrationsCatalog,
  type IntegrationsState,
} from "@/lib/integrations";
import {
  Plug2,
  HardDrive,
  Trophy,
  Boxes,
  LineChart,
  Activity,
  Database,
  Sparkles,
  Cloud,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  HardDrive,
  Trophy,
  Boxes,
  LineChart,
  Activity,
  Database,
  Sparkles,
};

interface Props {
  catalog: IntegrationsCatalog | null;
  state: IntegrationsState;
  onApply: (next: IntegrationsState) => void;
}

export function IntegrationsPanel({ catalog, state, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<IntegrationsState>(state);
  const [preview, setPreview] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => Object.values(local).filter((i) => i?.enabled).length,
    [local],
  );

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      // hydrate missing instances from catalog defaults
      const hydrated: IntegrationsState = { ...state };
      for (const s of catalog?.integrations ?? []) {
        if (!hydrated[s.id]) hydrated[s.id] = initInstance(s);
      }
      setLocal(hydrated);
      setPreview(null);
    }
  };

  const save = () => {
    onApply(local);
    setOpen(false);
  };

  const update = (id: string, patch: Partial<IntegrationsState[string]>) =>
    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const updateValue = (id: string, fieldId: string, value: string) =>
    setLocal((prev) => ({
      ...prev,
      [id]: { ...prev[id], values: { ...prev[id].values, [fieldId]: value } },
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full gap-1.5">
          <Plug2 className="h-3.5 w-3.5" />
          Intégrations
          {enabledCount > 0 && (
            <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[9px] text-background">
              {enabledCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug2 className="h-4 w-4" /> Intégrations externes
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Définies dans <code className="font-mono">configs/integrations_config.yaml</code>.
            Chaque intégration activée est injectée comme cellule Python en tête du notebook.
          </p>
        </DialogHeader>

        {!catalog ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chargement du catalogue d'intégrations…
          </div>
        ) : (
          <div className="space-y-3">
            {catalog.integrations.map((spec) => {
              const inst = local[spec.id] ?? initInstance(spec);
              return (
                <IntegrationSection
                  key={spec.id}
                  spec={spec}
                  enabled={inst.enabled}
                  values={inst.values}
                  showPreview={preview === spec.id}
                  onToggle={(v) => update(spec.id, { enabled: v })}
                  onValue={(fid, v) => updateValue(spec.id, fid, v)}
                  onTogglePreview={() =>
                    setPreview(preview === spec.id ? null : spec.id)
                  }
                />
              );
            })}

            <div className="flex items-start gap-2 rounded-lg border border-border bg-card/40 p-2.5 text-[11px] text-muted-foreground">
              <Cloud className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Les credentials sont stockés <strong>en local</strong> (localStorage) et envoyés
                uniquement au kernel Jupyter via la cellule générée. Aucun appel serveur.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="rounded-full">
              Annuler
            </Button>
          </DialogClose>
          <Button size="sm" className="rounded-full" onClick={save}>
            <Check className="h-3.5 w-3.5" /> Appliquer au notebook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── IntegrationSection ──────────────────────────────────────────────────────

function IntegrationSection({
  spec,
  enabled,
  values,
  showPreview,
  onToggle,
  onValue,
  onTogglePreview,
}: {
  spec: IntegrationSpec;
  enabled: boolean;
  values: Record<string, string>;
  showPreview: boolean;
  onToggle: (v: boolean) => void;
  onValue: (fieldId: string, v: string) => void;
  onTogglePreview: () => void;
}) {
  const Icon = (spec.icon && ICONS[spec.icon]) || Plug2;

  const visibleFields = spec.fields.filter((f) => {
    if (!f.when) return true;
    return Object.entries(f.when).every(([k, v]) => (values[k] ?? "") === v);
  });

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        enabled ? "border-foreground/30 bg-card/60" : "border-border bg-card/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-muted text-foreground/80">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold">{spec.name}</h4>
              {spec.docs_url && (
                <a
                  href={spec.docs_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Documentation"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {spec.description}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {enabled && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleFields.map((f) =>
              f.type === "textarea" ? (
                <div key={f.id} className="sm:col-span-2">
                  <FieldLabel field={f} />
                  <textarea
                    placeholder={f.placeholder}
                    value={values[f.id] ?? ""}
                    onChange={(e) => onValue(f.id, e.target.value)}
                    className="min-h-24 w-full rounded-lg border border-input bg-card/40 p-2 font-mono text-[11px] outline-none focus:border-foreground/30"
                  />
                  {f.hint && <FieldHint>{f.hint}</FieldHint>}
                </div>
              ) : f.type === "select" ? (
                <div key={f.id}>
                  <FieldLabel field={f} />
                  <select
                    value={values[f.id] ?? ""}
                    onChange={(e) => onValue(f.id, e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-card/40 px-2.5 text-xs"
                  >
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {f.hint && <FieldHint>{f.hint}</FieldHint>}
                </div>
              ) : (
                <div key={f.id}>
                  <FieldLabel field={f} />
                  <PasswordOrText
                    type={f.type}
                    placeholder={f.placeholder}
                    value={values[f.id] ?? ""}
                    onChange={(v) => onValue(f.id, v)}
                  />
                  {f.hint && <FieldHint>{f.hint}</FieldHint>}
                </div>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={onTogglePreview}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPreview ? "Masquer la cellule" : "Aperçu de la cellule Python"}
          </button>

          {showPreview && (
            <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-[oklch(0.1_0.004_260)] p-3 font-mono text-[10.5px] leading-relaxed text-foreground/90">
              <code>{renderIntegrationCode(spec, values)}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Field primitives ────────────────────────────────────────────────────────

function FieldLabel({ field }: { field: IntegrationField }) {
  return (
    <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {field.label}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[10px] text-muted-foreground/80">{children}</p>;
}

function PasswordOrText({
  type,
  value,
  onChange,
  placeholder,
}: {
  type: "text" | "password" | "number";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const isSecret = type === "password";
  return (
    <div className="relative">
      <Input
        type={isSecret && !reveal ? "password" : type === "number" ? "number" : "text"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs"
      />
      {isSecret && (
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground hover:text-foreground"
          aria-label={reveal ? "Masquer" : "Afficher"}
        >
          {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import type { CatalogBlock, ParsedCatalog } from "@/lib/pipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus, Database, BarChart3, Brain, LineChart, Package } from "lucide-react";

const BLOC_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Database,
  2: BarChart3,
  3: Brain,
  4: LineChart,
  5: Package,
};

interface Props {
  catalogs: ParsedCatalog[];
  onAdd: (b: CatalogBlock) => void;
}

export function CatalogBrowser({ catalogs, onAdd }: Props) {
  const [activeBloc, setActiveBloc] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const current = catalogs.find((c) => c.bloc === activeBloc)!;
  const allBlocks = useMemo(
    () => current.sections.flatMap((s) => s.blocks),
    [current],
  );
  const selected = allBlocks.find((b) => b.id === selectedId) ?? allBlocks[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Bloc tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-card/40 px-3 py-2">
        {catalogs.map((c) => {
          const Icon = BLOC_ICONS[c.bloc] ?? Database;
          const active = c.bloc === activeBloc;
          return (
            <button
              key={c.bloc}
              onClick={() => {
                setActiveBloc(c.bloc);
                setSelectedId(null);
              }}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="font-mono text-xs opacity-70">B{c.bloc}</span>
              {c.blocName}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] overflow-hidden">
        {/* Block list */}
        <div className="overflow-y-auto border-r border-border bg-card/20">
          {current.sections.map((section) => (
            <div key={section.name}>
              <div className="sticky top-0 bg-card/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                {section.name}
              </div>
              {section.blocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-sm transition ${
                    selected?.id === b.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="overflow-y-auto">
          {selected && <BlockDetail block={selected} onAdd={onAdd} contractRole={current.contract.role} />}
        </div>
      </div>
    </div>
  );
}

function BlockDetail({
  block,
  onAdd,
  contractRole,
}: {
  block: CatalogBlock;
  onAdd: (b: CatalogBlock) => void;
  contractRole: string;
}) {
  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>Bloc {block.bloc}</span>
          <span>·</span>
          <span>{block.section}</span>
          {block.library && (
            <>
              <span>·</span>
              <span>{block.library}</span>
            </>
          )}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{block.name}</h2>
        <p className="text-sm text-muted-foreground">{block.description}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {block.applies_to?.map((t) => (
            <Badge key={t} variant="secondary" className="font-mono text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
        <div className="pt-2">
          <Button onClick={() => onAdd(block)} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter au notebook
          </Button>
        </div>
      </header>

      {block.illustration_svg && (
        <div
          className="overflow-hidden rounded-lg border border-border"
          dangerouslySetInnerHTML={{ __html: block.illustration_svg }}
        />
      )}

      {block.when_to_use && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quand l'utiliser
          </h3>
          <p className="text-sm">{block.when_to_use}</p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {block.pros && (
          <section className="rounded-lg border border-border bg-card/40 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-success)]">
              Pros
            </h3>
            <ul className="space-y-1 text-sm">
              {block.pros.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-[color:var(--color-success)]">+</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {block.cons && (
          <section className="rounded-lg border border-border bg-card/40 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive">
              Cons
            </h3>
            <ul className="space-y-1 text-sm">
              {block.cons.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="text-destructive">−</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {block.use_cases && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cas d'usage
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {block.use_cases.map((u) => (
              <Badge key={u} variant="outline" className="text-xs">
                {u}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {block.hyperparameters && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hyperparamètres
          </h3>
          <div className="overflow-hidden rounded-md border border-border bg-card/40 font-mono text-xs">
            {Object.entries(block.hyperparameters).map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-border/50 px-3 py-1.5 last:border-0">
                <span className="w-32 shrink-0 text-primary">{k}</span>
                <span className="text-muted-foreground">{JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {block.code_template && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Code
          </h3>
          <pre className="max-h-96 overflow-auto rounded-md border border-border bg-[oklch(0.12_0.008_260)] p-4 font-mono text-xs leading-relaxed text-foreground/90">
            <code>{block.code_template}</code>
          </pre>
        </section>
      )}

      <p className="border-t border-border pt-3 font-mono text-[10px] text-muted-foreground">
        {contractRole}
      </p>
    </div>
  );
}

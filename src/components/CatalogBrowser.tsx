import { useMemo, useState } from "react";
import type { CatalogBlock, ParsedCatalog } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Database,
  BarChart3,
  Brain,
  LineChart,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [query, setQuery] = useState("");

  const current = catalogs.find((c) => c.bloc === activeBloc)!;
  const allBlocks = useMemo(
    () => current.sections.flatMap((s) => s.blocks),
    [current],
  );
  const filteredSections = useMemo(() => {
    if (!query.trim()) return current.sections;
    const q = query.toLowerCase();
    return current.sections
      .map((s) => ({
        ...s,
        blocks: s.blocks.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.description?.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.blocks.length > 0);
  }, [current, query]);

  const selected =
    allBlocks.find((b) => b.id === selectedId) ?? filteredSections[0]?.blocks[0] ?? allBlocks[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Bloc rail */}
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-card/30 px-4 py-3">
        {catalogs.map((c) => {
          const Icon = BLOC_ICONS[c.bloc] ?? Database;
          const active = c.bloc === activeBloc;
          const count = c.sections.reduce((s, sec) => s + sec.blocks.length, 0);
          return (
            <button
              key={c.bloc}
              onClick={() => {
                setActiveBloc(c.bloc);
                setSelectedId(null);
              }}
              className={`group flex shrink-0 items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-sm transition ${
                active
                  ? "border-foreground/20 bg-foreground text-background shadow-sm"
                  : "border-border bg-card/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col items-start leading-none">
                <span className="font-mono text-[9px] opacity-60">BLOC {c.bloc}</span>
                <span className="mt-0.5 text-xs font-medium">{c.blocName}</span>
              </div>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] ${
                  active ? "bg-background/15" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] overflow-hidden">
        {/* Block list */}
        <aside className="flex flex-col overflow-hidden border-r border-border bg-card/20">
          <div className="shrink-0 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="h-9 rounded-full border-border bg-card pl-8 text-xs"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-3">
            {filteredSections.map((section) => (
              <div key={section.name} className="mb-2">
                <div className="sticky top-0 z-10 bg-background/85 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                  {section.name}
                </div>
                {section.blocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`mx-2 my-0.5 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected?.id === b.id
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    }`}
                  >
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 transition ${
                        selected?.id === b.id ? "text-foreground" : "opacity-40"
                      }`}
                    />
                    <span className="truncate text-xs">{b.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filteredSections.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Aucun résultat
              </div>
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className="overflow-y-auto">
          {selected && (
            <BlockDetail block={selected} onAdd={onAdd} contractRole={current.contract.role} />
          )}
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
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <header className="space-y-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Bloc {block.bloc}</span>
          <span className="opacity-40">·</span>
          <span>{block.section}</span>
          {block.library && (
            <>
              <span className="opacity-40">·</span>
              <span>{block.library}</span>
            </>
          )}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{block.name}</h2>
        {block.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{block.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {block.applies_to?.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="pt-2">
          <Button
            onClick={() => onAdd(block)}
            size="sm"
            className="gap-1.5 rounded-full px-4"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter au notebook
          </Button>
        </div>
      </header>

      {block.illustration_svg && (
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card/30"
          dangerouslySetInnerHTML={{ __html: block.illustration_svg }}
        />
      )}

      {block.when_to_use && (
        <Section title="Quand l'utiliser">
          <p className="text-sm leading-relaxed">{block.when_to_use}</p>
        </Section>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {block.pros && (
          <ProConsCard
            title="Pros"
            items={block.pros}
            symbol="+"
            tone="text-[color:var(--color-success)]"
          />
        )}
        {block.cons && (
          <ProConsCard
            title="Cons"
            items={block.cons}
            symbol="−"
            tone="text-destructive"
          />
        )}
      </div>

      {block.use_cases && (
        <Section title="Cas d'usage">
          <div className="flex flex-wrap gap-1.5">
            {block.use_cases.map((u) => (
              <span
                key={u}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
              >
                {u}
              </span>
            ))}
          </div>
        </Section>
      )}

      {block.hyperparameters && (
        <Section title="Hyperparamètres">
          <div className="overflow-hidden rounded-xl border border-border bg-card/40 font-mono text-xs">
            {Object.entries(block.hyperparameters).map(([k, v]) => (
              <div
                key={k}
                className="flex gap-3 border-b border-border/60 px-3.5 py-2 last:border-0"
              >
                <span className="w-36 shrink-0 text-foreground">{k}</span>
                <span className="text-muted-foreground">{JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {block.code_template && (
        <Section title="Code">
          <pre className="max-h-[28rem] overflow-auto rounded-2xl border border-border bg-[oklch(0.1_0.004_260)] p-5 font-mono text-xs leading-relaxed text-foreground/90">
            <code>{block.code_template}</code>
          </pre>
        </Section>
      )}

      <p className="border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">
        {contractRole}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ProConsCard({
  title,
  items,
  symbol,
  tone,
}: {
  title: string;
  items: string[];
  symbol: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <h3 className={`mb-2.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>
        {title}
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((p) => (
          <li key={p} className="flex gap-2.5">
            <span className={`shrink-0 ${tone}`}>{symbol}</span>
            <span className="text-foreground/90">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

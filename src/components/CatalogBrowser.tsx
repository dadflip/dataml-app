import { useMemo, useState } from "react";
import type { CatalogBlock, ParsedCatalog } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
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
  // Mobile: "list" shows bloc+block list, "detail" shows block detail
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const current = catalogs.find((c) => c.bloc === activeBloc)!;
  const allBlocks = useMemo(() => current.sections.flatMap((s) => s.blocks), [current]);
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

  const handleSelectBlock = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  // Shared bloc rail styles
  const blocRailStyle = {
    background: "oklch(0.11 0.015 260 / 0.8)",
    borderColor: "oklch(0.22 0.012 260)",
  };

  const BlocBtn = ({ c }: { c: (typeof catalogs)[0] }) => {
    const Icon = BLOC_ICONS[c.bloc] ?? Database;
    const active = c.bloc === activeBloc;
    const count = c.sections.reduce((s, sec) => s + sec.blocks.length, 0);
    return (
      <button
        key={c.bloc}
        onClick={() => { setActiveBloc(c.bloc); setSelectedId(null); setMobileView("list"); }}
        className="group inline-flex shrink-0 items-center gap-2 rounded-lg px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all duration-150"
        style={
          active
            ? { background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)", color: "#ffffff", boxShadow: "0 0 12px rgba(59,63,245,0.35), 0 2px 6px rgba(0,0,0,0.25)", border: "1px solid transparent" }
            : { background: "oklch(0.16 0.014 260)", color: "oklch(0.52 0.015 260)", border: "1px solid oklch(0.22 0.012 260)" }
        }
        onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.82 0.008 260)"; (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.20 0.016 260)"; } }}
        onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.52 0.015 260)"; (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.16 0.014 260)"; } }}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{c.blocName}</span>
        <span className="sm:hidden text-[10px]">{c.blocName.split(" ")[0]}</span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
          style={active ? { background: "rgba(255,255,255,0.18)", color: "#fff" } : { background: "oklch(0.12 0.012 260)", color: "oklch(0.48 0.012 260)" }}
        >{count}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── Bloc rail ── */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 sm:px-4 py-2.5 border-b" style={blocRailStyle}>
        {catalogs.map((c) => <BlocBtn key={c.bloc} c={c} />)}
      </div>

      {/* ════════════════════════════════ DESKTOP (≥ md) ══════════════════════════════ */}
      <div className="hidden md:grid min-h-0 flex-1 grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] overflow-hidden">
        {/* Sidebar list */}
        <aside className="flex flex-col overflow-hidden border-r border-border" style={{ background: "oklch(0.11 0.014 260 / 0.6)" }}>
          <div className="shrink-0 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="h-8 rounded-lg border-border bg-card pl-8 text-xs" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-3">
            {filteredSections.map((section) => (
              <div key={section.name} className="mb-1">
                <div className="sticky top-0 z-10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 backdrop-blur" style={{ background: "oklch(0.11 0.014 260 / 0.9)" }}>
                  {section.name}
                </div>
                {section.blocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`mx-2 my-0.5 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all duration-100 ${
                      selected?.id === b.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={selected?.id === b.id
                      ? { background: "oklch(0.20 0.022 260)" }
                      : { background: "transparent" }
                    }
                  >
                    <ChevronRight className={`h-3 w-3 shrink-0 transition ${selected?.id === b.id ? "text-[#3b3ff5]" : "opacity-30"}`} />
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filteredSections.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">Aucun résultat</div>
            )}
          </div>
        </aside>

        {/* Detail panel */}
        <div className="overflow-y-auto">
          {selected && <BlockDetail block={selected} onAdd={onAdd} contractRole={current.contract.role} />}
        </div>
      </div>

      {/* ════════════════════════════════ MOBILE (< md) ═══════════════════════════════ */}
      <div className="md:hidden min-h-0 flex-1 overflow-hidden flex flex-col">
        {mobileView === "list" ? (
          /* List view */
          <div className="flex-1 overflow-y-auto">
            {/* Search */}
            <div className="sticky top-0 z-10 p-3 border-b" style={{ background: "oklch(0.11 0.014 260 / 0.95)", borderColor: "oklch(0.22 0.012 260)" }}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un bloc…" className="h-9 rounded-lg pl-8 text-sm" />
              </div>
            </div>

            {filteredSections.map((section) => (
              <div key={section.name}>
                <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 border-b" style={{ borderColor: "oklch(0.18 0.012 260)" }}>
                  {section.name}
                </div>
                {section.blocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBlock(b.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left border-b transition-colors active:opacity-70"
                    style={{ borderColor: "oklch(0.16 0.012 260)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{b.name}</div>
                      {b.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{b.description}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            ))}
            {filteredSections.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">Aucun résultat</div>
            )}
          </div>
        ) : (
          /* Detail view */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Back bar */}
            <div
              className="flex shrink-0 items-center gap-2 px-4 py-3 border-b"
              style={{ background: "oklch(0.12 0.015 260)", borderColor: "oklch(0.22 0.012 260)" }}
            >
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                <ChevronLeft size={15} />
                Retour
              </button>
              {selected && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-xs text-foreground/80 truncate font-medium">{selected.name}</span>
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {selected && <BlockDetail block={selected} onAdd={(b) => { onAdd(b); setMobileView("list"); }} contractRole={current.contract.role} />}
            </div>
          </div>
        )}
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
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
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
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{block.name}</h2>
        {block.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{block.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {block.applies_to?.map((t) => (
            <span key={t} className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="pt-3">
          <button
            onClick={() => onAdd(block)}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto justify-center sm:justify-start"
            style={{
              background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)",
              boxShadow: "0 0 0 0 rgba(59,63,245,0.4)",
              animation: "addBtnPulse 2.4s ease-in-out infinite",
            }}
          >
            {/* Shimmer sweep */}
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }}
            />
            <Plus className="h-4 w-4 shrink-0" />
            Ajouter au notebook
          </button>
          <style>{`
            @keyframes addBtnPulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(59,63,245,0.45), 0 4px 16px rgba(0,0,145,0.3); }
              50%       { box-shadow: 0 0 0 6px rgba(59,63,245,0), 0 4px 16px rgba(0,0,145,0.3); }
            }
          `}</style>
        </div>
      </header>

      {block.illustration_svg && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card/30" dangerouslySetInnerHTML={{ __html: block.illustration_svg }} />
      )}

      {block.when_to_use && (
        <Section title="Quand l'utiliser">
          <p className="text-sm leading-relaxed">{block.when_to_use}</p>
        </Section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {block.pros && <ProConsCard title="Pros" items={block.pros} symbol="+" tone="text-[color:var(--color-success)]" />}
        {block.cons && <ProConsCard title="Cons" items={block.cons} symbol="−" tone="text-destructive" />}
      </div>

      {block.use_cases && (
        <Section title="Cas d'usage">
          <div className="flex flex-wrap gap-1.5">
            {block.use_cases.map((u) => (
              <span key={u} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">{u}</span>
            ))}
          </div>
        </Section>
      )}

      {block.hyperparameters && (
        <Section title="Hyperparamètres">
          <div className="overflow-hidden rounded-xl border border-border bg-card/40 font-mono text-xs">
            {Object.entries(block.hyperparameters).map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-3 border-b border-border/60 px-3.5 py-2 last:border-0">
                <span className="w-32 sm:w-36 shrink-0 text-foreground">{k}</span>
                <span className="text-muted-foreground break-all">{JSON.stringify(v)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {block.code_template && (
        <Section title="Code">
          <pre className="max-h-[20rem] sm:max-h-[28rem] overflow-auto rounded-2xl border border-border bg-[oklch(0.08_0.006_260)] p-4 sm:p-5 font-mono text-xs leading-relaxed text-foreground/90">
            <code>{block.code_template}</code>
          </pre>
        </Section>
      )}

      <p className="border-t border-border pt-4 font-mono text-[10px] text-muted-foreground">{contractRole}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ProConsCard({ title, items, symbol, tone }: { title: string; items: string[]; symbol: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <h3 className={`mb-2.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{title}</h3>
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

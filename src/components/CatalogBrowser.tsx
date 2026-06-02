import { useMemo, useState } from "react";
import type { CatalogBlock, ParsedCatalog, PipelineTemplate } from "@/lib/pipeline";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { MermaidRenderer } from "@/components/MermaidRenderer";
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
  Server,
  Workflow,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { autoWrapMathColors } from "../lib/utils";
import "katex/dist/katex.min.css";
const BLOC_ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  [-1]: Package, // Custom
  0: Workflow, // Pipelines
  1: Database,
  2: BarChart3,
  3: Brain,
  4: LineChart,
  5: Server,
};

interface Props {
  catalogs: ParsedCatalog[];
  pipelines: PipelineTemplate[];
  onAdd: (b: CatalogBlock) => void;
  onAddPipeline: (p: PipelineTemplate) => void;
}

export function CatalogBrowser({ catalogs, pipelines, onAdd, onAddPipeline }: Props) {
  const [activeBloc, setActiveBloc] = useState(0); // Default to pipelines if preferred, or 1
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Mobile: "list" shows bloc+block list, "detail" shows block detail
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const current = catalogs.find((c) => c.bloc === activeBloc);
  const allBlocks = useMemo(() => current ? current.sections.flatMap((s) => s.blocks) : [], [current]);
  const filteredSections = useMemo(() => {
    if (!current) return [];
    let sections = current.sections;
    
    if (query.trim()) {
      const q = query.toLowerCase();
      sections = sections
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
    }
    
    // Tri alphabétique par catégorie (section) puis par entrée (block)
    return [...sections]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(s => ({
        ...s,
        blocks: [...s.blocks].sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, [current, query]);

  const filteredPipelines = useMemo(() => {
    let result = pipelines;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = pipelines.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const catA = a.category || "";
      const catB = b.category || "";
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
  }, [pipelines, query]);

  // Si on est sur le bloc 0 (Pipelines), selected correspond au pipeline sélectionné
  const selectedPipeline = filteredPipelines.find((p) => p.id === selectedId) ?? filteredPipelines[0];

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

  const PipelineBtn = () => {
    const active = activeBloc === 0;
    return (
      <button
        onClick={() => { setActiveBloc(0); setSelectedId(null); setMobileView("list"); }}
        className="group inline-flex shrink-0 items-center gap-2 rounded-lg px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 mr-2 border-r border-border/50 pr-4"
        style={
          active
            ? { background: "linear-gradient(135deg, #059669 0%, #064e3b 100%)", color: "#ffffff", boxShadow: "0 0 12px rgba(5,150,105,0.35)", border: "1px solid transparent" }
            : { background: "oklch(0.16 0.014 260)", color: "oklch(0.52 0.015 260)", border: "1px solid oklch(0.22 0.012 260)" }
        }
      >
        <Workflow className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Recettes</span>
        <span className="sm:hidden text-[10px]">Recettes</span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
          style={active ? { background: "rgba(255,255,255,0.18)", color: "#fff" } : { background: "oklch(0.12 0.012 260)", color: "oklch(0.48 0.012 260)" }}
        >{pipelines.length}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── Bloc rail ── */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 sm:px-4 py-2.5 border-b" style={blocRailStyle}>
        <PipelineBtn />
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
            {activeBloc === 0 ? (
              <div className="mb-1">
                <div className="sticky top-0 z-10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 backdrop-blur" style={{ background: "oklch(0.11 0.014 260 / 0.9)" }}>
                  Modèles Complets
                </div>
                {filteredPipelines.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`mx-2 my-0.5 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all duration-100 ${
                      selectedPipeline?.id === p.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={selectedPipeline?.id === p.id
                      ? { background: "oklch(0.20 0.022 260)" }
                      : { background: "transparent" }
                    }
                  >
                    <ChevronRight className={`h-3 w-3 shrink-0 transition ${selectedPipeline?.id === p.id ? "text-[#059669]" : "opacity-30"}`} />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
                {filteredPipelines.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">Aucune recette trouvée</div>
                )}
              </div>
            ) : (
              filteredSections.map((section) => (
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
              ))
            )}
            {activeBloc !== 0 && filteredSections.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">Aucun résultat</div>
            )}
          </div>
        </aside>

        {/* Detail panel */}
        <div className="overflow-y-auto">
          {activeBloc === 0 ? (
            selectedPipeline && <PipelineDetail pipeline={selectedPipeline} onAddPipeline={onAddPipeline} />
          ) : (
            selected && <BlockDetail block={selected} onAdd={onAdd} contract={current?.contract} />
          )}
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

            {activeBloc === 0 ? (
              <div>
                <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 border-b" style={{ borderColor: "oklch(0.18 0.012 260)" }}>
                  Modèles Complets
                </div>
                {filteredPipelines.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectBlock(p.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left border-b transition-colors active:opacity-70"
                    style={{ borderColor: "oklch(0.16 0.012 260)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                      {p.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </button>
                ))}
                {filteredPipelines.length === 0 && (
                  <div className="py-16 text-center text-sm text-muted-foreground">Aucun résultat</div>
                )}
              </div>
            ) : (
              filteredSections.map((section) => (
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
              ))
            )}
            {activeBloc !== 0 && filteredSections.length === 0 && (
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
              {(selected || selectedPipeline) && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-xs text-foreground/80 truncate font-medium">
                    {activeBloc === 0 ? selectedPipeline?.name : selected?.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeBloc === 0 ? (
                selectedPipeline && <PipelineDetail pipeline={selectedPipeline} onAddPipeline={(p) => { onAddPipeline(p); setMobileView("list"); }} />
              ) : (
                selected && <BlockDetail block={selected} onAdd={(b) => { onAdd(b); setMobileView("list"); }} contract={current?.contract} />
              )}
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
  contract,
}: {
  block: CatalogBlock;
  onAdd: (b: CatalogBlock) => void;
  contract?: import("@/lib/pipeline").IOContract;
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
        <div 
          className="overflow-hidden rounded-2xl border border-border bg-card/30 flex justify-center p-4 [&>svg]:max-h-32 [&>svg]:w-auto" 
          dangerouslySetInnerHTML={{ __html: block.illustration_svg }} 
        />
      )}

      {block.illustration_mermaid && (
        <MermaidRenderer chart={block.illustration_mermaid} />
      )}

      {block.when_to_use && (
        <Section title="Quand l'utiliser">
          <p className="text-sm leading-relaxed">{block.when_to_use}</p>
        </Section>
      )}

      {block.math_theory && (
        <Section title="Théorie & Mathématiques">
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/60" style={{ background: "linear-gradient(135deg, oklch(0.18 0.02 280) 0%, oklch(0.14 0.015 260) 100%)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">📐 Fondements mathématiques</span>
            </div>
            <div className="p-4 prose prose-sm prose-slate max-w-none dark:prose-invert [&_mjx-container]:!inline [&_.katex]:text-foreground [&_code]:text-xs [&_code]:bg-muted/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-mermaid/.exec(className || '');
                    if (match) {
                      return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />;
                    }
                    return <code className={className} {...props}>{children}</code>;
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  }
                }}
              >
                {autoWrapMathColors(block.math_theory)}
              </ReactMarkdown>
            </div>
            {block.math_illustration_svg && (
              <div 
                className="border-t border-border/60 bg-muted/20 p-4 flex justify-center [&>svg]:max-w-full [&>svg]:max-h-48 [&>svg]:h-auto [&>svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: block.math_illustration_svg }} 
              />
            )}
          </div>
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
          <CodeBlock code={block.code_template} className="max-h-[20rem] sm:max-h-[28rem] overflow-auto" />
        </Section>
      )}

      {/* Rendu du Contrat I/O */}
      {contract && (
        <div className="border-t border-border pt-6 mt-6">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contrat I/O du Bloc ({contract.role})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {contract.input_variables && Object.keys(contract.input_variables).length > 0 && (
              <div className="rounded-xl bg-muted/40 p-3.5 border border-border">
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground/70">Requis en entrée</h4>
                <ul className="space-y-1.5 font-mono text-[11px]">
                  {Object.entries(contract.input_variables).map(([k, v]) => (
                    <li key={k} className="flex flex-wrap gap-2">
                      <span className="font-semibold text-primary">{k}</span>
                      <span className="text-muted-foreground/60">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {contract.output_variables && Object.keys(contract.output_variables).length > 0 && (
              <div className="rounded-xl bg-muted/40 p-3.5 border border-border">
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground/70">Produit en sortie</h4>
                <ul className="space-y-1.5 font-mono text-[11px]">
                  {Object.entries(contract.output_variables).map(([k, v]) => (
                    <li key={k} className="flex flex-wrap gap-2">
                      <span className="font-semibold text-[color:var(--color-success)]">{k}</span>
                      <span className="text-muted-foreground/60">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineDetail({
  pipeline,
  onAddPipeline,
}: {
  pipeline: PipelineTemplate;
  onAddPipeline: (p: PipelineTemplate) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1"><Workflow size={10} /> RECETTE DE PIPELINE</span>
          {pipeline.category && (
            <>
              <span className="opacity-40">·</span>
              <span>{pipeline.category}</span>
            </>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{pipeline.name}</h2>
        {pipeline.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{pipeline.description}</p>
        )}
        
        <div className="pt-3">
          <button
            onClick={() => onAddPipeline(pipeline)}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] w-full sm:w-auto justify-center sm:justify-start"
            style={{
              background: "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
              boxShadow: "0 0 0 0 rgba(5,150,105,0.4)",
              animation: "addPipeBtnPulse 2.4s ease-in-out infinite",
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }}
            />
            <Plus className="h-4 w-4 shrink-0" />
            Déployer le pipeline complet
          </button>
          <style>{`
            @keyframes addPipeBtnPulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(5,150,105,0.45), 0 4px 16px rgba(6,78,59,0.3); }
              50%       { box-shadow: 0 0 0 6px rgba(5,150,105,0), 0 4px 16px rgba(6,78,59,0.3); }
            }
          `}</style>
        </div>
      </header>

      <Section title="Séquence des blocs">
        <div className="flex flex-col gap-2">
          {pipeline.nodes.map((node, i) => (
            <div key={node.node_id} className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{node.node_id}</span>
                  <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 h-4">{node.block_id}</Badge>
                </div>
                {node.depends_on && node.depends_on.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground mr-1">Dépend de:</span>
                    {node.depends_on.map(dep => (
                      <span key={dep} className="text-[10px] text-primary/80 font-mono bg-primary/10 px-1 rounded">{dep}</span>
                    ))}
                  </div>
                )}
                {node.params && Object.keys(node.params).length > 0 && (
                  <div className="mt-2 text-[10px] text-muted-foreground/80 font-mono">
                    <span className="mr-1">Surcharges:</span>
                    {Object.entries(node.params).map(([k,v]) => `${k}=${v}`).join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
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

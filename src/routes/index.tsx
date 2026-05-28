import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { NotebookBuilder } from "@/components/NotebookBuilder";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { useCatalogs } from "@/lib/use-catalogs";
import { makeCell, type CatalogBlock, type NotebookCell } from "@/lib/pipeline";
import { loadIntegrations, type IntegrationsConfig } from "@/lib/integrations";
import { Library, Notebook, Workflow, Github } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DataML — Pipeline Studio · Générateur de notebook ML" },
      {
        name: "description",
        content:
          "DataML — Composez votre pipeline ML à partir de 5 catalogues YAML : datasets, EDA, modèles, évaluation, export.",
      },
    ],
  }),
});

type Tab = "catalog" | "notebook";

function Index() {
  const { catalogs, loading, error } = useCatalogs();
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [tab, setTab] = useState<Tab>("catalog");
  const [integrations, setIntegrations] = useState<IntegrationsConfig>(() =>
    loadIntegrations(),
  );

  const addBlock = (b: CatalogBlock) => {
    setCells((cs) => [...cs, makeCell(b)]);
    setTab("notebook");
  };

  const blockTotal = catalogs?.reduce(
    (s, c) => s + c.sections.reduce((s2, sec) => s2 + sec.blocks.length, 0),
    0,
  );

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="relative shrink-0 border-b border-border bg-gradient-to-b from-card/60 to-card/20 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          {/* ─── Brand ─── */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-foreground to-foreground/70 text-background shadow-lg shadow-foreground/10">
                <Workflow className="h-4 w-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-[color:var(--color-success)]" />
            </div>
            <div>
              <h1 className="flex items-center gap-1.5 text-sm font-semibold leading-tight tracking-tight">
                DataML
                <span className="text-muted-foreground/60">—</span>
                <span className="font-normal text-foreground/80">Pipeline Studio</span>
              </h1>
              <p className="mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
                datasets → eda → model → eval → report
                {blockTotal !== undefined && (
                  <span className="ml-2 text-muted-foreground/60">· {blockTotal} blocs</span>
                )}
              </p>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <nav className="flex items-center gap-1 rounded-full border border-border bg-card/70 p-1 shadow-sm">
            <TabBtn
              active={tab === "catalog"}
              onClick={() => setTab("catalog")}
              icon={<Library className="h-3.5 w-3.5" />}
            >
              Catalogue
            </TabBtn>
            <TabBtn
              active={tab === "notebook"}
              onClick={() => setTab("notebook")}
              icon={<Notebook className="h-3.5 w-3.5" />}
              badge={cells.length}
            >
              Notebook
            </TabBtn>
          </nav>

          {/* ─── Actions ─── */}
          <div className="flex items-center gap-1.5">
            <IntegrationsPanel cfg={integrations} setCfg={setIntegrations} />
            <a
              href="https://github.com/jupyter/kernel_gateway"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground sm:inline-flex"
              title="Jupyter Kernel Gateway"
            >
              <Github className="h-3.5 w-3.5" />
              gateway
            </a>
          </div>
        </div>
      </header>

      {loading && (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          Chargement des catalogues YAML…
        </div>
      )}
      {error && <div className="grid flex-1 place-items-center text-sm text-destructive">{error}</div>}
      {catalogs && (
        <main className="min-h-0 flex-1 overflow-hidden">
          {/* Keep BOTH panes mounted so the kernel connection, outputs and
              in-progress executions survive tab switches. */}
          <div className={`h-full ${tab === "catalog" ? "block" : "hidden"}`}>
            <CatalogBrowser catalogs={catalogs} onAdd={addBlock} />
          </div>
          <div className={`h-full ${tab === "notebook" ? "block" : "hidden"}`}>
            <NotebookBuilder
              cells={cells}
              setCells={setCells}
              catalogs={catalogs}
              integrations={integrations}
            />
          </div>
        </main>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className={`ml-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] ${
            active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { NotebookBuilder } from "@/components/NotebookBuilder";
import { useCatalogs } from "@/lib/use-catalogs";
import { makeCell, type CatalogBlock, type NotebookCell } from "@/lib/pipeline";
import { Library, Notebook, Workflow } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DataML Pipeline Studio — Générateur de notebook ML" },
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

  const addBlock = (b: CatalogBlock) => {
    setCells((cs) => [...cs, makeCell(b)]);
    setTab("notebook");
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/40 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none tracking-tight">
              DataML <span className="text-muted-foreground">·</span> Pipeline Studio
            </h1>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              datasets → eda → model → eval → report
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
          <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")} icon={<Library className="h-3.5 w-3.5" />}>
            Catalogue
          </TabBtn>
          <TabBtn active={tab === "notebook"} onClick={() => setTab("notebook")} icon={<Notebook className="h-3.5 w-3.5" />} badge={cells.length}>
            Notebook
          </TabBtn>
        </nav>

        <div className="hidden gap-4 font-mono text-[10px] text-muted-foreground md:flex">
          {catalogs?.map((c) => (
            <span key={c.bloc}>
              B{c.bloc} · {c.sections.reduce((s, sec) => s + sec.blocks.length, 0)}
            </span>
          ))}
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
            <NotebookBuilder cells={cells} setCells={setCells} catalogs={catalogs} />
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

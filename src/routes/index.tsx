import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { NotebookBuilder } from "@/components/NotebookBuilder";
import { useCatalogs } from "@/lib/use-catalogs";
import { makeCell, type CatalogBlock, type NotebookCell } from "@/lib/pipeline";
import { Workflow } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Pipeline Studio — Générateur de notebook ML" },
      {
        name: "description",
        content:
          "Composez votre pipeline ML à partir de 5 catalogues YAML : datasets, EDA, modèles, évaluation, export. Génère un notebook Jupyter validé.",
      },
    ],
  }),
});

function Index() {
  const { catalogs, loading, error } = useCatalogs();
  const [cells, setCells] = useState<NotebookCell[]>([]);

  const addBlock = (b: CatalogBlock) => setCells((cs) => [...cs, makeCell(b)]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/60 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">Pipeline Studio</h1>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              datasets → eda → model → eval → report
            </p>
          </div>
        </div>
        {catalogs && (
          <div className="hidden gap-4 font-mono text-[10px] text-muted-foreground sm:flex">
            {catalogs.map((c) => (
              <span key={c.bloc}>
                <span className="text-primary">B{c.bloc}</span> ·{" "}
                {c.sections.reduce((s, sec) => s + sec.blocks.length, 0)} blocs
              </span>
            ))}
          </div>
        )}
      </header>

      {loading && (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
          Chargement des catalogues YAML…
        </div>
      )}
      {error && (
        <div className="grid flex-1 place-items-center text-sm text-destructive">{error}</div>
      )}
      {catalogs && (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_520px] overflow-hidden">
          <CatalogBrowser catalogs={catalogs} onAdd={addBlock} />
          <div className="border-l border-border">
            <NotebookBuilder cells={cells} setCells={setCells} catalogs={catalogs} />
          </div>
        </div>
      )}
    </div>
  );
}

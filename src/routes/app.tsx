import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { NotebookBuilder } from "@/components/NotebookBuilder";
import { IntegrationsPanel } from "@/components/IntegrationsPanel";
import { useCatalogs } from "@/lib/use-catalogs";
import { makeCell, type CatalogBlock, type NotebookCell } from "@/lib/pipeline";
import {
  loadIntegrationsCatalog,
  loadIntegrationsState,
  saveIntegrationsState,
  syncIntegrationCells,
  type IntegrationsCatalog,
  type IntegrationsState,
} from "@/lib/integrations";
import { Library, Notebook, Workflow, Github } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DataML — Pipeline Studio" },
      {
        name: "description",
        content: "DataML — Composez votre pipeline ML à partir de 5 catalogues YAML.",
      },
    ],
  }),
});

type Tab = "catalog" | "notebook";

function Index() {
  const { catalogs, loading, error } = useCatalogs();
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [tab, setTab] = useState<Tab>("catalog");
  const [integrationsCatalog, setIntegrationsCatalog] =
    useState<IntegrationsCatalog | null>(null);
  const [integrationsState, setIntegrationsState] = useState<IntegrationsState>(() =>
    loadIntegrationsState(),
  );

  useEffect(() => {
    loadIntegrationsCatalog()
      .then((cat) => {
        setIntegrationsCatalog(cat);
        setCells((cur) => syncIntegrationCells(cur, cat, integrationsState));
      })
      .catch((e) => {
        console.error("Failed to load integrations catalog:", e);
        setIntegrationsCatalog({ integrations: [] });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBlock = (b: CatalogBlock) => {
    setCells((cs) => [...cs, makeCell(b)]);
    setTab("notebook");
  };

  const applyIntegrations = (next: IntegrationsState) => {
    setIntegrationsState(next);
    saveIntegrationsState(next);
    setCells((cs) => syncIntegrationCells(cs, integrationsCatalog, next));
    setTab("notebook");
  };

  const blockTotal = catalogs?.reduce(
    (s, c) => s + c.sections.reduce((s2, sec) => s2 + sec.blocks.length, 0),
    0,
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground">

      {/* ══════════════════ HEADER ══════════════════ */}
      <header
        className="relative z-20 shrink-0"
        style={{
          background: "oklch(0.12 0.016 260 / 0.92)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderBottom: "1px solid oklch(0.22 0.012 260)",
          boxShadow: "0 4px 32px -4px rgba(0,0,0,0.5)",
        }}
      >
        <div className="relative flex items-center justify-between gap-4 px-4 sm:px-5 h-14">

          {/* ── Brand ── */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)",
                boxShadow: "0 0 14px rgba(59,63,245,0.4)",
              }}
            >
              <Workflow size={14} className="text-white" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <span className="block text-sm font-bold leading-none text-foreground tracking-tight">
                DataML
              </span>
              <span className="block text-[10px] font-medium leading-none text-muted-foreground mt-1">
                Pipeline Studio
              </span>
            </div>
            <span className="sm:hidden text-sm font-bold text-foreground">DataML</span>
          </div>

          {/* ── Center: Floating pill nav (desktop only — mobile uses bottom bar) ── */}
          <nav
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 p-1"
            style={{
              background: "oklch(0.08 0.014 260 / 0.98)",
              border: "1px solid oklch(0.26 0.016 260)",
              borderRadius: "14px",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow:
                "0 8px 32px -4px rgba(0,0,0,0.7), inset 0 1px 0 oklch(0.30 0.014 260 / 0.4)",
            }}
          >
            <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")} icon={<Library size={13} />}>
              Catalogue
            </TabBtn>
            <TabBtn active={tab === "notebook"} onClick={() => setTab("notebook")} icon={<Notebook size={13} />} badge={cells.length}>
              Notebook
            </TabBtn>
          </nav>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {blockTotal !== undefined && (
              <span
                className="hidden lg:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
                style={{ background: "oklch(0.16 0.014 260)", border: "1px solid oklch(0.22 0.012 260)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3b3ff5", boxShadow: "0 0 6px #3b3ff5" }} />
                {blockTotal} blocs
              </span>
            )}
            <IntegrationsPanel catalog={integrationsCatalog} state={integrationsState} onApply={applyIntegrations} />
            <a
              href="https://github.com/jupyter/kernel_gateway"
              target="_blank"
              rel="noreferrer"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:text-foreground"
              style={{ background: "oklch(0.16 0.014 260)", border: "1px solid oklch(0.22 0.012 260)" }}
            >
              <Github size={12} />
              gateway
            </a>
          </div>
        </div>
      </header>

      {/* ══════════════════ CONTENT ══════════════════ */}
      {loading && (
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-xl animate-pulse" style={{ background: "linear-gradient(135deg, #3b3ff5, #000091)" }} />
            <p className="text-sm text-muted-foreground">Chargement des catalogues…</p>
          </div>
        </div>
      )}
      {error && <div className="grid flex-1 place-items-center text-sm text-destructive">{error}</div>}
      {catalogs && (
        /* pb-16 on mobile to make room for bottom nav */
        <main className="min-h-0 flex-1 overflow-hidden pb-16 sm:pb-0">
          <div className={`h-full ${tab === "catalog" ? "block" : "hidden"}`}>
            <CatalogBrowser catalogs={catalogs} onAdd={addBlock} />
          </div>
          <div className={`h-full ${tab === "notebook" ? "block" : "hidden"}`}>
            <NotebookBuilder cells={cells} setCells={setCells} catalogs={catalogs} />
          </div>
        </main>
      )}

      {/* ══════════════════ BOTTOM NAV (mobile only) ══════════════════ */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch"
        style={{
          background: "oklch(0.10 0.015 260 / 0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid oklch(0.22 0.012 260)",
          boxShadow: "0 -4px 24px -4px rgba(0,0,0,0.5)",
        }}
      >
        <BottomTab active={tab === "catalog"} onClick={() => setTab("catalog")} icon={<Library size={18} />} label="Catalogue" />
        <BottomTab active={tab === "notebook"} onClick={() => setTab("notebook")} icon={<Notebook size={18} />} label="Notebook" badge={cells.length} />
      </nav>
    </div>
  );
}

// ─── Desktop Tab Button ────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, children, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[10px] px-4 py-1.5 text-xs font-semibold transition-all duration-150"
      style={
        active
          ? { background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)", color: "#ffffff", boxShadow: "0 0 14px rgba(59,63,245,0.4), 0 2px 8px rgba(0,0,0,0.3)" }
          : { color: "oklch(0.50 0.015 260)", background: "transparent" }
      }
      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.82 0.008 260)"; (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.15 0.014 260)"; } }}
      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.50 0.015 260)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
    >
      {icon}
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold"
          style={active ? { background: "rgba(255,255,255,0.2)", color: "#fff" } : { background: "oklch(0.18 0.014 260)", color: "oklch(0.55 0.015 260)" }}
        >{badge}</span>
      )}
    </button>
  );
}

// ─── Mobile Bottom Tab ─────────────────────────────────────────────────────────

function BottomTab({ active, onClick, icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all duration-150 relative"
      style={{ color: active ? "#ffffff" : "oklch(0.45 0.015 260)" }}
    >
      {active && (
        <span
          className="absolute top-0 inset-x-6 h-0.5 rounded-b-full"
          style={{ background: "linear-gradient(90deg, #3b3ff5, #000091)" }}
        />
      )}
      <span style={active ? { filter: "drop-shadow(0 0 6px rgba(59,63,245,0.6))", color: "#818cf8" } : {}}>
        {icon}
      </span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute top-1.5 right-[calc(50%-20px)] rounded-full px-1 font-mono text-[8px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #3b3ff5, #000091)", minWidth: 14, textAlign: "center" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

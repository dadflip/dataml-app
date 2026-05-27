import { useMemo, useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  allBlocks,
  applyParamOverrides,
  buildNotebookJSON,
  buildPythonScript,
  downloadText,
  extractParams,
  openInColab,
  validateNotebook,
  type CatalogBlock,
  type NotebookCell,
  type ParsedCatalog,
} from "@/lib/pipeline";
import { executeCode, type ExecResult, type KernelConfig } from "@/lib/kernel";
import { Button } from "@/components/ui/button";
import { ParamInput } from "@/components/ParamInput";
import { KernelPanel, loadStoredCfg } from "@/components/KernelPanel";
import { CellOutput } from "@/components/CellOutput";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCode,
  GripVertical,
  Loader2,
  Notebook,
  Play,
  PlayCircle,
  Sparkles,
  Square,
  Trash2,
  Eraser,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// ─── Persistence ──────────────────────────────────────────────────────────────

const NOTEBOOK_KEY = "pipeline-studio:notebook-cells";

function loadStoredCells(): NotebookCell[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTEBOOK_KEY);
    if (raw) return JSON.parse(raw) as NotebookCell[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveStoredCells(cells: NotebookCell[]) {
  try {
    window.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(cells));
  } catch {
    /* ignore */
  }
}

// ─── NotebookBuilder ──────────────────────────────────────────────────────────

interface Props {
  cells: NotebookCell[];
  setCells: (c: NotebookCell[]) => void;
  catalogs: ParsedCatalog[];
}

export function NotebookBuilder({ cells, setCells, catalogs }: Props) {
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [kernelCfg, setKernelCfg] = useState<KernelConfig>(() => loadStoredCfg());
  const [kernelId, setKernelId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, ExecResult>>({});
  const [running, setRunning] = useState<string | null>(null);

  // ── Restore cells from localStorage on first mount ──
  useEffect(() => {
    if (cells.length === 0) {
      const stored = loadStoredCells();
      if (stored.length > 0) setCells(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist cells whenever they change ──
  useEffect(() => {
    saveStoredCells(cells);
  }, [cells]);

  const validations = useMemo(() => validateNotebook(cells, catalogs), [cells, catalogs]);
  const blockIndex = useMemo(() => {
    const m = new Map<string, CatalogBlock>();
    for (const b of allBlocks(catalogs)) m.set(b.id, b);
    return m;
  }, [catalogs]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = cells.findIndex((c) => c.uid === active.id);
    const newIdx = cells.findIndex((c) => c.uid === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setCells(arrayMove(cells, oldIdx, newIdx));
  };

  const remove = (uid: string) => setCells(cells.filter((c) => c.uid !== uid));

  const clearAll = useCallback(() => {
    setCells([]);
    setOutputs({});
    setOpenUid(null);
  }, [setCells]);

  const updateOverride = (uid: string, name: string, value: string) =>
    setCells(
      cells.map((c) =>
        c.uid === uid ? { ...c, overrides: { ...c.overrides, [name]: value } } : c,
      ),
    );

  const resetOverride = (uid: string, name: string) =>
    setCells(
      cells.map((c) => {
        if (c.uid !== uid) return c;
        const next = { ...c.overrides };
        delete next[name];
        return { ...c, overrides: next };
      }),
    );

  const updateCode = (uid: string, code: string) =>
    setCells(
      cells.map((c) => (c.uid === uid ? { ...c, code, params: extractParams(code) } : c)),
    );

  const runCell = async (cell: NotebookCell) => {
    if (!kernelId) return;
    setRunning(cell.uid);
    setOutputs((o) => ({
      ...o,
      [cell.uid]: { status: "running", stdout: "", stderr: "", displays: [] },
    }));
    const code = applyParamOverrides(cell.code, cell.overrides);
    try {
      const { promise } = executeCode(kernelCfg, kernelId, code, (r) =>
        setOutputs((o) => ({ ...o, [cell.uid]: r })),
      );
      const final = await promise;
      setOutputs((o) => ({ ...o, [cell.uid]: final }));
    } catch (e) {
      setOutputs((o) => ({
        ...o,
        [cell.uid]: {
          status: "error",
          stdout: "",
          stderr: (e as Error).message,
          displays: [],
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    if (!kernelId) return;
    for (const cell of cells) {
      await runCell(cell);
      const last = outputs[cell.uid];
      if (last?.status === "error") break;
    }
  };

  const errorCount = validations.filter((v) => !v.ok).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-2.5 border-b border-border bg-card/30 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Notebook</span>
            <span className="font-mono text-xs text-muted-foreground">
              {cells.length} {cells.length > 1 ? "cellules" : "cellule"}
            </span>
            {errorCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 font-mono text-[10px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {errorCount} I/O
              </span>
            ) : cells.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/10 px-2.5 py-0.5 font-mono text-[10px] text-[color:var(--color-success)]">
                <CheckCircle2 className="h-3 w-3" />
                I/O valide
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={!cells.length || !kernelId || running !== null}
              onClick={runAll}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Run all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={!cells.length}
              onClick={() =>
                downloadText(
                  "pipeline.ipynb",
                  buildNotebookJSON(cells),
                  "application/x-ipynb+json",
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              .ipynb
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={!cells.length}
              onClick={() =>
                downloadText("pipeline.py", buildPythonScript(cells), "text/x-python")
              }
            >
              <FileCode className="h-3.5 w-3.5" />
              .py
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              disabled={!cells.length}
              onClick={() => openInColab(buildNotebookJSON(cells))}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Colab
            </Button>

            {/* ── Clear notebook ── */}
            <ClearNotebookDialog onConfirm={clearAll} disabled={!cells.length} />
          </div>
        </div>
        <KernelPanel
          cfg={kernelCfg}
          setCfg={setKernelCfg}
          kernelId={kernelId}
          setKernelId={setKernelId}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-5 lg:p-6">
          {cells.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card/40 text-muted-foreground">
                <Notebook className="h-6 w-6" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                Parcourez le <span className="text-foreground">Catalogue</span> et cliquez{" "}
                <span className="font-mono text-foreground">+ Ajouter</span> pour composer votre
                pipeline.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={cells.map((c) => c.uid)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="space-y-2.5">
                  {cells.map((cell, i) => (
                    <SortableCell
                      key={cell.uid}
                      cell={cell}
                      index={i}
                      validation={validations[i]}
                      blockMeta={blockIndex.get(cell.blockId)}
                      isOpen={openUid === cell.uid}
                      onToggle={() => setOpenUid(openUid === cell.uid ? null : cell.uid)}
                      onRemove={() => remove(cell.uid)}
                      onOverride={(n, v) => updateOverride(cell.uid, n, v)}
                      onResetOverride={(n) => resetOverride(cell.uid, n)}
                      onCode={(code) => updateCode(cell.uid, code)}
                      canRun={kernelId !== null}
                      isRunning={running === cell.uid}
                      output={outputs[cell.uid]}
                      onRun={() => runCell(cell)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ClearNotebookDialog ──────────────────────────────────────────────────────

function ClearNotebookDialog({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-muted-foreground hover:border-destructive/50 hover:text-destructive"
          disabled={disabled}
        >
          <Eraser className="h-3.5 w-3.5" />
          Vider
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vider le notebook ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Toutes les cellules et leurs sorties seront supprimées. Cette action efface également
          la sauvegarde locale.
        </p>
        <DialogFooter className="mt-2 gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="rounded-full">
              Annuler
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full"
              onClick={onConfirm}
            >
              <Eraser className="h-3.5 w-3.5" />
              Vider
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SortableCell ─────────────────────────────────────────────────────────────

function SortableCell({
  cell,
  index,
  validation,
  blockMeta,
  isOpen,
  onToggle,
  onRemove,
  onOverride,
  onResetOverride,
  onCode,
  canRun,
  isRunning,
  output,
  onRun,
}: {
  cell: NotebookCell;
  index: number;
  validation: { ok: boolean; missing: string[]; outOfOrder: boolean };
  blockMeta?: CatalogBlock;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onOverride: (name: string, value: string) => void;
  onResetOverride: (name: string) => void;
  onCode: (code: string) => void;
  canRun: boolean;
  isRunning: boolean;
  output?: ExecResult;
  onRun: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cell.uid,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const [editing, setEditing] = useState(false);
  const finalCode = applyParamOverrides(cell.code, cell.overrides);

  const statusBadge = output && (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${
        output.status === "ok"
          ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]"
          : output.status === "error"
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground"
      }`}
      title={output.status}
    >
      {output.status === "running" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : output.status === "ok" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {output.status}
    </span>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border bg-card/40 transition ${
        validation.ok
          ? "border-border hover:border-foreground/15"
          : "border-destructive/50 bg-destructive/5"
      }`}
    >
      {/* ── Row ── */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Déplacer"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="w-7 shrink-0 text-center font-mono text-[10px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          B{cell.bloc}
        </span>

        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 truncate text-left text-sm font-medium hover:text-foreground"
        >
          <span className="truncate">{cell.name}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <span className="hidden font-mono text-[10px] text-muted-foreground md:inline">
          {cell.section}
        </span>

        {statusBadge}

        {!validation.ok && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[10px] text-destructive"
            title={
              validation.outOfOrder
                ? "Ordre des blocs invalide"
                : `Manque: ${validation.missing.join(", ")}`
            }
          >
            <AlertTriangle className="h-3 w-3" />
            {validation.outOfOrder ? "ordre" : validation.missing.length}
          </span>
        )}

        <button
          onClick={onRun}
          disabled={!canRun || isRunning}
          className="rounded-md p-1 text-muted-foreground enabled:hover:bg-[color:var(--color-success)]/15 enabled:hover:text-[color:var(--color-success)] disabled:opacity-30"
          aria-label="Exécuter"
          title={canRun ? "Exécuter cette cellule" : "Connectez un kernel"}
        >
          {isRunning ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          aria-label="Retirer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Panel ── */}
      {isOpen && (
        <div className="space-y-4 border-t border-border px-4 py-4">

          {/* Block info (description, use cases, hyperparams, …) */}
          {blockMeta && <BlockInfo block={blockMeta} />}


          {/* Erreur I/O */}
          {!validation.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <div className="space-y-0.5">
                {validation.outOfOrder && (
                  <div className="text-destructive">
                    Cette cellule (bloc {cell.bloc}) arrive après un bloc plus avancé.
                  </div>
                )}
                {validation.missing.length > 0 && (
                  <div className="text-destructive">
                    Variables non produites en amont :{" "}
                    <code className="font-mono">{validation.missing.join(", ")}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paramètres */}
          {cell.params.length > 0 && (
            <div>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Paramètres
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cell.params.map((p) => (
                  <ParamInput
                    key={p.name}
                    param={p}
                    override={cell.overrides[p.name]}
                    onChange={(v) => onOverride(p.name, v)}
                    onReset={() => onResetOverride(p.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Variables I/O */}
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <VarGroup
              title="Requiert"
              vars={cell.required}
              missing={validation.missing}
              tone="muted"
            />
            <ProducedRecap vars={cell.produced} meta={cell.producedMeta} />
          </div>

          {/* Code */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Code
              </h4>
              <button
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                {editing ? "Aperçu" : "Éditer"}
              </button>
            </div>
            {editing ? (
              <textarea
                value={cell.code}
                onChange={(e) => onCode(e.target.value)}
                spellCheck={false}
                className="block w-full resize-y rounded-xl border border-border bg-[oklch(0.1_0.004_260)] p-4 font-mono text-[11px] leading-relaxed text-foreground/95 outline-none focus:border-foreground/30"
                style={{ minHeight: "20rem", tabSize: 4 }}
              />
            ) : (
              <pre className="max-h-[28rem] overflow-auto rounded-xl border border-border bg-[oklch(0.1_0.004_260)] p-4 font-mono text-[11px] leading-relaxed">
                <code>{finalCode}</code>
              </pre>
            )}
          </div>

          {/* Sortie */}
          {output && (
            <div>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sortie
              </h4>
              <CellOutput output={output} />
            </div>
          )}

        </div>
      )}
    </li>
  );
}

// ─── ProducedRecap ────────────────────────────────────────────────────────────

function ProducedRecap({
  vars,
  meta,
}: {
  vars: string[];
  meta: Record<string, string>;
}) {
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Produit
        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 font-mono text-[9px] normal-case text-foreground/70">
          {vars.length}
        </span>
      </h4>
      {vars.length === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <ul className="space-y-1">
          {vars.map((v) => {
            const desc = meta[v];
            return (
              <li
                key={v}
                className="flex items-start gap-2 rounded-lg border border-border bg-card/50 px-2 py-1.5"
              >
                <code className="shrink-0 rounded-md border border-foreground/15 bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {v}
                </code>
                {desc && (
                  <span className="font-mono text-[10px] leading-snug text-muted-foreground">
                    {desc}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── VarGroup ─────────────────────────────────────────────────────────────────

function VarGroup({
  title,
  vars,
  missing = [],
  tone,
}: {
  title: string;
  vars: string[];
  missing?: string[];
  tone: "muted" | "primary";
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="flex flex-wrap gap-1">
        {vars.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          vars.map((v) => {
            const isMissing = missing.includes(v);
            const cls = isMissing
              ? "bg-destructive/15 text-destructive border-destructive/40"
              : tone === "primary"
                ? "bg-foreground/10 text-foreground border-foreground/15"
                : "bg-card border-border text-muted-foreground";
            return (
              <code
                key={v}
                className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${cls}`}
              >
                {v}
              </code>
            );
          })
        )}
      </div>
    </div>
  );
}

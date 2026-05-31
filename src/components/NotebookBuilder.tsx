import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import Editor from "@monaco-editor/react";
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
  buildPipelineYaml,
  downloadText,
  extractParams,
  openInColab,
  parseNotebookJSON,
  validateNotebook,
  type CatalogBlock,
  type NotebookCell,
  type ParsedCatalog,
} from "@/lib/pipeline";
import { executeCode, type ExecResult, type KernelConfig } from "@/lib/kernel";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { ParamInput } from "@/components/ParamInput";
import { KernelPanel, loadStoredCfg } from "@/components/KernelPanel";
import { CellOutput } from "@/components/CellOutput";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Download,
  FileCode,
  GripVertical,
  Info,
  Loader2,
  Notebook,
  Play,
  PlayCircle,
  Sparkles,
  Square,
  Trash2,
  Eraser,
  Upload,
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
  const [openUids, setOpenUids] = useState<Set<string>>(new Set());
  const [kernelCfg, setKernelCfg] = useState<KernelConfig>(() => loadStoredCfg());
  const [kernelId, setKernelId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, ExecResult>>({});
  const [running, setRunning] = useState<string | null>(null);

  const cancelRef = useRef<(() => void) | null>(null);
  const isRunAllAborted = useRef(false);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = evt.target?.result as string;
        const imported = parseNotebookJSON(json);
        if (imported.length > 0) {
          setCells(cells.length === 0 ? imported : [...cells, ...imported]);
        }
      } catch (err) {
        alert((err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset for next time
  };

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
    setOpenUids(new Set());
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
      cells.map((c) => (c.uid === uid ? { ...c, code, params: extractParams(code), overrides: {} } : c)),
    );

  const runCell = async (cell: NotebookCell) => {
    if (!kernelId) return;
    setRunning(cell.uid);
    setOutputs((o) => ({
      ...o,
      [cell.uid]: { status: "running", stdout: "", stderr: "", displays: [] },
    }));
    const code = applyParamOverrides(cell.code, cell.overrides);
    let finalResult: ExecResult | undefined;
    try {
      const { promise, cancel } = executeCode(kernelCfg, kernelId, code, (r) =>
        setOutputs((o) => ({ ...o, [cell.uid]: r })),
      );
      cancelRef.current = cancel;
      const final = await promise;
      finalResult = final;
      setOutputs((o) => ({ ...o, [cell.uid]: final }));
    } catch (e) {
      finalResult = {
        status: "error",
        stdout: "",
        stderr: (e as Error).message,
        displays: [],
      };
      setOutputs((o) => ({
        ...o,
        [cell.uid]: finalResult,
      }));
    } finally {
      setRunning(null);
      cancelRef.current = null;
    }
    return finalResult;
  };

  const runAll = async () => {
    if (!kernelId) return;
    isRunAllAborted.current = false;
    for (const cell of cells) {
      if (isRunAllAborted.current) break;
      const result = await runCell(cell);
      if (result?.status === "error" || result?.status === "aborted") {
        break;
      }
    }
  };

  const stopRun = () => {
    isRunAllAborted.current = true;
    if (cancelRef.current) {
      cancelRef.current();
    }
  };

  const errorCount = validations.filter((v) => !v.ok).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className="flex shrink-0 flex-col gap-3 px-4 sm:px-5 py-3 border-b"
        style={{ background: "oklch(0.12 0.016 260 / 0.7)", borderColor: "oklch(0.22 0.012 260)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: title + status */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-foreground">Notebook</span>
            <span
              className="rounded-md px-2 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0"
              style={{ background: "oklch(0.16 0.014 260)", border: "1px solid oklch(0.22 0.012 260)" }}
            >
              {cells.length}
            </span>
            {errorCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-destructive shrink-0"
                style={{ background: "oklch(0.18 0.05 22)", border: "1px solid oklch(0.30 0.08 22)" }}
              >
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden xs:inline">{errorCount} erreur{errorCount > 1 ? "s" : ""}</span>
              </span>
            ) : cells.length > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0"
                style={{ color: "var(--color-success)", background: "oklch(0.16 0.06 155)", border: "1px solid oklch(0.28 0.1 155)" }}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">I/O valide</span>
              </span>
            ) : null}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {cells.length > 0 && (
              <div className="mr-1 flex items-center gap-1 border-r border-border pr-1 sm:mr-1.5 sm:pr-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpenUids(new Set(cells.map((c) => c.uid)))}
                  title="Tout déplier"
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpenUids(new Set())}
                  title="Tout replier"
                >
                  <ChevronsDownUp className="h-4 w-4" />
                </Button>
              </div>
            )}
            {running !== null ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopRun}
                title="Arrêter l'exécution"
              >
                <Square className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Arrêter</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={!cells.length || !kernelId}
                onClick={runAll}
                title="Run all"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Run all</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!cells.length}
              onClick={() => downloadText("pipeline.ipynb", buildNotebookJSON(cells), "application/x-ipynb+json")}
              title="Télécharger .ipynb"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">.ipynb</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!cells.length}
              onClick={() => downloadText("pipeline.py", buildPythonScript(cells), "text/x-python")}
              title="Télécharger .py"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span className="hidden md:inline">.py</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!cells.length}
              onClick={() => downloadText("pipeline_recipe.yaml", buildPipelineYaml(cells), "text/yaml")}
              title="Enregistrer comme Recette YAML"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Recette</span>
            </Button>
            <input
              type="file"
              accept=".ipynb"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImport}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Importer un notebook externe"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importer</span>
            </Button>
            <Button
              size="sm"
              disabled={!cells.length}
              onClick={() => openInColab(buildNotebookJSON(cells))}
              title="Ouvrir dans Colab"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Colab</span>
            </Button>
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
                      isOpen={openUids.has(cell.uid)}
                      onToggle={() => {
                        setOpenUids((prev) => {
                          const next = new Set(prev);
                          if (next.has(cell.uid)) next.delete(cell.uid);
                          else next.add(cell.uid);
                          return next;
                        });
                      }}
                      onRemove={() => remove(cell.uid)}
                      onOverride={(n, v) => updateOverride(cell.uid, n, v)}
                      onResetOverride={(n) => resetOverride(cell.uid, n)}
                      onCode={(code) => updateCode(cell.uid, code)}
                      canRun={kernelId !== null}
                      isRunning={running === cell.uid}
                      output={outputs[cell.uid]}
                      onRun={() => runCell(cell)}
                      onStop={() => stopRun()}
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
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
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
  onStop: () => void;
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
          onClick={isRunning ? onStop : onRun}
          disabled={!canRun || cell.type === "markdown"}
          className="rounded-md p-1 text-muted-foreground enabled:hover:bg-[color:var(--color-success)]/15 enabled:hover:text-[color:var(--color-success)] disabled:opacity-30"
          aria-label={isRunning ? "Arrêter" : "Exécuter"}
          title={cell.type === "markdown" ? "Cellule markdown" : isRunning ? "Arrêter l'exécution" : canRun ? "Exécuter cette cellule" : "Connectez un kernel"}
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
          {cell.type !== "markdown" && (
            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <VarGroup
                title="Requiert"
                vars={cell.required}
                missing={validation.missing}
                tone="muted"
              />
              <ProducedRecap vars={cell.produced} meta={cell.producedMeta} />
            </div>
          )}

          {/* Code ou Markdown */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {cell.type === "markdown" ? "Markdown" : "Code"}
              </h4>
              <button
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                {editing ? "Aperçu" : "Éditer"}
              </button>
            </div>
            {editing ? (
              <div className="rounded-xl border border-border bg-[oklch(0.1_0.004_260)] p-2 overflow-hidden h-[30rem] sm:h-[40rem]">
                <Editor
                  height="100%"
                  language={cell.type === "markdown" ? "markdown" : "python"}
                  theme="vs-dark"
                  value={finalCode}
                  onChange={(val) => onCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 12, bottom: 12 },
                    lineNumbers: "on",
                  }}
                />
              </div>
            ) : cell.type === "markdown" ? (
              <div className="text-[13px] leading-relaxed text-foreground/90">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="mt-5 mb-3 text-lg font-bold text-foreground" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="mt-4 mb-2 text-base font-bold text-foreground" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="mt-3 mb-2 text-sm font-semibold text-foreground" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="mb-3 list-disc pl-5" {...props} />,
                    ol: ({ node, ...props }) => <ol className="mb-3 list-decimal pl-5" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                    a: ({ node, ...props }) => <a className="font-medium text-[color:var(--color-primary)] hover:underline" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="my-3 border-l-2 border-primary/50 pl-4 italic text-muted-foreground" {...props} />
                    ),
                    code(props) {
                      const { children, className, node, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      return match || String(children).includes("\n") ? (
                        <CodeBlock code={String(children).replace(/\n$/, '')} language={match ? match[1] : 'python'} className="my-3 overflow-x-auto" />
                      ) : (
                        <code className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--color-primary)]" {...rest}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {cell.code}
                </ReactMarkdown>
              </div>
            ) : (
              <CodeBlock code={finalCode} className="max-h-[28rem] overflow-auto" />
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

// ─── BlockInfo ────────────────────────────────────────────────────────────────
// Rich, collapsible recap of the catalog metadata behind a notebook cell:
// description, when_to_use, use_cases, pros / cons, hyperparameters,
// eval_metrics, library/class — everything the YAML carries.

function BlockInfo({ block }: { block: CatalogBlock }) {
  const [open, setOpen] = useState(false);

  const hyperparams =
    block.hyperparameters && typeof block.hyperparameters === "object"
      ? Object.entries(block.hyperparameters)
      : [];

  const tags: { label: string; value: string }[] = [];
  if (block.library) tags.push({ label: "lib", value: String(block.library) });
  if (block.class) tags.push({ label: "class", value: String(block.class) });
  if (block.format) tags.push({ label: "format", value: String(block.format) });
  if (block.applies_to?.length)
    tags.push({ label: "applies", value: block.applies_to.join(", ") });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-accent/30"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Infos du bloc
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {block.id}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3 text-xs">
          {/* Tags row */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t.label}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px]"
                >
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="text-foreground">{t.value}</span>
                </span>
              ))}
            </div>
          )}

          {block.description && (
            <InfoSection title="Description">
              <p className="leading-relaxed text-foreground/80">{block.description}</p>
            </InfoSection>
          )}

          {block.when_to_use && (
            <InfoSection title="Quand l'utiliser">
              <p className="leading-relaxed text-foreground/80">{block.when_to_use}</p>
            </InfoSection>
          )}

          {block.use_cases && block.use_cases.length > 0 && (
            <InfoSection title="Cas d'usage">
              <ul className="ml-1 list-inside list-disc space-y-0.5 text-foreground/80">
                {block.use_cases.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </InfoSection>
          )}

          {(block.pros?.length || block.cons?.length) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {block.pros && block.pros.length > 0 && (
                <InfoSection title="Avantages" tone="success">
                  <ul className="ml-1 list-inside list-disc space-y-0.5 text-foreground/80">
                    {block.pros.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </InfoSection>
              )}
              {block.cons && block.cons.length > 0 && (
                <InfoSection title="Limites" tone="danger">
                  <ul className="ml-1 list-inside list-disc space-y-0.5 text-foreground/80">
                    {block.cons.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </InfoSection>
              )}
            </div>
          )}

          {hyperparams.length > 0 && (
            <InfoSection title="Hyperparamètres par défaut">
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-[11px]">
                  <tbody>
                    {hyperparams.map(([k, v]) => (
                      <tr key={k} className="border-b border-border/60 last:border-0">
                        <td className="bg-card/60 px-2 py-1 font-mono text-muted-foreground">
                          {k}
                        </td>
                        <td className="px-2 py-1 font-mono text-foreground/85">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoSection>
          )}

          {block.eval_metrics && block.eval_metrics.length > 0 && (
            <InfoSection title="Métriques d'évaluation">
              <div className="flex flex-wrap gap-1">
                {block.eval_metrics.map((m) => (
                  <code
                    key={m}
                    className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]"
                  >
                    {m}
                  </code>
                ))}
              </div>
            </InfoSection>
          )}
        </div>
      )}
    </div>
  );
}

function InfoSection({
  title,
  tone = "muted",
  children,
}: {
  title: string;
  tone?: "muted" | "success" | "danger";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "success"
      ? "text-[color:var(--color-success)]"
      : tone === "danger"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div>
      <h5 className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${toneCls}`}>
        {title}
      </h5>
      {children}
    </div>
  );
}

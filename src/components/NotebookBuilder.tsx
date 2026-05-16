import { useMemo, useState } from "react";
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
  applyParamOverrides,
  buildNotebookJSON,
  buildPythonScript,
  downloadText,
  extractParams,
  openInColab,
  validateNotebook,
  type NotebookCell,
  type ParsedCatalog,
} from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCode,
  GripVertical,
  Notebook,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

interface Props {
  cells: NotebookCell[];
  setCells: (c: NotebookCell[]) => void;
  catalogs: ParsedCatalog[];
}

export function NotebookBuilder({ cells, setCells, catalogs }: Props) {
  const [openUid, setOpenUid] = useState<string | null>(null);
  const validations = useMemo(() => validateNotebook(cells, catalogs), [cells, catalogs]);
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
  const updateOverride = (uid: string, name: string, value: string) =>
    setCells(
      cells.map((c) =>
        c.uid === uid ? { ...c, overrides: { ...c.overrides, [name]: value } } : c,
      ),
    );
  const updateCode = (uid: string, code: string) =>
    setCells(
      cells.map((c) =>
        c.uid === uid ? { ...c, code, params: extractParams(code) } : c,
      ),
    );

  const errorCount = validations.filter((v) => !v.ok).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/30 px-5 py-3">
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
            onClick={() => downloadText("pipeline.py", buildPythonScript(cells), "text/x-python")}
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
        </div>
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
              <SortableContext items={cells.map((c) => c.uid)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-2.5">
                  {cells.map((cell, i) => (
                    <SortableCell
                      key={cell.uid}
                      cell={cell}
                      index={i}
                      validation={validations[i]}
                      isOpen={openUid === cell.uid}
                      onToggle={() => setOpenUid(openUid === cell.uid ? null : cell.uid)}
                      onRemove={() => remove(cell.uid)}
                      onOverride={(n, v) => updateOverride(cell.uid, n, v)}
                      onCode={(code) => updateCode(cell.uid, code)}
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

function SortableCell({
  cell,
  index,
  validation,
  isOpen,
  onToggle,
  onRemove,
  onOverride,
  onCode,
}: {
  cell: NotebookCell;
  index: number;
  validation: { ok: boolean; missing: string[]; outOfOrder: boolean };
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onOverride: (name: string, value: string) => void;
  onCode: (code: string) => void;
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
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          aria-label="Retirer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 border-t border-border px-4 py-4">
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

          {cell.params.length > 0 && (
            <div>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Paramètres
              </h4>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {cell.params.map((p) => (
                  <label key={p.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-32 shrink-0 truncate font-mono text-foreground"
                      title={p.name}
                    >
                      {p.name}
                    </span>
                    <Input
                      value={cell.overrides[p.name] ?? p.defaultLiteral}
                      onChange={(e) => onOverride(p.name, e.target.value)}
                      className="h-8 rounded-lg font-mono text-xs"
                    />
                    <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {p.type}
                    </span>
                    {cell.overrides[p.name] !== undefined && (
                      <button
                        onClick={() => onOverride(p.name, "")}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Reset"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <VarGroup
              title="Requiert"
              vars={cell.required}
              missing={validation.missing}
              tone="muted"
            />
            <VarGroup title="Produit" vars={cell.produced} tone="primary" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Code
              </h4>
              <div className="flex gap-1.5">
                {editing && (
                  <button
                    onClick={() => onCode(cell.code)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                    title="La cellule est déjà éditée — utilisez Retirer pour revenir au catalogue"
                  >
                    <RotateCcw className="h-3 w-3" />
                    reformat
                  </button>
                )}
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {editing ? "Aperçu" : "Éditer"}
                </button>
              </div>
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
        </div>
      )}
    </li>
  );
}

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

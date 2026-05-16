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
  Download,
  FileCode,
  GripVertical,
  Notebook,
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

  const errorCount = validations.filter((v) => !v.ok).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/40 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Notebook className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Notebook</span>
          <span className="font-mono text-xs text-muted-foreground">
            {cells.length} {cells.length > 1 ? "cellules" : "cellule"}
          </span>
          {errorCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {errorCount} I/O
            </span>
          ) : cells.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-success)]/15 px-2 py-0.5 font-mono text-[10px] text-[color:var(--color-success)]">
              <CheckCircle2 className="h-3 w-3" />
              I/O valide
            </span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={!cells.length}
            onClick={() => downloadText("pipeline.ipynb", buildNotebookJSON(cells), "application/x-ipynb+json")}
          >
            <Download className="h-3.5 w-3.5" />
            .ipynb
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!cells.length}
            onClick={() => downloadText("pipeline.py", buildPythonScript(cells), "text/x-python")}
          >
            <FileCode className="h-3.5 w-3.5" />
            .py
          </Button>
          <Button
            size="sm"
            disabled={!cells.length}
            onClick={() => openInColab(buildNotebookJSON(cells))}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Colab
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {cells.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center text-sm text-muted-foreground">
              <Notebook className="mx-auto mb-3 h-8 w-8 opacity-40" />
              Parcourez les catalogues à gauche et cliquez{" "}
              <span className="font-mono text-primary">+ Ajouter</span> pour construire votre pipeline.
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={cells.map((c) => c.uid)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
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
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
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
}: {
  cell: NotebookCell;
  index: number;
  validation: { ok: boolean; missing: string[]; outOfOrder: boolean };
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onOverride: (name: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cell.uid,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const finalCode = applyParamOverrides(cell.code, cell.overrides);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card/40 transition ${
        validation.ok ? "border-border" : "border-destructive/60 bg-destructive/5"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground"
          aria-label="Déplacer"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">[{index + 1}]</span>
        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
          B{cell.bloc}
        </span>
        <button onClick={onToggle} className="flex-1 truncate text-left text-sm font-medium hover:text-primary">
          {cell.name}
        </button>
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
          {cell.section}
        </span>
        {!validation.ok && (
          <span
            className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] text-destructive"
            title={
              validation.outOfOrder
                ? "Ordre des blocs invalide"
                : `Manque: ${validation.missing.join(", ")}`
            }
          >
            <AlertTriangle className="h-3 w-3" />
            {validation.outOfOrder ? "ordre" : `manque ${validation.missing.length}`}
          </span>
        )}
        <button
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          aria-label="Retirer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {!validation.ok && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <div>
                {validation.outOfOrder && (
                  <div className="text-destructive">
                    Cette cellule (bloc {cell.bloc}) arrive après un bloc plus avancé. Réordonnez ou
                    ajoutez les blocs amont.
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
              <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Paramètres
              </h4>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {cell.params.map((p) => (
                  <label key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="w-32 shrink-0 truncate font-mono text-primary" title={p.name}>
                      {p.name}
                    </span>
                    <Input
                      defaultValue={cell.overrides[p.name] ?? p.defaultLiteral}
                      onChange={(e) => onOverride(p.name, e.target.value)}
                      className="h-7 font-mono text-xs"
                    />
                    <span className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground">
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

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Requiert
              </h4>
              <div className="flex flex-wrap gap-1">
                {cell.required.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  cell.required.map((v) => (
                    <code
                      key={v}
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        validation.missing.includes(v)
                          ? "bg-destructive/15 text-destructive"
                          : "bg-accent text-foreground"
                      }`}
                    >
                      {v}
                    </code>
                  ))
                )}
              </div>
            </div>
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Produit
              </h4>
              <div className="flex flex-wrap gap-1">
                {cell.produced.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  cell.produced.map((v) => (
                    <code
                      key={v}
                      className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary"
                    >
                      {v}
                    </code>
                  ))
                )}
              </div>
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Code généré
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-border bg-[oklch(0.12_0.008_260)] p-3 font-mono text-[11px] leading-relaxed">
              <code>{finalCode}</code>
            </pre>
          </details>
        </div>
      )}
    </li>
  );
}

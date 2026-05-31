import yaml from "js-yaml";

export interface IOContract {
  bloc: number;
  role: string;
  input_variables: Record<string, string>;
  output_variables: Record<string, string>;
  [k: string]: unknown;
}

export interface CatalogBlock {
  id: string;
  name: string;
  enabled?: boolean;
  category?: string;
  description?: string;
  applies_to?: string[];
  when_to_use?: string;
  use_cases?: string[];
  pros?: string[];
  cons?: string[];
  format?: string;
  library?: string;
  class?: string;
  hyperparameters?: Record<string, unknown>;
  eval_metrics?: string[];
  input_variables?:
    | { required?: string[]; optional?: string[] }
    | Record<string, string>;
  output_variables?: Record<string, string> | string[];
  output_contract?: Record<string, string>;
  illustration_svg?: string;
  code_template?: string;
  reentry_target?: string;

  // injected
  bloc: number;
  blocName: string;
  section: string;
}

export interface ParsedCatalog {
  bloc: number;
  blocName: string;
  folder: string;
  contract: IOContract;
  sections: { name: string; blocks: CatalogBlock[] }[];
}

const BLOC_FILES: { bloc: number; name: string; folder: string }[] = [
  { bloc: -1, name: "Custom", folder: "bloc0_custom" },
  { bloc: 1, name: "Datasets", folder: "bloc1_datasets" },
  { bloc: 2, name: "Preprocessing", folder: "bloc2_preprocessing" },
  { bloc: 3, name: "Modèles", folder: "bloc3_models" },
  { bloc: 4, name: "Évaluation", folder: "bloc4_evaluation" },
  { bloc: 5, name: "Déploiement & API", folder: "bloc5_deployment" },
];

export async function loadAllCatalogs(): Promise<ParsedCatalog[]> {
  const results: ParsedCatalog[] = [];
  
  // Charge dynamiquement tous les fichiers YAML du dossier catalogs au moment du build
  const catalogModules = import.meta.glob('../configs/catalogs/**/*.yaml', { query: '?raw', eager: true });

  for (const { bloc, name, folder } of BLOC_FILES) {
    const data: Record<string, any> = {
      pipeline_contract: {
        bloc,
        role: "",
        input_variables: {},
        output_variables: {},
      },
      catalog: {}
    };

    for (const [path, module] of Object.entries(catalogModules)) {
      if (!path.includes(`/${folder}/`)) continue;
      
      const text = (module as any).default;
      const parsed = yaml.load(text) as Record<string, any>;
      
      const fileName = path.split('/').pop() || '';
      
      if (fileName === '_contract.yaml') {
        if (parsed.pipeline_contract) {
          data.pipeline_contract = parsed.pipeline_contract;
        }
        continue;
      }
      
      const section = parsed._metadata?.section;
      if (section) {
        if (!data[section]) data[section] = [];
        data[section].push(parsed);
      }
    }

    const contract = data.pipeline_contract as IOContract;

    const sections: { name: string; blocks: CatalogBlock[] }[] = [];

    for (const [key, rawBlocks] of Object.entries(data)) {
      if (key === "pipeline_contract" || key === "catalog") continue;
      if (!Array.isArray(rawBlocks)) continue;

      const blocks: CatalogBlock[] = rawBlocks
        .filter(
          (b): b is CatalogBlock =>
            !!b &&
            typeof b === "object" &&
            "id" in b &&
            typeof b.id === "string"
        )
        .map((b) => ({
          ...b,
          bloc,
          blocName: name,
          section: key,
        }));

      if (blocks.length > 0) {
        sections.push({ name: key, blocks });
      }
    }

    results.push({
      bloc,
      blocName: name,
      contract,
      sections,
      folder,
    });
  }

  return results;
}

export function allBlocks(
  catalogs: ParsedCatalog[]
): CatalogBlock[] {
  return catalogs.flatMap((c) =>
    c.sections.flatMap((s) => s.blocks)
  );
}

// ─────────────────────────────────────────────
// Param extraction
// ─────────────────────────────────────────────

export type ParamKind =
  | "file"
  | "dir"
  | "column"
  | "boolean"
  | "ratio"
  | "int"
  | "number"
  | "string"
  | "text"
  | "expr";

export interface ParamDef {
  name: string;
  defaultLiteral: string;
  type: "string" | "number" | "boolean" | "expr" | "text";
  kind: ParamKind;
}

const PARAM_BLOCK_RE = /^[ \t]*# \[PARAM:\s*([A-Za-z0-9_]+)(?:\s*\|\s*([a-z]+))?\]\s*\n([ \t]*[A-Za-z0-9_]+\s*=\s*)([\s\S]*?)\n[ \t]*# \[\/PARAM\]/gm;

export function extractParams(code: string): ParamDef[] {
  if (!code) return [];

  const seen = new Set<string>();
  const out: ParamDef[] = [];

  let m: RegExpExecArray | null;
  PARAM_BLOCK_RE.lastIndex = 0;

  while ((m = PARAM_BLOCK_RE.exec(code))) {
    const name = m[1];
    const declaredType = m[2]; // ex: int, ratio, boolean
    const lit = m[4].trim();

    if (seen.has(name)) continue;
    seen.add(name);

    let type: ParamDef["type"] = "expr";

    if (/^("""|''')[\s\S]*\1$/.test(lit)) {
      type = "text";
    } else if (/^["'][\s\S]*["']$/.test(lit)) {
      type = "string";
    } else if (/^-?\d+(\.\d+)?$/.test(lit)) {
      type = "number";
    } else if (/^(True|False)$/.test(lit)) {
      type = "boolean";
    }

    let kind: ParamKind = "expr";
    if (declaredType) {
       kind = declaredType as ParamKind;
    } else {
       if (type === "boolean") kind = "boolean";
       else if (type === "text") kind = "text";
       else if (type === "string") kind = "string";
       else if (type === "number") kind = "number";
    }

    out.push({
      name,
      defaultLiteral: lit,
      type,
      kind,
    });
  }

  return out;
}

export function applyParamOverrides(
  code: string,
  overrides: Record<string, string>
): string {
  if (!code) return code;
  
  return code.replace(PARAM_BLOCK_RE, (match, name, declaredType, lead, value) => {
    if (overrides[name] !== undefined && overrides[name] !== "") {
      const lit = value.trim();
      let type = "expr";
      if (/^("""|''')[\s\S]*\1$/.test(lit)) type = "text";
      else if (/^["'][\s\S]*["']$/.test(lit)) type = "string";
      else if (/^-?\d+(\.\d+)?$/.test(lit)) type = "number";
      else if (/^(True|False)$/.test(lit)) type = "boolean";
      
      let overrideVal = overrides[name];
      if (type === "string") {
        if (!/^["'][\s\S]*["']$/.test(overrideVal)) {
          overrideVal = JSON.stringify(overrideVal);
        }
      } else if (type === "text") {
         if (!/^("""|''')[\s\S]*\1$/.test(overrideVal)) {
            overrideVal = `"""\n${overrideVal}\n"""`;
         }
      }
      return match.replace(lead + value, lead + overrideVal);
    }
    return match;
  });
}

// ─────────────────────────────────────────────
// Notebook cells
// ─────────────────────────────────────────────

export interface NotebookCell {
  uid: string;
  blockId: string;
  bloc: number;
  blocName: string;
  name: string;
  section: string;
  code: string;
  type?: "code" | "markdown";
  params: ParamDef[];
  overrides: Record<string, string>;
  required: string[];
  produced: string[];
  producedMeta: Record<string, string>;
}

function blockRequired(b: CatalogBlock): string[] {
  const iv = b.input_variables;

  if (
    iv &&
    !Array.isArray(iv) &&
    typeof iv === "object" &&
    "required" in iv
  ) {
    return (
      (iv as { required?: string[] }).required ?? []
    ).filter((s) => /^[a-z_]/.test(s));
  }

  return [];
}

function blockProduced(b: CatalogBlock): string[] {
  const ov = b.output_variables;

  if (Array.isArray(ov)) {
    return ov.filter((s) => /^[a-z_]/.test(s));
  }

  if (ov && typeof ov === "object") {
    return Object.keys(ov).filter((s) => /^[a-z_]/.test(s));
  }

  if (
    b.output_contract &&
    typeof b.output_contract === "object"
  ) {
    return Object.keys(b.output_contract).filter((s) =>
      /^[a-z_]/.test(s)
    );
  }

  return [];
}

function blockProducedMeta(
  b: CatalogBlock
): Record<string, string> {
  const out: Record<string, string> = {};

  const ov = b.output_variables;

  if (ov && !Array.isArray(ov) && typeof ov === "object") {
    for (const [k, v] of Object.entries(ov)) {
      if (/^[a-z_]/.test(k)) {
        out[k] = String(v);
      }
    }
  }

  if (
    b.output_contract &&
    typeof b.output_contract === "object"
  ) {
    for (const [k, v] of Object.entries(
      b.output_contract
    )) {
      if (/^[a-z_]/.test(k) && !out[k]) {
        out[k] = String(v);
      }
    }
  }

  return out;
}

export function makeCell(b: CatalogBlock): NotebookCell {
  const code = b.code_template ?? "";
  const params = extractParams(code);

  return {
    uid: `${b.id}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    blockId: b.id,
    bloc: b.bloc,
    blocName: b.blocName,
    name: b.name,
    section: b.section,
    code,
    params,
    overrides: {},
    required: blockRequired(b),
    produced: blockProduced(b),
    producedMeta: blockProducedMeta(b),
  };
}

export interface CellValidation {
  ok: boolean;
  missing: string[];
  outOfOrder: boolean;
}

export function validateNotebook(
  cells: NotebookCell[],
  catalogs: ParsedCatalog[]
): CellValidation[] {
  const available = new Set<string>();

  const blocOutputs: Record<number, string[]> = {};

  for (const c of catalogs) {
    blocOutputs[c.bloc] = Object.keys(
      c.contract.output_variables ?? {}
    );
  }

  const results: CellValidation[] = [];

  let maxBloc = 0;

  for (const cell of cells) {
    const missing = cell.required.filter(
      (v) => !available.has(v)
    );

    const outOfOrder = cell.bloc !== -1 && cell.bloc < maxBloc;

    results.push({
      ok: missing.length === 0 && !outOfOrder,
      missing,
      outOfOrder,
    });

    for (const v of blocOutputs[cell.bloc] ?? []) {
      available.add(v);
    }

    for (const v of cell.produced) {
      available.add(v);
    }

    if (cell.bloc !== -1 && cell.bloc > maxBloc) {
      maxBloc = cell.bloc;
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// Exporters
// ─────────────────────────────────────────────

export function buildNotebookJSON(
  cells: NotebookCell[]
): string {
  const nbCells: unknown[] = [
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "# ML Pipeline Notebook\n",
        "_Généré par Pipeline Studio_\n",
      ],
    },
  ];

  let currentBloc = 0;

  for (const cell of cells) {
    if (cell.bloc !== currentBloc) {
      currentBloc = cell.bloc;

      nbCells.push({
        cell_type: "markdown",
        metadata: {},
        source: [
          `## Bloc ${cell.bloc} — ${cell.blocName}\n`,
        ],
      });
    }

    const code = applyParamOverrides(
      cell.code,
      cell.overrides
    );

    nbCells.push({
      cell_type: "markdown",
      metadata: {},
      source: [
        `### ${cell.name}\n`,
        `_${cell.section}_\n`,
      ],
    });

    if (cell.type === "markdown") {
      nbCells.push({
        cell_type: "markdown",
        metadata: {},
        source: cell.code.split("\n").map((l, i, arr) => (i === arr.length - 1 ? l : `${l}\n`)),
      });
    } else {
      nbCells.push({
        cell_type: "code",
        metadata: {},
        execution_count: null,
        outputs: [],
        source: code.split("\n").map((l, i, arr) => (i === arr.length - 1 ? l : `${l}\n`)),
      });
    }
  }

  const nb = {
    cells: nbCells,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.11",
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };

  return JSON.stringify(nb, null, 1);
}

export function buildPythonScript(
  cells: NotebookCell[]
): string {
  const lines: string[] = [
    '"""ML Pipeline — généré par Pipeline Studio."""',
    "",
  ];

  let currentBloc = 0;

  for (const cell of cells) {
    if (cell.bloc !== currentBloc) {
      currentBloc = cell.bloc;

      lines.push("");
      lines.push("# " + "═".repeat(72));
      lines.push(
        `# BLOC ${cell.bloc} — ${cell.blocName}`
      );
      lines.push("# " + "═".repeat(72));
    }

    lines.push("");
    lines.push(
      `# ── ${cell.name} (${cell.section}) ──────────────────────────`
    );

    if (cell.type === "markdown") {
      lines.push('"""');
      lines.push(cell.code.trimEnd());
      lines.push('"""');
    } else {
      lines.push(
        applyParamOverrides(
          cell.code,
          cell.overrides
        ).trimEnd()
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function downloadText(
  filename: string,
  content: string,
  mime = "text/plain"
) {
  const blob = new Blob([content], {
    type: mime,
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export function openInColab(
  notebookJSON: string
) {
  const b64 =
    typeof window !== "undefined"
      ? btoa(
          unescape(
            encodeURIComponent(notebookJSON)
          )
        )
      : "";

  const dataUrl = `data:application/x-ipynb+json;base64,${b64}`;

  const colab =
    "https://colab.research.google.com/#create=true";

  const w = window.open(colab, "_blank");

  if (!w) return;

  downloadText(
    "pipeline.ipynb",
    notebookJSON,
    "application/x-ipynb+json"
  );

  void dataUrl;
}

export function parseNotebookJSON(jsonStr: string): NotebookCell[] {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error("Fichier non valide (JSON invalide)");
  }
  
  if (!data || !Array.isArray(data.cells)) {
    throw new Error("Le fichier ne semble pas être un notebook Jupyter valide.");
  }

  const cells: NotebookCell[] = [];
  let cellCount = 1;

  for (const cell of data.cells) {
    if (!cell.source) continue;
    let code = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source);
    
    // Convert markdown cells to python comments so we can run them
    let type: "code" | "markdown" = "code";
    if (cell.cell_type === "markdown") {
      // Ignore empty markdown cells or pipeline generated headings
      if (!code.trim()) continue;
      if (code.startsWith("# ML Pipeline Notebook")) continue;
      if (code.startsWith("## Bloc ")) continue;
      if (code.match(/^### Cellule [0-9]+/)) continue;
      
      type = "markdown";
    }

    if (!code.trim()) continue; // Ignore totally empty cells

    cells.push({
      uid: `import-${Math.random().toString(36).slice(2, 8)}`,
      blockId: "custom-import",
      bloc: 99,
      blocName: "Importé",
      name: `Cellule ${cellCount++}`,
      section: "Notebook externe",
      code,
      type,
      params: type === "code" ? extractParams(code) : [],
      overrides: {},
      required: [],
      produced: [],
      producedMeta: {},
    });
  }

  return cells;
}

// ─────────────────────────────────────────────
// Pipelines
// ─────────────────────────────────────────────

export interface PipelineNode {
  node_id: string;
  block_id: string;
  depends_on?: string[];
  params?: Record<string, any>;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes: PipelineNode[];
}

export async function loadAllPipelines(): Promise<PipelineTemplate[]> {
  const results: PipelineTemplate[] = [];
  
  // Charge dynamiquement tous les fichiers YAML du dossier pipelines au moment du build
  const pipelineModules = import.meta.glob('../configs/pipelines/**/*.yaml', { query: '?raw', eager: true });

  for (const [path, module] of Object.entries(pipelineModules)) {
    const text = (module as any).default;
    const parsed = yaml.load(text) as Record<string, any>;
    
    // Ignore le contrat
    if (path.includes('_contract.yaml')) continue;
    
    if (parsed.id && parsed.nodes) {
      results.push(parsed as PipelineTemplate);
    }
  }

  return results;
}

export function buildPipelineYaml(
function escapeHtml(unsafe: string) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildHtmlReport(cells: NotebookCell[], outputs: Record<string, any>): string {
  const cellsHtml = cells.map((cell, index) => {
    const code = applyParamOverrides(cell.code, cell.overrides);
    const output = outputs[cell.uid];

    let cellContent = '';

    if (cell.type === 'markdown') {
      cellContent = `<div class="markdown-cell"><pre style="font-family: inherit; font-size: 1rem; background: transparent; border: none; white-space: pre-wrap; padding: 0;">${escapeHtml(code)}</pre></div>`;
    } else {
      let outHtml = '';
      if (output) {
        outHtml += `<div class="output">`;
        if (output.stdout) {
          outHtml += `<pre class="output-text">${escapeHtml(output.stdout)}</pre>`;
        }
        if (output.stderr) {
          outHtml += `<pre class="output-error">${escapeHtml(output.stderr)}</pre>`;
        }
        if (output.displays) {
          output.displays.forEach((d: any) => {
            if (d.metadata?.renderAs === 'image') {
              outHtml += `<div class="output-img"><img src="data:${d.mime};base64,${d.data}" /></div>`;
            } else if (d.metadata?.renderAs === 'html') {
              outHtml += `<div style="background: white; color: black; padding: 1rem; border-radius: 4px;">${d.data}</div>`;
            } else {
              outHtml += `<pre class="output-text">${escapeHtml(d.data)}</pre>`;
            }
          });
        }
        outHtml += `</div>`;
      }

      cellContent = `
        <div class="code-cell">
          <div class="cell-header">[${index + 1}] ${escapeHtml(cell.name)}</div>
          <pre class="code-pre"><code class="language-python">${escapeHtml(code)}</code></pre>
          ${outHtml}
        </div>
      `;
    }

    return `<div class="cell">${cellContent}</div>`;
  }).join('\n');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Rapport d'exécution</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 2rem; color: #333; background: #f8fafc; }
    h1, h2, h3 { border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; color: #0f172a; }
    .cell { margin-bottom: 2.5rem; padding: 1.5rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .cell-header { font-size: 0.85em; font-weight: bold; color: #475569; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .markdown-cell { border: none; padding: 0; margin-bottom: 1.5rem; background: transparent; box-shadow: none; }
    .code-cell { background: #ffffff; }
    pre { margin: 0; padding: 1rem; overflow-x: auto; font-size: 13px; font-family: 'Consolas', 'Monaco', monospace; border-radius: 6px; }
    .code-pre { background: #f1f5f9; border: 1px solid #e2e8f0; }
    .output { margin-top: 1rem; padding: 1rem; background: #0f172a; border-radius: 6px; color: #e2e8f0; overflow-x: auto; }
    .output-text { background: transparent !important; padding: 0 !important; color: #38bdf8 !important; }
    .output-error { background: transparent !important; padding: 0 !important; color: #ef4444 !important; font-weight: bold; }
    .output-img { background: transparent; padding: 0; }
    .output img { max-width: 100%; height: auto; display: block; margin: 0.5rem 0; border-radius: 4px; background: white; padding: 0.5rem; }
  </style>
</head>
<body>
  <h1>Rapport d'exécution du Pipeline</h1>
  <p><em>Généré automatiquement par Dataml-App</em></p>
  <hr>
  <div id="content">
    ${cellsHtml}
  </div>
  <script>
    if (typeof hljs !== 'undefined') hljs.highlightAll();
  </script>
</body>
</html>`;
}


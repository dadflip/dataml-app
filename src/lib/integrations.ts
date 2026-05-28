// YAML-driven integrations.
// Each enabled integration is materialized as a normal notebook cell at the
// top of the pipeline (bloc 0), with Python code rendered from the YAML
// `code_template` using the values configured in the UI.

import yaml from "js-yaml";
import { extractParams, type NotebookCell } from "./pipeline";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FieldType = "text" | "password" | "textarea" | "select" | "number";

export interface IntegrationField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  default?: string;
  options?: { value: string; label: string }[];
  when?: Record<string, string>;
  hint?: string;
}

export interface IntegrationSpec {
  id: string;
  name: string;
  description: string;
  icon?: string; // lucide icon name
  docs_url?: string;
  fields: IntegrationField[];
  code_template: string;
}

export interface IntegrationsCatalog {
  integrations: IntegrationSpec[];
}

export interface IntegrationInstance {
  enabled: boolean;
  values: Record<string, string>;
}

export type IntegrationsState = Record<string, IntegrationInstance>;

// ─── YAML loader ─────────────────────────────────────────────────────────────

const CATALOG_URL = "/configs/integrations_config.yaml";

export async function loadIntegrationsCatalog(): Promise<IntegrationsCatalog> {
  const res = await fetch(CATALOG_URL);
  const text = await res.text();
  const data = yaml.load(text) as IntegrationsCatalog;
  if (!data || !Array.isArray(data.integrations)) return { integrations: [] };
  return data;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "pipeline-studio:integrations-state";

export function loadIntegrationsState(): IntegrationsState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IntegrationsState;
  } catch {
    /* ignore */
  }
  return {};
}

export function saveIntegrationsState(state: IntegrationsState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function initInstance(spec: IntegrationSpec): IntegrationInstance {
  const values: Record<string, string> = {};
  for (const f of spec.fields) values[f.id] = f.default ?? "";
  return { enabled: false, values };
}

export function countEnabled(state: IntegrationsState): number {
  return Object.values(state).filter((i) => i?.enabled).length;
}

// ─── Template rendering ──────────────────────────────────────────────────────

function pyRepr(s: string): string {
  if (s == null) s = "";
  if (s.includes("\n")) {
    const safe = s.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
    return `"""${safe}"""`;
  }
  const safe = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${safe}"`;
}

export function renderIntegrationCode(
  spec: IntegrationSpec,
  values: Record<string, string>,
): string {
  return spec.code_template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([a-zA-Z]+))?\s*\}\}/g,
    (_full, key: string, filter?: string) => {
      const v = values[key] ?? "";
      if (filter === "repr") return pyRepr(v);
      return v;
    },
  );
}

// ─── Integration → NotebookCell ──────────────────────────────────────────────

const INTEG_UID_PREFIX = "__integ_";

export function isIntegrationCell(cell: NotebookCell): boolean {
  return cell.uid.startsWith(INTEG_UID_PREFIX);
}

function makeIntegrationCell(
  spec: IntegrationSpec,
  values: Record<string, string>,
): NotebookCell {
  const code = renderIntegrationCode(spec, values);
  return {
    uid: `${INTEG_UID_PREFIX}${spec.id}`,
    blockId: `${INTEG_UID_PREFIX}${spec.id}`,
    bloc: 0,
    blocName: "Intégrations",
    name: spec.name,
    section: spec.id,
    code,
    params: extractParams(code),
    overrides: {},
    required: [],
    produced: [],
    producedMeta: {},
  };
}

/**
 * Replaces all integration cells in `cells` with fresh cells generated from
 * the enabled integrations in `state`. Non-integration cells keep their order.
 * Integration cells are always grouped at the top of the notebook.
 */
export function syncIntegrationCells(
  cells: NotebookCell[],
  catalog: IntegrationsCatalog | null,
  state: IntegrationsState,
): NotebookCell[] {
  const rest = cells.filter((c) => !isIntegrationCell(c));
  if (!catalog) return rest;
  const integCells: NotebookCell[] = [];
  for (const spec of catalog.integrations) {
    const inst = state[spec.id];
    if (inst?.enabled) integCells.push(makeIntegrationCell(spec, inst.values));
  }
  return [...integCells, ...rest];
}

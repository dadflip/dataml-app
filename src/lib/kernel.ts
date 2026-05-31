// Jupyter Kernel Gateway client (REST + WS, message protocol v5.3)
// Support étendu des MIME + rendu matplotlib inline

export interface KernelConfig {
  baseUrl: string;
  token?: string;
}

export interface DisplayMetadata {
  isTrusted?: boolean;
  renderAs?:
    | "image"
    | "html"
    | "markdown"
    | "latex"
    | "json"
    | "table"
    | "code"
    | "text";
  isBinary?: boolean;
  fileExtension?: string;
}

export interface DisplayOut {
  mime: string;
  data: string;
  metadata?: DisplayMetadata;
}

export interface ExecResult {
  status: "ok" | "error" | "aborted" | "running";
  stdout: string;
  stderr: string;
  displays: DisplayOut[];
  traceback?: string[];
}

function authHeaders(cfg: KernelConfig): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (
    cfg.baseUrl.includes("loca.lt") ||
    cfg.baseUrl.includes("trycloudflare.com")
  ) {
    h["Bypass-Tunnel-Reminder"] = "true";
  }

  if (cfg.baseUrl.includes("ngrok")) {
    h["ngrok-skip-browser-warning"] = "true";
  }

  if (cfg.token) {
    h["Authorization"] = `token ${cfg.token}`;
  }

  return h;
}

function wsUrl(cfg: KernelConfig, path: string): string {
  const base = cfg.baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  const q = cfg.token ? `?token=${encodeURIComponent(cfg.token)}` : "";
  return `${base}${path}${q}`;
}

export async function pingGateway(cfg: KernelConfig): Promise<boolean> {
  try {
    const r = await fetch(
      `${cfg.baseUrl.replace(/\/$/, "")}/api/kernelspecs`,
      {
        headers: authHeaders(cfg),
      },
    );

    return r.ok;
  } catch {
    return false;
  }
}

export interface KernelInfo {
  id: string;
  name: string;
  last_activity: string;
  execution_state: string;
  connections: number;
}

export async function listKernels(cfg: KernelConfig): Promise<KernelInfo[]> {
  try {
    const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/kernels`, {
      headers: authHeaders(cfg),
    });
    if (!r.ok) return [];
    return (await r.json()) as KernelInfo[];
  } catch {
    return [];
  }
}

export async function startKernel(cfg: KernelConfig): Promise<string> {
  const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/kernels`, {
    method: "POST",
    headers: authHeaders(cfg),
    body: JSON.stringify({ name: "python3" }),
  });

  if (!r.ok) {
    throw new Error(
      `Démarrage kernel échoué (${r.status}). Vérifiez URL/token/CORS.`,
    );
  }

  const j = (await r.json()) as { id: string };

  return j.id;
}

export async function shutdownKernel(
  cfg: KernelConfig,
  id: string,
): Promise<void> {
  try {
    await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/kernels/${id}`, {
      method: "DELETE",
      headers: authHeaders(cfg),
    });
  } catch {
    // ignore
  }
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Priorité des MIME
const MIME_PRIORITY: Record<string, number> = {
  // Images
  "image/png": 100,
  "image/jpeg": 99,
  "image/svg+xml": 98,
  "image/gif": 97,

  // HTML / Rich
  "text/html": 90,
  "text/markdown": 89,
  "text/latex": 88,

  // JSON / structured
  "application/json": 80,
  "application/vnd.plotly.v1+json": 79,
  "text/csv": 78,
  "text/tab-separated-values": 77,

  // Code
  "application/javascript": 70,
  "text/x-python": 69,

  // Plain
  "text/plain": 10,
};

function getBestMimeAndMetadata(
  data: Record<string, unknown>,
): {
  mime: string;
  data: string;
  metadata: DisplayMetadata;
} | null {
  const mimes = Object.keys(data);

  if (mimes.length === 0) {
    return null;
  }

  let bestMime = mimes[0];
  let bestPriority = MIME_PRIORITY[bestMime] || 0;

  for (const mime of mimes) {
    const priority = MIME_PRIORITY[mime] || 0;

    if (priority > bestPriority) {
      bestMime = mime;
      bestPriority = priority;
    }
  }

  const rawData = data[bestMime];

  let strData: string;

  let metadata: DisplayMetadata = {};

  // Images
  if (bestMime.startsWith("image/")) {
    if (typeof rawData === "string") {
      strData = rawData;
    } else if (
      Array.isArray(rawData) &&
      rawData.every((x) => typeof x === "number")
    ) {
      strData = btoa(String.fromCharCode(...(rawData as number[])));
    } else {
      strData = String(rawData);
    }

    metadata = {
      isBinary: true,
      renderAs: "image",
      fileExtension: bestMime.split("/")[1],
    };
  }

  // HTML
  else if (bestMime === "text/html") {
    strData = Array.isArray(rawData)
      ? rawData.join("")
      : String(rawData);

    metadata = {
      renderAs: "html",
      isTrusted: false,
    };
  }

  // Markdown
  else if (bestMime === "text/markdown") {
    strData = Array.isArray(rawData)
      ? rawData.join("")
      : String(rawData);

    metadata = {
      renderAs: "markdown",
    };
  }

  // Latex
  else if (bestMime === "text/latex") {
    strData = Array.isArray(rawData)
      ? rawData.join("")
      : String(rawData);

    metadata = {
      renderAs: "latex",
    };
  }

  // JSON
  else if (
    bestMime === "application/json" ||
    bestMime.includes("json")
  ) {
    strData =
      typeof rawData === "object"
        ? JSON.stringify(rawData, null, 2)
        : String(rawData);

    metadata = {
      renderAs: "json",
    };
  }

  // Table
  else if (
    bestMime === "text/csv" ||
    bestMime === "text/tab-separated-values"
  ) {
    strData = Array.isArray(rawData)
      ? rawData.join("\n")
      : String(rawData);

    metadata = {
      renderAs: "table",
      fileExtension: bestMime === "text/csv" ? "csv" : "tsv",
    };
  }

  // Text
  else {
    strData = Array.isArray(rawData)
      ? rawData.join("")
      : String(rawData);

    metadata = {
      renderAs: "text",
    };
  }

  return {
    mime: bestMime,
    data: strData,
    metadata,
  };
}

export function executeCode(
  cfg: KernelConfig,
  kernelId: string,
  code: string,
  onUpdate?: (r: ExecResult) => void,
): {
  promise: Promise<ExecResult>;
  cancel: () => void;
} {
  const result: ExecResult = {
    status: "running",
    stdout: "",
    stderr: "",
    displays: [],
  };

  let ws: WebSocket | null = null;
  let settled = false;

  let wsTimeout: ReturnType<typeof setTimeout> | null = null;

  const promise = new Promise<ExecResult>((resolve, reject) => {
    wsTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws?.close();

        reject(new Error("WebSocket connection timeout"));
      }
    }, 60000);

    try {
      ws = new WebSocket(
        wsUrl(cfg, `/api/kernels/${kernelId}/channels`),
      );
    } catch (e) {
      if (wsTimeout) clearTimeout(wsTimeout);

      reject(e);

      return;
    }

    const msgId = randomId();
    const sessionId = randomId();

    const finish = (status: ExecResult["status"]) => {
      if (settled) return;

      settled = true;

      if (wsTimeout) clearTimeout(wsTimeout);

      result.status = status;

      onUpdate?.({ ...result });

      ws?.close();

      resolve({ ...result });
    };

    ws.onopen = () => {
      if (wsTimeout) clearTimeout(wsTimeout);

      // IMPORTANT:
      // Force matplotlib inline image rendering
      const wrappedCode = `
%matplotlib inline

import matplotlib
matplotlib.use("module://matplotlib_inline.backend_inline")

import matplotlib_inline
matplotlib_inline.backend_inline.set_matplotlib_formats("png")

${code}
`;

      ws?.send(
        JSON.stringify({
          header: {
            msg_id: msgId,
            username: "lovable",
            session: sessionId,
            msg_type: "execute_request",
            version: "5.3",
            date: new Date().toISOString(),
          },

          parent_header: {},

          metadata: {},

          content: {
            code: wrappedCode,
            silent: false,
            store_history: true,
            user_expressions: {},
            allow_stdin: false,
            stop_on_error: true,
          },

          channel: "shell",

          buffers: [],
        }),
      );
    };

    ws.onmessage = (evt) => {
      let msg: {
        header: { msg_type: string };
        parent_header: {
          msg_id?: string;
          msg_type?: string;
        };
        content: Record<string, unknown>;
        buffers?: Uint8Array[];
      };

      try {
        msg = JSON.parse(evt.data as string);
      } catch (e) {
        console.error("Failed to parse message:", e);
        return;
      }

      if (msg.parent_header?.msg_id !== msgId) {
        return;
      }

      const t = msg.header.msg_type;

      const c = msg.content as Record<string, unknown>;

      // stdout/stderr
      if (t === "stream") {
        const name = c.name as string;
        const text = c.text as string;

        if (name === "stdout") {
          result.stdout += text;
        } else {
          result.stderr += text;
        }

        onUpdate?.({ ...result });
      }

      // display data
      else if (
        t === "execute_result" ||
        t === "display_data" ||
        t === "update_display_data"
      ) {
        const data = (c.data ?? {}) as Record<string, unknown>;

        const best = getBestMimeAndMetadata(data);

        if (best) {
          result.displays.push({
            mime: best.mime,
            data: best.data,
            metadata: best.metadata,
          });
        }

        onUpdate?.({ ...result });
      }

      // error
      else if (t === "error") {
        const tb = (c.traceback as string[]) ?? [];

        result.stderr += tb.join("\n");

        result.traceback = tb;

        onUpdate?.({ ...result });
      }

      // execute reply
      else if (t === "execute_reply") {
        const s = c.status as string;

        if (s === "error") {
          finish("error");
        } else if (s === "ok") {
          finish("ok");
        }
      }

      // status
      else if (t === "status") {
        const state = c.execution_state as string;

        if (
          state === "idle" &&
          msg.parent_header.msg_type === "execute_request"
        ) {
          finish(result.traceback ? "error" : "ok");
        }
      }
    };

    ws.onerror = () => {
      if (!settled) {
        settled = true;

        if (wsTimeout) clearTimeout(wsTimeout);

        reject(
          new Error(
            "Erreur WebSocket — vérifiez le kernel gateway.",
          ),
        );
      }
    };

    ws.onclose = () => {
      if (!settled) {
        settled = true;

        if (wsTimeout) clearTimeout(wsTimeout);

        resolve({
          ...result,
          status:
            result.status === "running"
              ? "aborted"
              : result.status,
        });
      }
    };
  });

  return {
    promise,

    cancel: () => {
      if (!settled) {
        settled = true;

        if (wsTimeout) clearTimeout(wsTimeout);

        ws?.close();
      }
    },
  };
}

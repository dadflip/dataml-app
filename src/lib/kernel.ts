// Jupyter Kernel Gateway client (REST + WS, message protocol v5.3)
// Docs: https://jupyter-kernel-gateway.readthedocs.io/

export interface KernelConfig {
  baseUrl: string; // ex: http://localhost:8888
  token?: string;
}

export interface DisplayOut {
  mime: string;
  data: string;
}

export interface ExecResult {
  status: "ok" | "error" | "aborted" | "running";
  stdout: string;
  stderr: string;
  displays: DisplayOut[];
  traceback?: string[];
}

function authHeaders(cfg: KernelConfig): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.token) h["Authorization"] = `token ${cfg.token}`;
  return h;
}

function wsUrl(cfg: KernelConfig, path: string): string {
  const base = cfg.baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  const q = cfg.token ? `?token=${encodeURIComponent(cfg.token)}` : "";
  return `${base}${path}${q}`;
}

export async function pingGateway(cfg: KernelConfig): Promise<boolean> {
  try {
    const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/kernelspecs`, {
      headers: authHeaders(cfg),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function startKernel(cfg: KernelConfig): Promise<string> {
  const r = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/kernels`, {
    method: "POST",
    headers: authHeaders(cfg),
    body: JSON.stringify({ name: "python3" }),
  });
  if (!r.ok) throw new Error(`Démarrage kernel échoué (${r.status}). Vérifiez l'URL/token/CORS.`);
  const j = (await r.json()) as { id: string };
  return j.id;
}

export async function shutdownKernel(cfg: KernelConfig, id: string): Promise<void> {
  try {
    await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/api/kernels/${id}`, {
      method: "DELETE",
      headers: authHeaders(cfg),
    });
  } catch {
    /* ignore */
  }
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function executeCode(
  cfg: KernelConfig,
  kernelId: string,
  code: string,
  onUpdate?: (r: ExecResult) => void,
): { promise: Promise<ExecResult>; cancel: () => void } {
  const result: ExecResult = { status: "running", stdout: "", stderr: "", displays: [] };
  let ws: WebSocket | null = null;
  let settled = false;

  const promise = new Promise<ExecResult>((resolve, reject) => {
    try {
      ws = new WebSocket(wsUrl(cfg, `/api/kernels/${kernelId}/channels`));
    } catch (e) {
      reject(e);
      return;
    }

    const msgId = randomId();
    const sessionId = randomId();

    const finish = (status: ExecResult["status"]) => {
      if (settled) return;
      settled = true;
      result.status = status;
      onUpdate?.({ ...result });
      ws?.close();
      resolve({ ...result });
    };

    ws.onopen = () => {
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
            code,
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
        parent_header: { msg_id?: string; msg_type?: string };
        content: Record<string, unknown>;
      };
      try {
        msg = JSON.parse(evt.data as string);
      } catch {
        return;
      }
      if (msg.parent_header?.msg_id !== msgId) return;
      const t = msg.header.msg_type;
      const c = msg.content as Record<string, unknown>;

      if (t === "stream") {
        const name = c.name as string;
        const text = c.text as string;
        if (name === "stdout") result.stdout += text;
        else result.stderr += text;
        onUpdate?.({ ...result });
      } else if (t === "execute_result" || t === "display_data") {
        const data = (c.data ?? {}) as Record<string, unknown>;
        
        // Find best representation (from richest to poorest)
        const mimes = Object.keys(data);
        if (mimes.length > 0) {
          const priority = ["image/png", "image/jpeg", "image/svg+xml", "text/html", "text/markdown", "text/plain"];
          let bestMime = mimes[0];
          for (const p of priority) {
            if (mimes.includes(p)) {
              bestMime = p;
              break;
            }
          }
          const val = data[bestMime];
          const strData = Array.isArray(val) ? val.join("") : (typeof val === "object" ? JSON.stringify(val, null, 2) : String(val));
          result.displays.push({ mime: bestMime, data: strData });
        }
        
        onUpdate?.({ ...result });
      } else if (t === "error") {
        const tb = (c.traceback as string[]) ?? [];
        result.stderr += tb.join("\n");
        result.traceback = tb;
        onUpdate?.({ ...result });
      } else if (t === "execute_reply") {
        const s = c.status as string;
        if (s === "error") finish("error");
      } else if (t === "status") {
        const state = c.execution_state as string;
        if (state === "idle" && msg.parent_header.msg_type === "execute_request") {
          finish(result.traceback ? "error" : "ok");
        }
      }
    };

    ws.onerror = () => {
      if (!settled) {
        settled = true;
        reject(new Error("Erreur WebSocket — vérifiez le kernel gateway."));
      }
    };
    ws.onclose = () => {
      if (!settled) {
        settled = true;
        resolve({ ...result, status: result.status === "running" ? "aborted" : result.status });
      }
    };
  });

  return {
    promise,
    cancel: () => {
      if (!settled) {
        settled = true;
        ws?.close();
      }
    },
  };
}

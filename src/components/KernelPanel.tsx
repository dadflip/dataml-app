import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  pingGateway,
  shutdownKernel,
  startKernel,
  type KernelConfig,
} from "@/lib/kernel";
import { CircleDot, HelpCircle, Plug, PlugZap, Loader2 } from "lucide-react";

interface Props {
  cfg: KernelConfig;
  setCfg: (c: KernelConfig) => void;
  kernelId: string | null;
  setKernelId: (id: string | null) => void;
}

const STORAGE_KEY = "pipeline-studio:kernel-cfg";

export function loadStoredCfg(): KernelConfig {
  if (typeof window === "undefined") return { baseUrl: "http://localhost:8888", token: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { baseUrl: "http://localhost:8888", token: "" };
}

export function KernelPanel({ cfg, setCfg, kernelId, setKernelId }: Props) {
  const [status, setStatus] = useState<"off" | "reachable" | "unreachable">("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg]);

  const test = async () => {
    setBusy(true);
    setError(null);
    const ok = await pingGateway(cfg);
    setStatus(ok ? "reachable" : "unreachable");
    if (!ok) setError("Gateway injoignable. Vérifiez CORS, URL ou token.");
    setBusy(false);
  };

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await startKernel(cfg);
      setKernelId(id);
      setStatus("reachable");
    } catch (e) {
      setError((e as Error).message);
      setStatus("unreachable");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!kernelId) return;
    setBusy(true);
    await shutdownKernel(cfg, kernelId);
    setKernelId(null);
    setBusy(false);
  };

  const dot =
    kernelId
      ? "bg-[color:var(--color-success)]"
      : status === "reachable"
        ? "bg-[color:var(--color-warning)]"
        : status === "unreachable"
          ? "bg-destructive"
          : "bg-muted-foreground/50";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="font-mono text-[10px] text-muted-foreground">
          {kernelId ? `kernel ${kernelId.slice(0, 6)}` : "no kernel"}
        </span>
      </div>

      <Input
        value={cfg.baseUrl}
        onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
        placeholder="http://localhost:8888"
        className="h-8 w-44 rounded-full text-xs"
      />
      <Input
        value={cfg.token ?? ""}
        onChange={(e) => setCfg({ ...cfg, token: e.target.value })}
        placeholder="token (optionnel)"
        className="h-8 w-32 rounded-full text-xs"
      />

      <Button size="sm" variant="outline" className="rounded-full" onClick={test} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleDot className="h-3.5 w-3.5" />}
        Test
      </Button>

      {kernelId ? (
        <Button size="sm" variant="outline" className="rounded-full" onClick={disconnect} disabled={busy}>
          <Plug className="h-3.5 w-3.5" /> Arrêter
        </Button>
      ) : (
        <Button size="sm" className="rounded-full" onClick={connect} disabled={busy}>
          <PlugZap className="h-3.5 w-3.5" /> Connecter
        </Button>
      )}

      <SetupHelp origin={typeof window !== "undefined" ? window.location.origin : "https://..."} />

      {error && (
        <span className="w-full font-mono text-[10px] text-destructive">{error}</span>
      )}
    </div>
  );
}

function SetupHelp({ origin }: { origin: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="rounded-full">
          <HelpCircle className="h-3.5 w-3.5" /> Setup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Installer Jupyter Kernel Gateway en local</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Le gateway expose un kernel Python via HTTP/WebSocket. L'app web s'y connecte et
            exécute chaque cellule en direct (stdout, plots, erreurs).
          </p>

          <Step n={1} title="Installer">
            <Code>{`pip install jupyter_kernel_gateway notebook ipykernel
# + vos libs ML
pip install pandas scikit-learn matplotlib seaborn`}</Code>
          </Step>

          <Step n={2} title="Lancer avec CORS complet">
            <Code>{`jupyter kernelgateway \\
  --KernelGatewayApp.ip=0.0.0.0 \\
  --KernelGatewayApp.port=8888 \\
  --KernelGatewayApp.allow_origin='${origin}' \\
  --KernelGatewayApp.allow_headers='Content-Type,Authorization,X-XSRFToken' \\
  --KernelGatewayApp.auth_token='monjeton'`}</Code>
            <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-card/40 p-2.5 text-xs text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground/80">Pourquoi <code>--allow_headers</code> ?</span>{" "}
                Sans ce flag, le navigateur reçoit un preflight CORS sans{" "}
                <code>Access-Control-Allow-Headers: content-type</code> et bloque toutes les
                requêtes avec une erreur <em>"Request header field content-type is not allowed"</em>.
              </p>
              <p>
                Remplacez <code>monjeton</code> par un token de votre choix et reportez-le dans le
                champ token ci-dessus. Pour autoriser toutes les origines (usage local uniquement),
                utilisez <code>--allow_origin='*'</code>.
              </p>
            </div>
          </Step>

          <Step n={3} title="Accès aux fichiers locaux">
            <p className="mb-2 text-xs text-muted-foreground">
              Le kernel s'exécute sur <em>votre machine</em> — les chemins de fichiers sont donc
              des chemins locaux absolus ou relatifs au répertoire de lancement du gateway.
            </p>
            <Code>{`# Absolu (recommandé)
FILE_PATH = "/Users/moi/data/dataset.csv"
FILE_PATH = "C:/Users/moi/data/dataset.csv"   # Windows

# Relatif au dossier où tourne kernelgateway
FILE_PATH = "data/dataset.csv"`}</Code>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Lancez le gateway depuis le dossier contenant vos données pour utiliser des chemins
              relatifs courts.
            </p>
          </Step>

          <Step n={4} title="Connecter">
            <p className="text-xs text-muted-foreground">
              URL : <code>http://localhost:8888</code> · Token : celui défini ci-dessus · puis
              cliquez <span className="font-mono">Connecter</span>. Un bouton{" "}
              <span className="font-mono">Run</span> apparaît sur chaque cellule.
            </p>
          </Step>

          <Step n={5} title="Distant (Colab / VM / ngrok)">
            <p className="text-xs text-muted-foreground">
              Exposez le port via <code>ngrok http 8888</code> et utilisez l'URL HTTPS fournie.
              Ajoutez <code>--ngrok-authtoken</code> si nécessaire. Le gateway accepte WSS
              automatiquement sur les URLs ngrok.
            </p>
            <Code>{`ngrok http 8888
# → https://xxxx.ngrok-free.app
# Utilisez cette URL dans le champ ci-dessus`}</Code>
          </Step>

          <div className="rounded-lg border border-border bg-card/40 p-2.5 text-xs text-muted-foreground">
            <code>allow_origin='*'</code> + token vide = exécution Python ouverte à tout le
            monde. En dehors d'un usage strictement local, définissez un token et restreignez
            l'origine à <code>{origin}</code>.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] text-background">
          {n}
        </span>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-auto rounded-lg border border-border bg-[oklch(0.1_0.004_260)] p-2.5 font-mono text-[11px] leading-relaxed text-foreground/95">
      {children}
    </pre>
  );
}

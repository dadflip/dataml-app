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
import {
  CircleDot,
  HelpCircle,
  Plug,
  PlugZap,
  Loader2,
  Monitor,
  Globe,
  Network,
  ShieldAlert,
} from "lucide-react";

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
  } catch { /* ignore */ }
  return { baseUrl: "http://localhost:8888", token: "" };
}

export function KernelPanel({ cfg, setCfg, kernelId, setKernelId }: Props) {
  const [status, setStatus] = useState<"off" | "reachable" | "unreachable">("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, [cfg]);

  const test = async () => {
    setBusy(true); setError(null);
    const ok = await pingGateway(cfg);
    setStatus(ok ? "reachable" : "unreachable");
    if (!ok) setError("Gateway injoignable. Vérifiez CORS, URL ou token.");
    setBusy(false);
  };

  const connect = async () => {
    setBusy(true); setError(null);
    try {
      const id = await startKernel(cfg);
      setKernelId(id); setStatus("reachable");
    } catch (e) {
      setError((e as Error).message); setStatus("unreachable");
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!kernelId) return;
    setBusy(true);
    await shutdownKernel(cfg, kernelId);
    setKernelId(null); setBusy(false);
  };

  const dot =
    kernelId ? "bg-[color:var(--color-success)]"
    : status === "reachable" ? "bg-[color:var(--color-warning)]"
    : status === "unreachable" ? "bg-destructive"
    : "bg-muted-foreground/50";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 shrink-0"
        style={{ background: "oklch(0.14 0.014 260)", borderColor: "oklch(0.22 0.012 260)" }}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <span className="font-mono text-[10px] text-muted-foreground">
          {kernelId ? `kernel ${kernelId.slice(0, 6)}` : "no kernel"}
        </span>
      </div>
      <Input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
        placeholder="http://localhost:8888"
        className="h-8 min-w-0 flex-1 basis-36 rounded-lg text-xs sm:w-44 sm:flex-none" />
      <Input value={cfg.token ?? ""} onChange={(e) => setCfg({ ...cfg, token: e.target.value })}
        placeholder="token" className="h-8 min-w-0 w-24 rounded-lg text-xs" />
      <Button size="sm" variant="outline" onClick={test} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleDot className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Test</span>
      </Button>
      {kernelId ? (
        <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>
          <Plug className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Arrêter</span>
        </Button>
      ) : (
        <Button size="sm" onClick={connect} disabled={busy}>
          <PlugZap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Connecter</span>
        </Button>
      )}
      <SetupHelp origin={typeof window !== "undefined" ? window.location.origin : "https://..."} />
      {error && <span className="w-full font-mono text-[10px] text-destructive">{error}</span>}
    </div>
  );
}

// ─── SetupHelp ────────────────────────────────────────────────────────────────

type Mode = "local" | "lan" | "chromebook" | "remote";

const MODES: { key: Mode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { key: "local",       icon: Monitor, label: "Même machine"  },
  { key: "lan",         icon: Network, label: "Réseau local"  },
  { key: "chromebook",  icon: Globe,   label: "Chromebook"    },
  { key: "remote",      icon: Globe,   label: "ngrok / Colab" },
];

function SetupHelp({ origin }: { origin: string }) {
  const [mode, setMode] = useState<Mode>("local");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)",
            color: "#ffffff",
            animation: "setupPulse 2.8s ease-in-out infinite",
            boxShadow: "0 0 0 0 rgba(59,63,245,0.5)",
          }}
        >
          <span
            className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-600"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
          />
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Setup</span>
          <style>{`
            @keyframes setupPulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(59,63,245,0.5), 0 2px 8px rgba(0,0,145,0.25); }
              50%       { box-shadow: 0 0 0 5px rgba(59,63,245,0), 0 2px 8px rgba(0,0,145,0.25); }
            }
          `}</style>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Connecter un kernel Python</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            DataML s'appuie sur <strong>Jupyter Kernel Gateway</strong> pour exécuter le code Python de votre pipeline en temps réel.
          </p>
        </DialogHeader>

        {/* ── Mode switcher ── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl mt-1"
          style={{ background: "oklch(0.10 0.014 260)", border: "1px solid oklch(0.22 0.012 260)" }}
        >
          {MODES.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold transition-all duration-150"
              style={
                mode === key
                  ? { background: "linear-gradient(135deg, #3b3ff5, #000091)", color: "#fff", boxShadow: "0 0 10px rgba(59,63,245,0.3)" }
                  : { color: "oklch(0.50 0.015 260)", background: "transparent" }
              }
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4 text-sm mt-2">

          {/* STEP 1 — always shown */}
          <Step n={1} title="Installer les dépendances">
            <Code lines={[
              "pip install jupyter_kernel_gateway notebook ipykernel",
              "# Libs ML recommandées",
              "pip install pandas scikit-learn matplotlib seaborn xgboost",
            ]} />
          </Step>

          {/* STEP 2 — varies by mode */}
          {mode === "local" && (
            <Step n={2} title="Lancer en local (même machine)">
              <Code lines={[
                `jupyter kernelgateway \\`,
                `  --KernelGatewayApp.ip=127.0.0.1 \\`,
                `  --KernelGatewayApp.port=8888 \\`,
                `  --KernelGatewayApp.allow_origin='${origin}' \\`,
                `  --KernelGatewayApp.allow_headers='Content-Type,Authorization,X-XSRFToken' \\`,
                `  --KernelGatewayApp.auth_token='monjeton'`,
              ]} />
              <Note>Entrez <Mono>http://localhost:8888</Mono> et le token <Mono>monjeton</Mono> dans les champs ci-dessus.</Note>
            </Step>
          )}

          {mode === "lan" && (
            <Step n={2} title="Lancer sur un PC du réseau local (LAN)">
              <p className="mb-2 text-xs text-muted-foreground">Exécutez les commandes <strong>sur le PC qui servira de kernel</strong>.</p>

              <Label>① Trouver l'IP locale du PC kernel</Label>
              <Code lines={[
                "# Windows (PowerShell)",
                'ipconfig | findstr "IPv4"',
                "# → ex : 192.168.1.42",
                "",
                "# macOS / Linux",
                'ip a | grep "inet " | grep -v 127',
                "# → ex : 192.168.1.42",
              ]} />

              <Label className="mt-3">② Lancer le gateway</Label>
              <Code lines={[
                "jupyter kernelgateway \\",
                "  --KernelGatewayApp.ip=0.0.0.0 \\",
                "  --KernelGatewayApp.port=8888 \\",
                "  --KernelGatewayApp.allow_origin='*' \\",
                "  --KernelGatewayApp.allow_headers='Content-Type,Authorization,X-XSRFToken' \\",
                "  --KernelGatewayApp.auth_token='monjeton'",
              ]} />

              <Label className="mt-3">③ Ouvrir le port pare-feu si nécessaire</Label>
              <Code lines={[
                "# Windows (PowerShell admin)",
                'New-NetFirewallRule -DisplayName "Kernel Gateway" `',
                "  -Direction Inbound -Protocol TCP -LocalPort 8888 -Action Allow",
                "",
                "# Linux (ufw)",
                "sudo ufw allow 8888/tcp",
              ]} />

              <Note className="mt-2">Connectez-vous avec <Mono>http://192.168.1.42:8888</Mono> (l'IP du PC kernel) et le token <Mono>monjeton</Mono>.</Note>
            </Step>
          )}

          {mode === "chromebook" && (
            <Step n={2} title="Chromebook (Linux Crostini) → autre appareil">
              <Note type="warn">
                <strong>Problème spécifique Chromebook :</strong> le kernel tourne dans un <em>conteneur Linux (Crostini)</em> isolé du WiFi. Son IP interne (<Mono>100.115.92.x</Mono>) n'est pas routable depuis d'autres appareils. Il faut ponter le port vers l'interface WiFi du Chromebook.
              </Note>

              <Label className="mt-3">① Lancer le kernel gateway dans le terminal Linux</Label>
              <Code lines={[
                "jupyter kernelgateway \\",
                "  --KernelGatewayApp.ip=0.0.0.0 \\",
                "  --KernelGatewayApp.port=8888 \\",
                "  --KernelGatewayApp.allow_origin='*' \\",
                "  --KernelGatewayApp.allow_headers='Content-Type,Authorization,X-XSRFToken' \\",
                "  --KernelGatewayApp.auth_token='monjeton'",
              ]} />

              <Label className="mt-3">② Trouver l'IP WiFi du Chromebook</Label>
              <p className="mb-1 text-xs text-muted-foreground">Dans <strong>Chrome OS</strong> (paramètres système, pas le terminal Linux) :</p>
              <Code lines={[
                "Paramètres → Réseau → Wi-Fi → (votre réseau) → Adresse IP",
                "# → ex : 192.168.1.55",
                "",
                "# ⚠ Ne pas utiliser `hostname -I` dans le terminal Linux :",
                "# il retourne l'IP du conteneur (100.115.92.x), pas l'IP WiFi.",
              ]} />

              <Label className="mt-3">③ Ponter le port conteneur → WiFi avec socat</Label>
              <p className="mb-1 text-xs text-muted-foreground">Chrome OS ne transfère pas automatiquement les ports Linux vers le WiFi. <Mono>socat</Mono> crée ce pont :</p>
              <Code lines={[
                "# Dans le terminal Linux, installer socat",
                "sudo apt install socat -y",
                "",
                "# Dans un 2ème terminal (le gateway doit déjà tourner)",
                "# Écoute sur 8889 sur toutes les interfaces et redirige vers le gateway",
                "sudo socat TCP-LISTEN:8889,fork,reuseaddr \\",
                "  TCP:$(hostname -I | awk '{print $1}'):8888",
              ]} />

              <Note>
                Depuis l'autre appareil sur le même WiFi, entrez <Mono>http://192.168.1.55:8889</Mono> (IP WiFi Chromebook, port <strong>8889</strong>) et le token <Mono>monjeton</Mono>.
              </Note>

              <Label className="mt-3">Alternative plus simple : ngrok depuis le terminal Linux</Label>
              <Code lines={[
                "# Installer ngrok dans le terminal Linux du Chromebook",
                "curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc \\",
                "  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null",
                'echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \\',
                "  | sudo tee /etc/apt/sources.list.d/ngrok.list",
                "sudo apt update && sudo apt install ngrok -y",
                "",
                "# Ouvrir le tunnel (le gateway doit tourner sur 8888)",
                "ngrok http 8888",
                "# → https://xxxx.ngrok-free.app  ← utilisez cette URL",
              ]} />
            </Step>
          )}

          {mode === "remote" && (
            <Step n={2} title="Tunnel ngrok (internet / Colab / VM)">
              <p className="mb-2 text-xs text-muted-foreground">ngrok crée un tunnel HTTPS public vers votre gateway local.</p>
              <Code lines={[
                "# 1. Lancer le gateway",
                "jupyter kernelgateway \\",
                "  --KernelGatewayApp.ip=0.0.0.0 \\",
                "  --KernelGatewayApp.port=8888 \\",
                "  --KernelGatewayApp.allow_origin='*' \\",
                "  --KernelGatewayApp.allow_headers='Content-Type,Authorization,X-XSRFToken' \\",
                "  --KernelGatewayApp.auth_token='monjeton'",
                "",
                "# 2. Dans un autre terminal",
                "ngrok http 8888",
                "# → Forwarding: https://xxxx.ngrok-free.app → localhost:8888",
              ]} />
              <Note>Copiez l'URL HTTPS ngrok (<Mono>https://xxxx.ngrok-free.app</Mono>) dans le champ URL et le token <Mono>monjeton</Mono>.</Note>
            </Step>
          )}

          {/* STEP 3 — file paths */}
          <Step n={3} title="Accès aux fichiers">
            <p className="mb-2 text-xs text-muted-foreground">
              Le kernel s'exécute <em>sur la machine hôte</em> — les chemins sont ceux de cette machine.
            </p>
            <Code lines={[
              "# Chemin absolu (recommandé)",
              'FILE_PATH = "/home/moi/data/dataset.csv"       # Linux / macOS',
              'FILE_PATH = "C:/Users/moi/data/dataset.csv"    # Windows',
              "",
              "# Relatif au dossier de lancement du gateway",
              'FILE_PATH = "data/dataset.csv"',
            ]} />
            {mode === "chromebook" && (
              <Note type="warn">
                Sur Chromebook, les fichiers sont dans le conteneur Linux. Accédez-y via <Mono>Fichiers → Linux</Mono> depuis Chrome OS, ou via le chemin <Mono>/home/votre_user/</Mono> dans le terminal.
              </Note>
            )}
          </Step>

          {/* STEP 4 — connect */}
          <Step n={4} title="Connecter">
            <p className="text-xs text-muted-foreground">
              Remplissez les champs URL et token, cliquez <Mono>Test</Mono> pour vérifier l'accessibilité, puis <Mono>Connecter</Mono>. Un bouton <Mono>Run</Mono> apparaît sur chaque cellule du notebook.
            </p>
          </Step>

          {/* Security */}
          <div
            className="flex gap-3 rounded-xl p-3 text-xs"
            style={{ background: "oklch(0.15 0.04 50 / 0.3)", border: "1px solid oklch(0.30 0.08 50 / 0.5)" }}
          >
            <ShieldAlert size={14} className="shrink-0 mt-0.5 text-[color:var(--color-warning)]" />
            <p className="text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/80">Sécurité :</span>{" "}
              <Mono>allow_origin='*'</Mono> sans token expose votre kernel Python au réseau. Définissez toujours un <strong>token fort</strong> et restreignez l'origine à <Mono>{origin}</Mono> dès que possible.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] text-white font-bold"
          style={{ background: "linear-gradient(135deg, #3b3ff5, #000091)" }}
        >
          {n}
        </span>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-1 text-xs font-semibold text-foreground/80 ${className}`}>{children}</p>;
}

function Code({ lines }: { lines: string[] }) {
  return (
    <pre
      className="overflow-auto rounded-xl p-3 font-mono text-[11px] leading-relaxed text-foreground/90"
      style={{ background: "oklch(0.09 0.008 260)", border: "1px solid oklch(0.20 0.012 260)" }}
    >
      {lines.join("\n")}
    </pre>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="rounded px-1 py-0.5 font-mono text-[10px]"
      style={{ background: "oklch(0.18 0.016 260)", color: "#818cf8" }}
    >
      {children}
    </code>
  );
}

function Note({ children, type = "info", className = "" }: {
  children: React.ReactNode;
  type?: "info" | "warn";
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-xs text-muted-foreground leading-relaxed ${className}`}
      style={
        type === "warn"
          ? { background: "oklch(0.15 0.04 50 / 0.25)", border: "1px solid oklch(0.28 0.08 50 / 0.4)" }
          : { background: "oklch(0.14 0.018 260)", border: "1px solid oklch(0.22 0.014 260)" }
      }
    >
      {children}
    </div>
  );
}

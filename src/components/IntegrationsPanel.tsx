import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  saveIntegrations,
  type IntegrationsConfig,
} from "@/lib/integrations";
import {
  Plug2,
  HardDrive,
  Trophy,
  Boxes,
  LineChart,
  Database,
  Cloud,
  Sparkles,
  Check,
} from "lucide-react";

interface Props {
  cfg: IntegrationsConfig;
  setCfg: (c: IntegrationsConfig) => void;
}

export function IntegrationsPanel({ cfg, setCfg }: Props) {
  const [local, setLocal] = useState<IntegrationsConfig>(cfg);
  const [open, setOpen] = useState(false);

  const enabledCount = Object.values(cfg).filter((v) => v.enabled).length;

  const save = () => {
    saveIntegrations(local);
    setCfg(local);
    setOpen(false);
  };

  const update = <K extends keyof IntegrationsConfig>(
    k: K,
    patch: Partial<IntegrationsConfig[K]>,
  ) => setLocal({ ...local, [k]: { ...local[k], ...patch } });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLocal(cfg); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full gap-1.5">
          <Plug2 className="h-3.5 w-3.5" />
          Intégrations
          {enabledCount > 0 && (
            <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[9px] text-background">
              {enabledCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug2 className="h-4 w-4" /> Intégrations externes
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Connectez datasets, expériences et stockage. Les credentials sont injectés
            comme variables d'environnement dans le kernel Python à chaque exécution.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {/* Google Drive */}
          <Section
            icon={<HardDrive className="h-3.5 w-3.5" />}
            title="Google Drive"
            desc="Télécharger des datasets depuis Drive (lien public ou compte de service)."
            enabled={local.gdrive.enabled}
            onToggle={(v) => update("gdrive", { enabled: v })}
          >
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={local.gdrive.mode}
                onChange={(v) => update("gdrive", { mode: v as "gdown" | "service_account" })}
                options={[
                  { v: "gdown", l: "Lien public (gdown)" },
                  { v: "service_account", l: "Compte de service" },
                ]}
              />
              <Input
                placeholder="Folder ID (optionnel)"
                value={local.gdrive.defaultFolderId ?? ""}
                onChange={(e) => update("gdrive", { defaultFolderId: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            {local.gdrive.mode === "service_account" && (
              <textarea
                placeholder='{"type": "service_account", ...}'
                value={local.gdrive.serviceAccountJson ?? ""}
                onChange={(e) => update("gdrive", { serviceAccountJson: e.target.value })}
                className="min-h-24 w-full rounded-lg border border-input bg-card/40 p-2 font-mono text-[11px]"
              />
            )}
            <Hint>
              Helper Python : <code>gdrive_download(file_id, dest)</code>
            </Hint>
          </Section>

          {/* Kaggle */}
          <Section
            icon={<Trophy className="h-3.5 w-3.5" />}
            title="Kaggle Datasets"
            desc="Télécharger n'importe quel dataset Kaggle."
            enabled={local.kaggle.enabled}
            onToggle={(v) => update("kaggle", { enabled: v })}
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Username"
                value={local.kaggle.username ?? ""}
                onChange={(e) => update("kaggle", { username: e.target.value })}
                className="h-9 text-xs"
              />
              <Input
                placeholder="API Key"
                type="password"
                value={local.kaggle.key ?? ""}
                onChange={(e) => update("kaggle", { key: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <Hint>
              Helper : <code>kaggle_download("owner/dataset", "./data")</code>
            </Hint>
          </Section>

          {/* Hugging Face */}
          <Section
            icon={<Boxes className="h-3.5 w-3.5" />}
            title="Hugging Face Hub"
            desc="Datasets & modèles HF (datasets, transformers, diffusers)."
            enabled={local.hf.enabled}
            onToggle={(v) => update("hf", { enabled: v })}
          >
            <Input
              placeholder="hf_xxxxxxxxxxxxxxx"
              type="password"
              value={local.hf.token ?? ""}
              onChange={(e) => update("hf", { token: e.target.value })}
              className="h-9 text-xs"
            />
            <Hint>
              Expose <code>HF_TOKEN</code> · <code>load_dataset</code>, <code>from_pretrained</code>{" "}
              fonctionnent direct.
            </Hint>
          </Section>

          {/* W&B */}
          <Section
            icon={<LineChart className="h-3.5 w-3.5" />}
            title="Weights & Biases"
            desc="Suivi d'expériences, métriques, artefacts modèles."
            enabled={local.wandb.enabled}
            onToggle={(v) => update("wandb", { enabled: v })}
          >
            <Input
              placeholder="API Key"
              type="password"
              value={local.wandb.apiKey ?? ""}
              onChange={(e) => update("wandb", { apiKey: e.target.value })}
              className="h-9 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Entity (team)"
                value={local.wandb.entity ?? ""}
                onChange={(e) => update("wandb", { entity: e.target.value })}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Project"
                value={local.wandb.project ?? ""}
                onChange={(e) => update("wandb", { project: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <Hint>
              Helper : <code>run = wandb_init(name="exp-01")</code> puis{" "}
              <code>run.log({"{...}"})</code>
            </Hint>
          </Section>

          {/* MLflow */}
          <Section
            icon={<LineChart className="h-3.5 w-3.5" />}
            title="MLflow"
            desc="Tracking alternatif self-hosted ou Databricks."
            enabled={local.mlflow.enabled}
            onToggle={(v) => update("mlflow", { enabled: v })}
          >
            <Input
              placeholder="Tracking URI (https://...)"
              value={local.mlflow.trackingUri ?? ""}
              onChange={(e) => update("mlflow", { trackingUri: e.target.value })}
              className="h-9 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Experiment name"
                value={local.mlflow.experiment ?? ""}
                onChange={(e) => update("mlflow", { experiment: e.target.value })}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Token (optionnel)"
                type="password"
                value={local.mlflow.token ?? ""}
                onChange={(e) => update("mlflow", { token: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </Section>

          {/* S3 */}
          <Section
            icon={<Database className="h-3.5 w-3.5" />}
            title="AWS S3 / compatible"
            desc="Bucket S3, R2, MinIO, Backblaze pour datasets & artefacts."
            enabled={local.s3.enabled}
            onToggle={(v) => update("s3", { enabled: v })}
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Access Key ID"
                value={local.s3.accessKeyId ?? ""}
                onChange={(e) => update("s3", { accessKeyId: e.target.value })}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Secret Access Key"
                type="password"
                value={local.s3.secretAccessKey ?? ""}
                onChange={(e) => update("s3", { secretAccessKey: e.target.value })}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Region (us-east-1)"
                value={local.s3.region ?? ""}
                onChange={(e) => update("s3", { region: e.target.value })}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Bucket"
                value={local.s3.bucket ?? ""}
                onChange={(e) => update("s3", { bucket: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <Input
              placeholder="Endpoint URL (R2/MinIO, optionnel)"
              value={local.s3.endpointUrl ?? ""}
              onChange={(e) => update("s3", { endpointUrl: e.target.value })}
              className="h-9 text-xs"
            />
            <Hint>
              Helper : <code>s3_download("key/file.csv", "./data.csv")</code>
            </Hint>
          </Section>

          {/* OpenAI */}
          <Section
            icon={<Sparkles className="h-3.5 w-3.5" />}
            title="OpenAI / compatible"
            desc="LLM pour features text, augmentation, eval."
            enabled={local.openai.enabled}
            onToggle={(v) => update("openai", { enabled: v })}
          >
            <Input
              placeholder="sk-..."
              type="password"
              value={local.openai.apiKey ?? ""}
              onChange={(e) => update("openai", { apiKey: e.target.value })}
              className="h-9 text-xs"
            />
            <Input
              placeholder="Base URL (Ollama, vLLM, OpenRouter...)"
              value={local.openai.baseUrl ?? ""}
              onChange={(e) => update("openai", { baseUrl: e.target.value })}
              className="h-9 text-xs"
            />
          </Section>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-card/40 p-2.5 text-[11px] text-muted-foreground">
            <Cloud className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Les credentials sont stockés <strong>en local</strong> (localStorage) et envoyés
              uniquement au kernel Jupyter que vous avez connecté. Aucun appel serveur.
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="rounded-full">Annuler</Button>
          </DialogClose>
          <Button size="sm" className="rounded-full" onClick={save}>
            <Check className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  title,
  desc,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        enabled ? "border-foreground/30 bg-card/60" : "border-border bg-card/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-muted text-foreground/80">
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-semibold">{title}</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && children && <div className="mt-2.5 space-y-2">{children}</div>}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-input bg-card/40 px-2.5 text-xs"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] text-muted-foreground">→ {children}</p>
  );
}

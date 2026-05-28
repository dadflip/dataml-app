// Integrations: persisted in localStorage, injected as a Python prelude
// prepended to each cell execution so credentials and helpers are available.

export interface IntegrationsConfig {
  gdrive: {
    enabled: boolean;
    mode: "gdown" | "service_account";
    serviceAccountJson?: string; // raw JSON content
    defaultFolderId?: string;
  };
  kaggle: {
    enabled: boolean;
    username?: string;
    key?: string;
  };
  hf: {
    enabled: boolean;
    token?: string;
  };
  wandb: {
    enabled: boolean;
    apiKey?: string;
    entity?: string;
    project?: string;
  };
  mlflow: {
    enabled: boolean;
    trackingUri?: string;
    experiment?: string;
    token?: string;
  };
  s3: {
    enabled: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucket?: string;
    endpointUrl?: string;
  };
  openai: {
    enabled: boolean;
    apiKey?: string;
    baseUrl?: string;
  };
}

export const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
  gdrive: { enabled: false, mode: "gdown" },
  kaggle: { enabled: false },
  hf: { enabled: false },
  wandb: { enabled: false },
  mlflow: { enabled: false },
  s3: { enabled: false },
  openai: { enabled: false },
};

const STORAGE_KEY = "pipeline-studio:integrations";

export function loadIntegrations(): IntegrationsConfig {
  if (typeof window === "undefined") return DEFAULT_INTEGRATIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_INTEGRATIONS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_INTEGRATIONS;
}

export function saveIntegrations(cfg: IntegrationsConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

function pyStr(v: string | undefined): string {
  if (!v) return '""';
  // escape backslashes and triple-quotes; use triple quoted raw-ish string
  const safe = v.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
  return `"""${safe}"""`;
}

// Generates a Python prelude exposing env vars + helper functions like
// `gdrive_download(file_id, dest)`, `kaggle_download(dataset, path)`, etc.
// The prelude is idempotent — it sets a sentinel so re-runs are cheap.
export function buildPrelude(cfg: IntegrationsConfig): string {
  const lines: string[] = [];
  lines.push("# === DataML integrations prelude (auto-generated) ===");
  lines.push("import os, sys, json");
  lines.push("");

  const enabled = Object.entries(cfg)
    .filter(([, v]) => (v as { enabled?: boolean }).enabled)
    .map(([k]) => k);
  if (enabled.length === 0) return ""; // no prelude if nothing enabled

  // ---- Google Drive ----
  if (cfg.gdrive.enabled) {
    if (cfg.gdrive.mode === "service_account" && cfg.gdrive.serviceAccountJson) {
      lines.push("# Google Drive — service account");
      lines.push(`_SA_JSON = ${pyStr(cfg.gdrive.serviceAccountJson)}`);
      lines.push("os.makedirs('/tmp/dataml', exist_ok=True)");
      lines.push("with open('/tmp/dataml/gdrive_sa.json','w') as _f: _f.write(_SA_JSON)");
      lines.push("os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/tmp/dataml/gdrive_sa.json'");
      lines.push("def gdrive_download(file_id, dest):");
      lines.push("    from googleapiclient.discovery import build");
      lines.push("    from google.oauth2 import service_account");
      lines.push("    import io");
      lines.push("    from googleapiclient.http import MediaIoBaseDownload");
      lines.push("    creds = service_account.Credentials.from_service_account_file('/tmp/dataml/gdrive_sa.json', scopes=['https://www.googleapis.com/auth/drive.readonly'])");
      lines.push("    svc = build('drive', 'v3', credentials=creds)");
      lines.push("    req = svc.files().get_media(fileId=file_id)");
      lines.push("    with io.FileIO(dest, 'wb') as fh:");
      lines.push("        dl = MediaIoBaseDownload(fh, req)");
      lines.push("        done = False");
      lines.push("        while not done: _, done = dl.next_chunk()");
      lines.push("    return dest");
    } else {
      lines.push("# Google Drive — gdown (lien public)");
      lines.push("def gdrive_download(file_id, dest):");
      lines.push("    import subprocess");
      lines.push("    subprocess.check_call([sys.executable,'-m','pip','install','-q','gdown'])");
      lines.push("    import gdown");
      lines.push("    return gdown.download(id=file_id, output=dest, quiet=False)");
    }
    if (cfg.gdrive.defaultFolderId) {
      lines.push(`GDRIVE_FOLDER_ID = ${pyStr(cfg.gdrive.defaultFolderId)}`);
    }
    lines.push("");
  }

  // ---- Kaggle ----
  if (cfg.kaggle.enabled && cfg.kaggle.username && cfg.kaggle.key) {
    lines.push("# Kaggle");
    lines.push(`os.environ['KAGGLE_USERNAME'] = ${pyStr(cfg.kaggle.username)}`);
    lines.push(`os.environ['KAGGLE_KEY'] = ${pyStr(cfg.kaggle.key)}`);
    lines.push("def kaggle_download(dataset, path='./data'):");
    lines.push("    import subprocess");
    lines.push("    subprocess.check_call([sys.executable,'-m','pip','install','-q','kaggle'])");
    lines.push("    os.makedirs(path, exist_ok=True)");
    lines.push("    subprocess.check_call(['kaggle','datasets','download','-d',dataset,'-p',path,'--unzip'])");
    lines.push("    return path");
    lines.push("");
  }

  // ---- Hugging Face ----
  if (cfg.hf.enabled && cfg.hf.token) {
    lines.push("# Hugging Face Hub");
    lines.push(`os.environ['HF_TOKEN'] = ${pyStr(cfg.hf.token)}`);
    lines.push(`os.environ['HUGGING_FACE_HUB_TOKEN'] = ${pyStr(cfg.hf.token)}`);
    lines.push("");
  }

  // ---- Weights & Biases ----
  if (cfg.wandb.enabled && cfg.wandb.apiKey) {
    lines.push("# Weights & Biases");
    lines.push(`os.environ['WANDB_API_KEY'] = ${pyStr(cfg.wandb.apiKey)}`);
    if (cfg.wandb.entity) lines.push(`os.environ['WANDB_ENTITY'] = ${pyStr(cfg.wandb.entity)}`);
    if (cfg.wandb.project) lines.push(`os.environ['WANDB_PROJECT'] = ${pyStr(cfg.wandb.project)}`);
    lines.push("def wandb_init(**kwargs):");
    lines.push("    import wandb");
    lines.push("    kwargs.setdefault('project', os.environ.get('WANDB_PROJECT'))");
    lines.push("    kwargs.setdefault('entity', os.environ.get('WANDB_ENTITY'))");
    lines.push("    return wandb.init(**{k:v for k,v in kwargs.items() if v})");
    lines.push("");
  }

  // ---- MLflow ----
  if (cfg.mlflow.enabled && cfg.mlflow.trackingUri) {
    lines.push("# MLflow");
    lines.push(`os.environ['MLFLOW_TRACKING_URI'] = ${pyStr(cfg.mlflow.trackingUri)}`);
    if (cfg.mlflow.token) lines.push(`os.environ['MLFLOW_TRACKING_TOKEN'] = ${pyStr(cfg.mlflow.token)}`);
    if (cfg.mlflow.experiment) lines.push(`os.environ['MLFLOW_EXPERIMENT_NAME'] = ${pyStr(cfg.mlflow.experiment)}`);
    lines.push("");
  }

  // ---- AWS S3 ----
  if (cfg.s3.enabled && cfg.s3.accessKeyId) {
    lines.push("# AWS S3");
    lines.push(`os.environ['AWS_ACCESS_KEY_ID'] = ${pyStr(cfg.s3.accessKeyId)}`);
    lines.push(`os.environ['AWS_SECRET_ACCESS_KEY'] = ${pyStr(cfg.s3.secretAccessKey)}`);
    if (cfg.s3.region) lines.push(`os.environ['AWS_DEFAULT_REGION'] = ${pyStr(cfg.s3.region)}`);
    if (cfg.s3.endpointUrl) lines.push(`os.environ['AWS_ENDPOINT_URL'] = ${pyStr(cfg.s3.endpointUrl)}`);
    if (cfg.s3.bucket) lines.push(`S3_BUCKET = ${pyStr(cfg.s3.bucket)}`);
    lines.push("def s3_download(key, dest, bucket=None):");
    lines.push("    import boto3");
    lines.push("    b = bucket or globals().get('S3_BUCKET')");
    lines.push("    boto3.client('s3', endpoint_url=os.environ.get('AWS_ENDPOINT_URL') or None).download_file(b, key, dest)");
    lines.push("    return dest");
    lines.push("");
  }

  // ---- OpenAI / compatible ----
  if (cfg.openai.enabled && cfg.openai.apiKey) {
    lines.push("# OpenAI-compatible");
    lines.push(`os.environ['OPENAI_API_KEY'] = ${pyStr(cfg.openai.apiKey)}`);
    if (cfg.openai.baseUrl) lines.push(`os.environ['OPENAI_BASE_URL'] = ${pyStr(cfg.openai.baseUrl)}`);
    lines.push("");
  }

  lines.push("print('[DataML] prelude loaded:', " + JSON.stringify(enabled) + ")");
  lines.push("# === end prelude ===");
  lines.push("");
  return lines.join("\n");
}

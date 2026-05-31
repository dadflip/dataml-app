import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Server, 
  Trash2, 
  RefreshCw,
  Power,
  Activity,
  Play
} from "lucide-react";
import { listKernels, shutdownKernel, type KernelConfig, type KernelInfo } from "@/lib/kernel";

interface Props {
  cfg: KernelConfig;
  currentKernelId: string | null;
  onSelectKernel: (id: string) => void;
  disabled?: boolean;
}

export function KernelManager({ cfg, currentKernelId, onSelectKernel, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [kernels, setKernels] = useState<KernelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchKernels = async () => {
    setLoading(true);
    try {
      const list = await listKernels(cfg);
      setKernels(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchKernels();
    }
  }, [open, cfg]);

  const handleShutdown = async (id: string) => {
    await shutdownKernel(cfg, id);
    if (currentKernelId === id) {
      onSelectKernel(""); // Trigger disconnect if shutting down current
    }
    fetchKernels();
  };

  const handleShutdownAll = async () => {
    for (const k of kernels) {
      if (k.id !== currentKernelId) {
        await shutdownKernel(cfg, k.id);
      }
    }
    fetchKernels();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || !cfg.baseUrl} title="Gérer les kernels en cours d'exécution">
          <Server className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Gestionnaire</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-xl p-4 sm:p-6 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4" /> Gestionnaire de Kernels
            </div>
            <Button size="sm" variant="ghost" onClick={fetchKernels} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Gérez les connexions aux kernels Jupyter distants.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-2">
          {kernels.length === 0 && !loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Aucun kernel distant trouvé.
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>{kernels.length} kernel(s) actif(s) sur le serveur</span>
                {kernels.length > 1 && (
                  <Button size="sm" variant="destructive" onClick={handleShutdownAll} className="h-6 text-[10px] px-2 rounded-full">
                    Nettoyer les inactifs
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto pr-2 flex-1 min-h-0">
                {kernels.map(k => {
                  const isCurrent = k.id === currentKernelId;
                  return (
                    <div key={k.id} className={`flex items-center justify-between p-3 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[120px] sm:max-w-[200px]" title={k.id}>
                            {k.id.split("-")[0]}...
                          </span>
                          {isCurrent && (
                            <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                              Actif
                            </span>
                          )}
                          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${k.execution_state === 'busy' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
                            <Activity className="h-3 w-3" />
                            {k.execution_state}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex gap-3">
                          <span>Connexions: {k.connections}</span>
                          <span>Activité: {new Date(k.last_activity).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isCurrent && (
                          <Button size="icon" variant="secondary" onClick={() => { onSelectKernel(k.id); setOpen(false); }} title="Se connecter à ce kernel">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" onClick={() => handleShutdown(k.id)} title="Arrêter ce kernel">
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

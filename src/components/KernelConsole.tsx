import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Terminal, AlertTriangle, Send, Loader2, Search, Download, PackageSearch } from "lucide-react";
import { executeCode, type ExecResult, type KernelConfig } from "@/lib/kernel";
import { PACKAGES_CATALOG, type PackageCategory } from "@/lib/packages-catalog";

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded px-1 py-0.5 font-mono text-[10px]" style={{ background: "oklch(0.18 0.016 260)", color: "#818cf8" }}>
      {children}
    </code>
  );
}

export function KernelConsole({ cfg, kernelId }: { cfg: KernelConfig; kernelId: string | null }) {
  const [activeTab, setActiveTab] = useState("console");
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecResult | null>(null);
  
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PackageCategory | "All">("All");

  const runCmdStr = async (codeStr: string) => {
    if (!kernelId || !codeStr.trim() || running) return;

    let code = codeStr.trim();
    if (!code.startsWith("!") && !code.startsWith("%") && !code.includes("\n")) {
      code = `!${code}`;
    }

    setHistory(prev => [...prev, codeStr.trim()]);
    setHistoryIdx(-1);

    setRunning(true);
    setResult({ status: "running", stdout: "", stderr: "", displays: [] });

    const { promise } = executeCode(cfg, kernelId, code, (r) => setResult(r));
    try {
      await promise;
    } catch (e) {
      setResult((prev) => ({
        ...(prev || { status: "error", stdout: "", stderr: "", displays: [] }),
        status: "error",
        stderr: (prev?.stderr || "") + "\n" + (e as Error).message
      }));
    } finally {
      setRunning(false);
    }
  };

  const runCmd = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCmdStr(cmd);
    setCmd("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setCmd(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx >= 0) {
        const nextIdx = historyIdx + 1;
        if (nextIdx >= history.length - 1) {
          setHistoryIdx(-1);
          setCmd("");
        } else {
          setHistoryIdx(nextIdx);
          setCmd(history[nextIdx]);
        }
      }
    }
  };

  const installPackage = (pkgCmd: string) => {
    setCmd("");
    setActiveTab("console");
    runCmdStr(pkgCmd);
  };

  const filteredPackages = PACKAGES_CATALOG.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const categories = ["All", ...Array.from(new Set(PACKAGES_CATALOG.map(p => p.category)))];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!kernelId} title="Console (pip install...)">
          <Terminal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Console</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[750px] flex flex-col max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4" /> Console et Paquets Distants
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden mt-2">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="console"><Terminal className="mr-2 h-4 w-4"/> Terminal</TabsTrigger>
            <TabsTrigger value="packages"><PackageSearch className="mr-2 h-4 w-4"/> Gestionnaire de Paquets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="console" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden gap-3">
            <div className="flex gap-3 rounded-xl p-3 text-xs bg-[color:var(--color-warning)]/10 border border-[color:var(--color-warning)]/30 text-[color:var(--color-warning)] shrink-0">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Avertissement de sécurité :</strong> Les commandes sont exécutées directement sur la machine hôte du Kernel distant. Ne lancez que des commandes de confiance (ex: <Mono>pip install pandas</Mono>).
              </p>
            </div>

            <div className="flex-1 rounded-lg bg-black/90 border border-border p-3 overflow-y-auto font-mono text-[11px] text-zinc-300 flex flex-col">
              {result ? (
                <>
                  <div className="text-zinc-500 mb-2">$ {result.status === "running" ? "Exécution en cours..." : "Terminé"}</div>
                  {result.stdout && <pre className="whitespace-pre-wrap text-green-400 font-mono flex-1">{result.stdout}</pre>}
                  {result.stderr && <pre className="whitespace-pre-wrap text-red-400 font-mono flex-1 mt-2">{result.stderr}</pre>}
                  {(!result.stdout && !result.stderr && result.status !== "running") && <div className="text-zinc-500 italic mt-auto">Aucune sortie</div>}
                </>
              ) : (
                <div className="text-zinc-500 italic">Prêt. Tapez une commande (ex: pip install xgboost). Vous pouvez utiliser les flèches du clavier pour naviguer dans l'historique.</div>
              )}
            </div>
            
            <form onSubmit={runCmd} className="flex gap-2 shrink-0">
              <Input 
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="pip install scikit-learn..."
                className="font-mono text-xs flex-1"
                disabled={running || !kernelId}
                autoFocus
              />
              <Button type="submit" size="sm" disabled={running || !cmd.trim() || !kernelId}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="packages" className="flex flex-col flex-1 min-h-0 mt-4 overflow-hidden">
            <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un paquet (ex: pandas, torch...)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <select 
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                value={activeCategory} 
                onChange={e => setActiveCategory(e.target.value as any)}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 content-start pb-4">
              {filteredPackages.map(pkg => (
                <div key={pkg.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <a href={pkg.url} target="_blank" rel="noreferrer" className="font-semibold text-sm hover:underline flex items-center gap-1.5 text-primary">
                        {pkg.name}
                      </a>
                      <span className="text-[10px] text-muted-foreground mt-0.5 inline-block font-medium bg-muted px-1.5 py-0.5 rounded-sm">{pkg.category}</span>
                    </div>
                    <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px] shrink-0 hover:bg-primary hover:text-primary-foreground" onClick={() => installPackage(pkg.command)} disabled={running}>
                      <Download className="mr-1.5 h-3 w-3" /> Installer
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex-1 leading-relaxed mt-1">{pkg.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pkg.architectures.map(arc => (
                      <span key={arc} className="rounded-full bg-secondary/60 border border-secondary px-2 py-0.5 text-[9px] font-medium text-secondary-foreground">
                        {arc}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {filteredPackages.length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-center p-8 text-muted-foreground text-sm">
                  Aucun paquet trouvé correspondant à vos critères.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

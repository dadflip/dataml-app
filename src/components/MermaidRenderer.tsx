import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader
} from "@/components/ui/dialog";

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  suppressErrorRendering: true,
  themeVariables: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#e2e8f0',     // lighter base for nodes without explicit styles
    primaryTextColor: '#0f172a', // dark text by default
    primaryBorderColor: '#cbd5e1',
    lineColor: '#64748b',
    secondaryColor: '#f8fafc',
    tertiaryColor: '#f1f5f9'
  }
});

interface MermaidRendererProps {
  chart: string;
}

/**
 * Sanitise a raw mermaid string so the parser doesn't choke on
 * characters that are valid inside quoted node labels but break
 * outside of them (most common offender: bare `&`).
 */
function sanitiseMermaid(raw: string): string {
  let chart = raw;

  // 1. Strip common leading indentation (YAML literal blocks)
  const lines = chart.split('\n').filter(l => l.trim() !== '');
  const match = lines[0]?.match(/^(\s+)/);
  if (match) {
    const indent = match[1].length;
    const regex = new RegExp(`^ {1,${indent}}`, 'gm');
    chart = chart.replace(regex, '').trim();
  } else {
    chart = chart.trim();
  }

  // 2. Escape bare `&` that are NOT already escaped (`&amp;`, `&lt;`, etc.)
  //    We only touch lines that are NOT `style …` directives (those use CSS hex).
  chart = chart
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('style ')) return line;
      // Replace & that is NOT already part of an HTML entity
      return line.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;|#x[\da-fA-F]+;)/g, '&amp;');
    })
    .join('\n');

  return chart;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!chart) return;
    
    let isMounted = true;
    
    const renderChart = async () => {
      try {
        setError(false);
        const cleanChart = sanitiseMermaid(chart);

        // Generate a unique ID for the mermaid chart to prevent conflicts
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanChart);
        
        if (isMounted) setSvgContent(svg);
      } catch (err) {
        console.warn("Mermaid rendering failed:", err);
        if (isMounted) setError(true);
      } finally {
        // Mermaid may inject error containers into the DOM even with
        // suppressErrorRendering.  Remove them so the user never sees
        // the "bomb" panel at the bottom of the page.
        requestAnimationFrame(() => {
          document.querySelectorAll('[id^="d"]').forEach(el => {
            if (el.getAttribute('data-mermaid-error') != null) el.remove();
          });
          // Also remove any leftover error containers Mermaid appends to body
          document.querySelectorAll('div#d[style*="position"]').forEach(el => el.remove());
        });
      }
    };
    
    renderChart();
    
    return () => { isMounted = false; };
  }, [chart]);

  // Clean up any Mermaid error nodes that may have leaked into the body
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Mermaid error containers have a specific pattern
            if (
              node.id?.startsWith('d') &&
              node.querySelector?.('.error-icon')
            ) {
              node.remove();
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);

  if (error) {
    return null; // Silently hide broken diagrams instead of showing error text
  }

  if (!svgContent) {
    return <div className="animate-pulse bg-muted h-24 w-full rounded-xl" />;
  }

  return (
    <div className="relative group flex justify-center w-full rounded-xl border border-border bg-card/50 p-4 transition-opacity hover:opacity-100">
      <div 
        className="w-full overflow-x-auto flex justify-center [&>svg]:max-h-24 [&>svg]:w-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
      
      <Dialog onOpenChange={(isOpen) => !isOpen && setScale(1)}>
        <DialogTrigger asChild>
          <button className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground">
            <Maximize2 className="h-4 w-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Aperçu du schéma</DialogTitle>
            <div className="flex items-center gap-1 pr-6">
              <button onClick={() => setScale(s => s * 1.2)} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="Zoomer">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setScale(s => Math.max(0.1, s / 1.2))} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="Dézoomer">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => setScale(1)} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="Réinitialiser">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-card/50 rounded-xl border border-border p-4">
            <div 
              style={{ width: `${scale * 100}%` }}
              className={`transition-all duration-200 [&>svg]:w-full [&>svg]:h-auto ${scale <= 1 ? 'mx-auto' : ''}`}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

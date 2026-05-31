import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#0f172a',
    primaryTextColor: '#fff',
    primaryBorderColor: '#cbd5e1',
    lineColor: '#64748b',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#e2e8f0'
  }
});

interface MermaidRendererProps {
  chart: string;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      // Clear previous rendering
      containerRef.current.innerHTML = '';
      
      const renderChart = async () => {
        try {
          // Generate a unique ID for the mermaid chart to prevent conflicts
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error("Mermaid rendering failed:", err);
        }
      };
      
      renderChart();
    }
  }, [chart]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center w-full overflow-x-auto rounded-xl border border-border bg-card/50 p-4 transition-opacity hover:opacity-100"
    />
  );
}

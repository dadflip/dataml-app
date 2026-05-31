import { useState, useEffect } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";

// Import a selection of great themes
import {
  vs2015,
  github,
  dracula,
  atomOneDark,
  atomOneLight,
  nightOwl
} from "react-syntax-highlighter/dist/esm/styles/hljs";

import { Check, Copy, Palette } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("bash", bash);

const THEMES = {
  "VS Code Dark": vs2015,
  "Github Light": github,
  "Dracula": dracula,
  "Atom One Dark": atomOneDark,
  "Atom One Light": atomOneLight,
  "Night Owl": nightOwl,
};

type ThemeName = keyof typeof THEMES;
const STORAGE_KEY = "pipeline-studio:syntax-theme";

export function CodeBlock({ 
  code, 
  language = "python", 
  className = "" 
}: { 
  code: string; 
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [themeName, setThemeName] = useState<ThemeName>("Atom One Dark");

  // Load theme globally
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeName;
    if (saved && THEMES[saved]) {
      setThemeName(saved);
    }

    const handleStorage = () => {
      const updated = window.localStorage.getItem(STORAGE_KEY) as ThemeName;
      if (updated && THEMES[updated]) {
        setThemeName(updated);
      }
    };

    window.addEventListener("storage", handleStorage);
    // Custom event for same-window updates
    window.addEventListener("theme-changed", handleStorage);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("theme-changed", handleStorage);
    };
  }, []);

  const changeTheme = (name: ThemeName) => {
    setThemeName(name);
    window.localStorage.setItem(STORAGE_KEY, name);
    window.dispatchEvent(new Event("theme-changed"));
  };

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group rounded-xl border border-border flex flex-col ${className.replace('overflow-auto', '').replace('overflow-x-auto', '')}`}>
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-md bg-background/50 backdrop-blur">
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.keys(THEMES).map((t) => (
              <DropdownMenuItem key={t} onClick={() => changeTheme(t as ThemeName)}>
                <span className={`w-2 h-2 rounded-full mr-2 ${themeName === t ? "bg-primary" : "bg-transparent"}`} />
                {t}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="icon" variant="secondary" className="h-7 w-7 rounded-md bg-background/50 backdrop-blur" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="overflow-auto flex-1 w-full" style={{ maxHeight: "inherit" }}>
        <SyntaxHighlighter
          language={language}
          style={THEMES[themeName]}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.75rem",
            lineHeight: "1.5",
            background: themeName.includes("Light") ? "#f8fafc" : "oklch(0.1 0.004 260)",
          }}
          wrapLines={true}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

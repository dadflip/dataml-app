import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ensures that any LaTeX \textcolor commands are wrapped in math delimiters ($)
 * so that MathJax or KaTeX can correctly render them, even if they were written
 * outside of a math block in the raw text.
 */
export function autoWrapMathColors(text: string): string {
  if (!text) return text;
  
  // Split the text into text parts and math parts
  // The capturing group keeps the math blocks in the resulting array
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let parts = text.split(mathRegex);
  
  for (let i = 0; i < parts.length; i += 2) {
    // parts[i] is outside math blocks
    parts[i] = parts[i].replace(/\\textcolor\s*\{([^}]+)\}\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$\\textcolor{$1}{$2}$');
  }
  
  return parts.join('');
}

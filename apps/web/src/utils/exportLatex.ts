// Export a Math X session as a LaTeX document (.tex)
import type { Session } from '../state/types';

function latexEscape(text: string): string {
  return text
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    // Preserve LaTeX math delimiters — already valid LaTeX
    .replace(/\\\\&/g, '\\&') // undo double-escape on \& from math
    .replace(/\\\\%/g, '\\%');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
    .replace(/\*(.+?)\*/g, '\\textit{$1}')
    .replace(/`([^`]+)`/g, '\\texttt{$1}')
    .replace(/^#+\s+(.+)/gm, '\\subsection*{$1}')
    .replace(/^-\s+/gm, '\\item ')
    .replace(/^\d+\.\s+/gm, '\\item ');
}

export function sessionToLatex(session: Session): string {
  const lines: string[] = [
    '\\documentclass[12pt]{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage{amsmath, amssymb, amsthm}',
    '\\usepackage{geometry}',
    '\\usepackage{hyperref}',
    '\\usepackage{listings}',
    '\\usepackage{xcolor}',
    '',
    '\\geometry{margin=1in}',
    '',
    '\\definecolor{mathxgold}{HTML}{F0A500}',
    '\\definecolor{codebg}{HTML}{1A1408}',
    '',
    `\\title{\\textbf{${latexEscape(session.name)}}}`,
    `\\author{Math X ◈ ${latexEscape(session.mode.toUpperCase())} MODE${session.domain ? ` — ${latexEscape(session.domain)}` : ''}}`,
    `\\date{${new Date(session.createdAt).toDateString()}}`,
    '',
    '\\lstset{',
    '  basicstyle=\\ttfamily\\small,',
    '  backgroundcolor=\\color{codebg},',
    '  frame=single,',
    '  breaklines=true,',
    '}',
    '',
    '\\begin{document}',
    '\\maketitle',
    '\\tableofcontents',
    '\\newpage',
    '',
  ];

  let sectionIdx = 1;

  for (const msg of session.messages) {
    if (msg.role === 'user') {
      lines.push(`\\section{Query ${sectionIdx++}}`);
      lines.push(stripMarkdown(msg.content));
      if (msg.files && msg.files.length > 0) {
        lines.push(`\\textit{Attached files: ${msg.files.map(latexEscape).join(', ')}}`);
      }
      lines.push('');
    } else {
      lines.push('\\subsection*{Response}');
      if (msg.execution?.stdout) {
        lines.push('\\subsubsection*{Computation Output}');
        lines.push('\\begin{lstlisting}');
        lines.push(msg.execution.stdout);
        lines.push('\\end{lstlisting}');
        lines.push('');
      }
      // Preserve $...$ and $$...$$ as-is since they are valid LaTeX
      lines.push(stripMarkdown(msg.content));
      if (msg.plan) {
        lines.push('');
        lines.push(`\\noindent\\textcolor{mathxgold}{\\textit{Engine: ${latexEscape(msg.plan.engine)} $|$ Domain: ${latexEscape(msg.plan.domain)} $|$ Complexity: ${latexEscape(msg.plan.complexity)}}}`);
      }
      lines.push('');
    }
  }

  lines.push('\\end{document}');
  return lines.join('\n');
}

export function downloadLatex(session: Session): void {
  const tex = sessionToLatex(session);
  const blob = new Blob([tex], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}.tex`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

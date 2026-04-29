// Export a Math X session as a Jupyter Notebook (.ipynb)
import type { Session, Message } from '../state/types';

function escapeForNotebook(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function makeMarkdownCell(source: string[]): object {
  return {
    cell_type: 'markdown',
    id: `md-${Math.random().toString(36).slice(2, 10)}`,
    metadata: {},
    source,
  };
}

function makeCodeCell(source: string[], outputs: object[] = []): object {
  return {
    cell_type: 'code',
    id: `code-${Math.random().toString(36).slice(2, 10)}`,
    execution_count: null,
    metadata: {},
    source,
    outputs,
  };
}

export function sessionToNotebook(session: Session): object {
  const cells: object[] = [];

  // Title cell
  cells.push(makeMarkdownCell([
    `# ${session.name}\n`,
    `\n`,
    `**Math X Session** | Mode: \`${session.mode}\`${session.domain ? ` | Domain: \`${session.domain}\`` : ''}\n`,
    `Created: ${new Date(session.createdAt).toISOString()}`,
  ]));

  for (const msg of session.messages) {
    if (msg.role === 'user') {
      cells.push(makeMarkdownCell([
        `## Query\n`,
        `\n`,
        msg.content,
        ...(msg.files && msg.files.length > 0 ? [`\n\n*Attached files: ${msg.files.join(', ')}*`] : []),
      ]));
    } else {
      // Code execution cell
      if (msg.execution?.stdout) {
        const codeSource = ['# Math X — local WASM computation result\n', '# (Re-run requires Pyodide or standard Python environment)\n'];
        const outputs: object[] = [{
          output_type: 'stream',
          name: 'stdout',
          text: [msg.execution.stdout],
        }];
        cells.push(makeCodeCell(codeSource, outputs));
      }

      if (msg.execution?.error) {
        cells.push(makeMarkdownCell([`> **Computation Error:** ${msg.execution.error}`]));
      }

      // Assistant response as markdown
      cells.push(makeMarkdownCell([
        `## Response\n`,
        `\n`,
        msg.content,
        ...(msg.plan ? [`\n\n---\n*Plan: engine=\`${msg.plan.engine}\` | complexity=\`${msg.plan.complexity}\` | domain=\`${msg.plan.domain}\`*`] : []),
      ]));
    }
  }

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.11.0',
      },
      mathx: {
        session_id: session.id,
        mode: session.mode,
        domain: session.domain || null,
        exported_at: new Date().toISOString(),
      },
    },
    cells,
  };
}

export function downloadNotebook(session: Session): void {
  const nb = sessionToNotebook(session);
  const json = JSON.stringify(nb, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.name.replace(/[^a-z0-9]/gi, '_')}.ipynb`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

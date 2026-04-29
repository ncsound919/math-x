/**
 * bioContext — builds the context block injected into the chat prompt
 * when bioinformatics file data is present in the session.
 */
import type { Request } from 'express';

export interface BioFileContext {
  filename: string;
  fileType: string;
  summary: string;
  stats: Record<string, any>;
  preview: string;
}

export function buildBioContextBlock(files: BioFileContext[]): string {
  if (!files || files.length === 0) return '';

  const blocks = files.map(f => [
    `### Bio File: ${f.filename} [${f.fileType.toUpperCase()}]`,
    `**Summary:** ${f.summary}`,
    `**Statistics:**`,
    ...Object.entries(f.stats)
      .filter(([, v]) => typeof v !== 'object')
      .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`),
    `**Preview (first records):**`,
    '```',
    f.preview,
    '```',
  ].join('\n'));

  return `\n\n## Bioinformatics File Context (parsed locally — 100% private)\n${blocks.join('\n\n---\n\n')}`;
}

/**
 * Bioinformatics-aware mode prefix additions.
 * Appended to the mode prefix when bio files are present.
 */
export const BIO_REASONING_ADDENDUM = `

## Bioinformatics Reasoning Protocol
Bio files have been parsed locally and their statistics are provided above.
1. Acknowledge the file type and what it represents biologically
2. Perform rigorous statistical interpretation of the provided metrics
3. Flag any quality issues (low Phred scores, high variant density, unusual GC content, etc.)
4. Identify the mathematical model most appropriate for this data type
5. Connect to the relevant biological pathway or mechanism
6. Suggest 2-3 follow-up analyses the researcher should run
7. Bridge to the underlying mathematics (e.g., HMMs for sequence alignment, PCA for population structure, GLMs for differential expression)

`;

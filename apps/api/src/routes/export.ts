// Export route — generates PDF, LaTeX, Markdown, and Jupyter Notebook exports
// from a completed Math X session. Previously scaffolded but not registered.
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ExportRequestSchema = z.object({
  content: z.string().min(1),
  format: z.enum(['markdown', 'latex', 'jupyter', 'plain']).default('markdown'),
  title: z.string().optional(),
  mode: z.string().optional(),
});

const FORMAT_SYSTEM: Record<string, string> = {
  latex: `You are a LaTeX formatter. Convert the provided mathematical content into a clean, compilable LaTeX document.
Use \\begin{document}...\\end{document}. Use appropriate math environments: equation, align, cases.
Include \\usepackage{amsmath,amssymb,amsthm}. Output ONLY the LaTeX, no explanation.`,

  jupyter: `You are a Jupyter Notebook formatter. Convert the provided content into a valid .ipynb JSON structure.
Split narrative text into Markdown cells and any code into Python code cells.
Output ONLY valid JSON conforming to the nbformat 4.5 spec, no explanation.`,

  markdown: `You are a Markdown formatter. Convert the provided mathematical content into clean GitHub-flavored Markdown.
Use $ and $$ for inline/block math. Use headers, bold, and code blocks appropriately.
Output ONLY the Markdown, no explanation.`,

  plain: `You are a plain text formatter. Convert the provided content into readable plain text with ASCII math notation.
Output ONLY the plain text, no explanation.`,
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, format, title, mode } = ExportRequestSchema.parse(req.body);

    const systemPrompt = FORMAT_SYSTEM[format];
    const userMessage = [
      title ? `Title: ${title}` : null,
      mode ? `Mode: ${mode}` : null,
      `\nContent to export:\n${content}`,
    ].filter(Boolean).join('\n');

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const exported = response.content.find(b => b.type === 'text')?.text ?? '';

    const contentTypes: Record<string, string> = {
      latex:    'application/x-latex',
      jupyter:  'application/json',
      markdown: 'text/markdown',
      plain:    'text/plain',
    };

    const extensions: Record<string, string> = {
      latex:    '.tex',
      jupyter:  '.ipynb',
      markdown: '.md',
      plain:    '.txt',
    };

    const filename = `${(title || 'mathx-export').replace(/\s+/g, '-').toLowerCase()}${extensions[format]}`;

    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exported);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Export route error:', err);
    res.status(500).json({ error: message });
  }
});

export { router as exportRouter };

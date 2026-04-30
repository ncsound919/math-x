// OCR route — converts an image (base64) containing handwritten or printed math to LaTeX.
// Uses Claude's vision capability; no external OCR service needed.
import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OCRSchema = z.object({
  // base64-encoded image data (no data URI prefix)
  data: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']).default('image/png'),
});

const SYSTEM = `You are a mathematical OCR engine. Given an image containing mathematical notation,
extract ALL mathematical content and return it as clean LaTeX.

Rules:
- Use $...$ for inline math and $$....$$ for display blocks.
- Preserve the original structure (equations, matrices, fractions, integrals).
- If the image contains text + math, include both, wrapping only the math in LaTeX delimiters.
- Do NOT wrap your response in markdown code fences.
- If the image contains no math, return the plain text as-is.
- Prefer \\frac, \\sum, \\int, \\partial, \\nabla over verbose alternatives.`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { data, mediaType } = OCRSchema.parse(req.body);

    const response = await client.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          },
          {
            type: 'text',
            text: 'Extract all mathematical content from this image as LaTeX.',
          },
        ],
      }],
    });

    const latex = response.content.find(b => b.type === 'text')?.text ?? '';
    res.json({ latex: latex.trim() });
  } catch (err: any) {
    console.error('OCR route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as ocrRouter };

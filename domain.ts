import { Router } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import { z } from 'zod';
import { DOMAIN_SYSTEM_PROMPTS, PROOF_ASSISTANT_PROMPT } from '../services/domainPrompts';
import { MATHX_SYSTEM } from '../services/prompts';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DomainRequestSchema = z.object({
  domain: z.string().min(1).max(100),
  query: z.string().min(1).max(20_000),
  isProofRequest: z.boolean().optional().default(false),
});

router.post('/', async (req, res) => {
  let parsed: z.infer<typeof DomainRequestSchema>;
  try {
    parsed = DomainRequestSchema.parse(req.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
    return res.status(400).json({ error: 'Invalid request' });
  }

  const { domain, query, isProofRequest } = parsed;

  try {
    const domainPrompt = DOMAIN_SYSTEM_PROMPTS[domain] || '';
    const systemBase = isProofRequest ? PROOF_ASSISTANT_PROMPT : domainPrompt;

    const response = await anthropic.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${MATHX_SYSTEM}\n\n${systemBase}`,
      messages: [{ role: 'user', content: query }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      res.json({ text: content.text });
    } else {
      res.status(500).json({ error: 'Unexpected response type from model' });
    }
  } catch (error: unknown) {
    console.error('Domain route error:', error);
    res.status(500).json({ error: 'An error occurred processing your request' });
  }
});

export default router;

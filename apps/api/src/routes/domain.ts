import { Router } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import { DOMAIN_SYSTEM_PROMPTS, PROOF_ASSISTANT_PROMPT } from '../services/domainPrompts';
import { MATHX_SYSTEM } from '../services/prompts';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/', async (req, res) => {
  const { domain, query, isProofRequest } = req.body;

  try {
    const domainPrompt = DOMAIN_SYSTEM_PROMPTS[domain] || '';
    const systemBase = isProofRequest ? PROOF_ASSISTANT_PROMPT : domainPrompt;
    
    const response = await anthropic.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${MATHX_SYSTEM}

${systemBase}`,
      messages: [{ role: 'user', content: query }],
    });

    const text = response.content.find((b) => b.type === 'text')?.text;
    if (text !== undefined) {
      res.json({ text });
    } else {
      res.status(500).json({ error: 'Unexpected response type' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

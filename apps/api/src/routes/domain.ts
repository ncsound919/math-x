import { Router } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import { DOMAIN_SYSTEM_PROMPTS, PROOF_ASSISTANT_PROMPT, getDomainPrompt } from '../services/domainPrompts';
import { composeDomains, suggestDomainsWithBridges, findBridges } from '@mathx/math-core';
import { MATHX_SYSTEM } from '../services/prompts';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/domain — single or multi-domain expert reasoning
router.post('/', async (req, res) => {
  const { domain, domains, query, isProofRequest, compose } = req.body;

  try {
    let domainPrompt = '';
    let bridgeInfo: string[] = [];

    if (Array.isArray(domains) && domains.length > 0) {
      // Multi-domain composition
      const composed = composeDomains(domains);
      domainPrompt = composed.prompt;
      const bridges = findBridges(domains);
      bridgeInfo = bridges.map(b => b.name);
    } else if (domain) {
      domainPrompt = DOMAIN_SYSTEM_PROMPTS[domain] || getDomainPrompt(domain);
    }

    const systemBase = isProofRequest ? PROOF_ASSISTANT_PROMPT : domainPrompt;
    const bridgeContext = bridgeInfo.length > 0
      ? `\n\nInterdisciplinary bridges active: ${bridgeInfo.join(', ')}. Leverage cross-domain connections.`
      : '';

    const response = await anthropic.messages.create({
      model: process.env.MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${MATHX_SYSTEM}

${systemBase}${bridgeContext}`,
      messages: [{ role: 'user', content: query }],
    });

    const text = response.content.find((b) => b.type === 'text')?.text;
    if (text !== undefined) {
      res.json({ text, bridges: bridgeInfo });
    } else {
      res.status(500).json({ error: 'Unexpected response type' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/domain/suggest — auto-detect domains (with bridges) from a query
router.post('/suggest', async (req, res) => {
  const { query, limit } = req.body;
  try {
    const suggestions = suggestDomainsWithBridges(query, limit || 5);
    res.json({ suggestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import { Router } from 'express';

const router = Router();

async function probeOllama(baseURL: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseURL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return [];
    const json: any = await res.json();
    return (json.models || []).map((m: any) => m.name as string);
  } catch { return []; }
}

router.get('/', async (_req, res) => {
  const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const available = await probeOllama(ollamaURL);
  const hasDeepSeek = available.some(m => m.includes('deepseek'));
  const hasQwen = available.some(m => m.includes('qwen'));

  res.json({
    claude: !!process.env.ANTHROPIC_API_KEY,
    ollama: { available: hasDeepSeek, model: process.env.OLLAMA_MODEL || 'deepseek-r1:8b', models: available },
    qwen:   { available: hasQwen,     model: process.env.QWEN_MODEL   || 'qwen2.5-math:7b' },
  });
});

export { router as modelsRouter };

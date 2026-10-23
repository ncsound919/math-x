// Eval runner: hits a live Math X API and scores responses against problems.json.
// Usage: EVAL_API_URL=http://localhost:5000 EVAL_API_KEY=... npx ts-node evals/runEval.ts
import fs from 'fs';
import path from 'path';

const API_URL = process.env.EVAL_API_URL || 'http://localhost:5000';
const API_KEY = process.env.EVAL_API_KEY || '';
const MODE = process.env.EVAL_MODE || 'solve';

interface Problem { id: string; domain: string; question: string; expected: string; type: string }

async function ask(q: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: q }], mode: MODE }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop() || '';
    for (const l of lines) {
      if (!l.startsWith('data: ')) continue;
      try { const e = JSON.parse(l.slice(6)); if (e.delta) out += e.delta; } catch {}
    }
  }
  return out;
}

function score(response: string, expected: string): boolean {
  const r = response.toLowerCase();
  const e = expected.toLowerCase().replace(/\s+/g, '');
  // loose: expected token appears in response
  const tokens = expected.toLowerCase().split(/[,;\s]+/).filter(Boolean);
  return tokens.every(t => r.includes(t.replace(/\s+/g, '')));
}

async function main() {
  const problems: Problem[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'problems.json'), 'utf8'));
  const results: any[] = [];
  let pass = 0;
  for (const p of problems) {
    process.stdout.write(`${p.id} ... `);
    try {
      const resp = await ask(p.question);
      const ok = score(resp, p.expected);
      if (ok) pass++;
      results.push({ id: p.id, domain: p.domain, pass: ok, response: resp.slice(0, 300) });
      console.log(ok ? 'PASS' : 'FAIL');
    } catch (e: any) {
      results.push({ id: p.id, domain: p.domain, pass: false, error: e.message });
      console.log('ERROR', e.message);
    }
  }
  const summary = { total: problems.length, pass, fail: problems.length - pass, accuracy: (pass / problems.length).toFixed(3) };
  fs.writeFileSync(path.join(__dirname, 'last-run.json'), JSON.stringify({ summary, results }, null, 2));
  console.log('\n', summary);
}

main().catch(e => { console.error(e); process.exit(1); });
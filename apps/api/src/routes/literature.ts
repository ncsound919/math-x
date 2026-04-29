/**
 * /api/literature — live RAG from arXiv and PubMed.
 * Searches both databases, returns abstracts + metadata.
 * The frontend embeds these locally into LanceDB for vector retrieval.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const SearchSchema = z.object({
  query: z.string().min(2).max(300),
  sources: z.array(z.enum(['arxiv', 'pubmed'])).default(['arxiv', 'pubmed']),
  maxResults: z.number().min(1).max(20).default(8),
});

// ---- arXiv ----
async function searchArxiv(query: string, max: number): Promise<any[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${max}&sortBy=relevance&sortOrder=descending`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MathX/2.0 (research tool)' } });
  if (!res.ok) throw new Error(`arXiv fetch failed: ${res.status}`);
  const xml = await res.text();

  // Minimal XML parsing — no dependency needed
  const entries: any[] = [];
  const entryPattern = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryPattern.exec(xml)) !== null && entries.length < max) {
    const block = m[1];
    const title   = (/<title>([\s\S]*?)<\/title>/.exec(block)?.[1] || '').replace(/\n/g, ' ').trim();
    const summary = (/<summary>([\s\S]*?)<\/summary>/.exec(block)?.[1] || '').replace(/\n/g, ' ').trim().slice(0, 600);
    const id      = (/<id>([\s\S]*?)<\/id>/.exec(block)?.[1] || '').trim();
    const published = (/<published>([\s\S]*?)<\/published>/.exec(block)?.[1] || '').trim();
    const authors: string[] = [];
    const authorPattern = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g;
    let am;
    while ((am = authorPattern.exec(block)) !== null) authors.push(am[1].trim());

    if (title && summary) {
      entries.push({
        id: id.replace('http://arxiv.org/abs/', 'arxiv:'),
        title,
        abstract: summary,
        authors: authors.slice(0, 5),
        published: published.slice(0, 10),
        url: id,
        source: 'arxiv',
      });
    }
  }
  return entries;
}

// ---- PubMed ----
async function searchPubMed(query: string, max: number): Promise<any[]> {
  const encoded = encodeURIComponent(query);
  // Step 1: ESearch to get IDs
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encoded}&retmax=${max}&retmode=json&usehistory=n`;
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'MathX/2.0' } });
  if (!searchRes.ok) throw new Error(`PubMed search failed: ${searchRes.status}`);
  const searchJson = await searchRes.json();
  const ids: string[] = searchJson?.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  // Step 2: ESummary to get metadata
  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const summaryRes = await fetch(summaryUrl, { headers: { 'User-Agent': 'MathX/2.0' } });
  if (!summaryRes.ok) throw new Error(`PubMed summary failed: ${summaryRes.status}`);
  const summaryJson = await summaryRes.json();
  const result = summaryJson?.result || {};

  // Step 3: EFetch abstracts for top 5 (rate limit consideration)
  const topIds = ids.slice(0, 5);
  let abstracts: Record<string, string> = {};
  try {
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${topIds.join(',')}&rettype=abstract&retmode=text`;
    const fetchRes = await fetch(fetchUrl, { headers: { 'User-Agent': 'MathX/2.0' } });
    const text = await fetchRes.text();
    // Parse individual abstracts by PMID
    const sections = text.split(/\n\n\d+\. /);
    sections.forEach((section, i) => {
      if (topIds[i]) abstracts[topIds[i]] = section.slice(0, 600).replace(/\n/g, ' ').trim();
    });
  } catch (e) {
    // Non-fatal — fall back to titles only
  }

  return ids.map(id => {
    const doc = result[id] || {};
    return {
      id: `pmid:${id}`,
      title: doc.title || '',
      abstract: abstracts[id] || doc.title || '',
      authors: (doc.authors || []).slice(0, 5).map((a: any) => a.name || ''),
      published: (doc.pubdate || '').slice(0, 10),
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      source: 'pubmed',
      journal: doc.source || '',
    };
  }).filter(d => d.title);
}

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, sources, maxResults } = SearchSchema.parse(req.body);
    const perSource = Math.ceil(maxResults / sources.length);

    const results = await Promise.allSettled([
      sources.includes('arxiv')  ? searchArxiv(query, perSource)  : Promise.resolve([]),
      sources.includes('pubmed') ? searchPubMed(query, perSource) : Promise.resolve([]),
    ]);

    const arxivResults  = results[0].status === 'fulfilled' ? results[0].value : [];
    const pubmedResults = results[1].status === 'fulfilled' ? results[1].value : [];

    const errors: string[] = [];
    if (results[0].status === 'rejected') errors.push(`arXiv: ${(results[0] as any).reason?.message}`);
    if (results[1].status === 'rejected') errors.push(`PubMed: ${(results[1] as any).reason?.message}`);

    res.json({
      papers: [...arxivResults, ...pubmedResults].slice(0, maxResults),
      counts: { arxiv: arxivResults.length, pubmed: pubmedResults.length },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Literature search error:', err);
    res.status(500).json({ error: err.message, papers: [] });
  }
});

export { router as literatureRouter };

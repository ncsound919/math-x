// Literature route — PubMed NCBI E-utilities + arXiv search
// Returns structured paper metadata + abstracts for RAG injection into Claude context
import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const ARXIV_BASE = 'https://export.arxiv.org/api/query';
const TOOL_NAME = 'mathx-literature';
const TOOL_EMAIL = process.env.NCBI_EMAIL || 'mathx@ncsound919.dev';
const NCBI_API_KEY = process.env.NCBI_API_KEY || '';

interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal: string;
  url: string;
  source: 'pubmed' | 'arxiv';
  relevanceScore?: number;
}

// PubMed ESearch + EFetch pipeline
async function searchPubMed(query: string, maxResults = 5): Promise<PaperResult[]> {
  const apiKeyParam = NCBI_API_KEY ? `&api_key=${NCBI_API_KEY}` : '';
  const searchUrl = `${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&tool=${TOOL_NAME}&email=${TOOL_EMAIL}${apiKeyParam}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PubMed ESearch failed: ${searchRes.status}`);
  const searchData = await searchRes.json() as any;

  const ids: string[] = searchData?.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const fetchUrl = `${NCBI_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml&tool=${TOOL_NAME}&email=${TOOL_EMAIL}${apiKeyParam}`;
  const fetchRes = await fetch(fetchUrl);
  if (!fetchRes.ok) throw new Error(`PubMed EFetch failed: ${fetchRes.status}`);
  const xml = await fetchRes.text();

  return parsePubMedXML(xml, ids);
}

function parsePubMedXML(xml: string, ids: string[]): PaperResult[] {
  const articles: PaperResult[] = [];
  const articleBlocks = xml.match(/<PubmedArticle>(.*?)<\/PubmedArticle>/gs) || [];

  for (let i = 0; i < articleBlocks.length; i++) {
    const block = articleBlocks[i];

    const titleMatch = block.match(/<ArticleTitle[^>]*>(.*?)<\/ArticleTitle>/s);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';

    const abstractParts = block.match(/<AbstractText[^>]*>(.*?)<\/AbstractText>/gs) || [];
    const abstract = abstractParts.map(p => p.replace(/<[^>]+>/g, '').trim()).join(' ');

    const authorMatches = block.match(/<LastName>(.*?)<\/LastName>/gs) || [];
    const authors = authorMatches.slice(0, 4).map(m => m.replace(/<[^>]+>/g, '').trim());

    const yearMatch = block.match(/<PubDate>.*?<Year>(\d{4})<\/Year>/s);
    const year = yearMatch ? yearMatch[1] : 'Unknown';

    const journalMatch = block.match(/<Title>(.*?)<\/Title>/);
    const journal = journalMatch ? journalMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const pmid = ids[i] || '';

    articles.push({
      id: `pmid-${pmid}`,
      title,
      authors,
      abstract: abstract.slice(0, 1500),
      year,
      journal,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      source: 'pubmed',
    });
  }

  return articles;
}

// arXiv Atom feed query
async function searchArXiv(query: string, maxResults = 5): Promise<PaperResult[]> {
  const url = `${ARXIV_BASE}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);
  const xml = await res.text();
  return parseArXivXML(xml);
}

function parseArXivXML(xml: string): PaperResult[] {
  const entries = xml.match(/<entry>(.*?)<\/entry>/gs) || [];
  return entries.map(entry => {
    const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Untitled';

    const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);
    const abstract = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().slice(0, 1500) : '';

    const authorMatches = entry.match(/<name>(.*?)<\/name>/g) || [];
    const authors = authorMatches.slice(0, 4).map(m => m.replace(/<[^>]+>/g, '').trim());

    const publishedMatch = entry.match(/<published>(\d{4})/);
    const year = publishedMatch ? publishedMatch[1] : 'Unknown';

    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const arxivId = idMatch ? idMatch[1].trim() : '';
    const shortId = arxivId.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '');

    return {
      id: `arxiv-${shortId}`,
      title,
      authors,
      abstract,
      year,
      journal: 'arXiv',
      url: `https://arxiv.org/abs/${shortId}`,
      source: 'arxiv' as const,
    };
  });
}

const SearchSchema = z.object({
  query: z.string().min(2),
  sources: z.array(z.enum(['pubmed', 'arxiv'])).default(['pubmed', 'arxiv']),
  maxPerSource: z.number().min(1).max(10).default(4),
});

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, sources, maxPerSource } = SearchSchema.parse(req.body);
    const results: PaperResult[] = [];
    const errors: string[] = [];

    await Promise.all([
      sources.includes('pubmed') ?
        searchPubMed(query, maxPerSource)
          .then(r => results.push(...r))
          .catch(e => errors.push(`PubMed: ${e.message}`))
        : Promise.resolve(),
      sources.includes('arxiv') ?
        searchArXiv(query, maxPerSource)
          .then(r => results.push(...r))
          .catch(e => errors.push(`arXiv: ${e.message}`))
        : Promise.resolve(),
    ]);

    res.json({ results, errors, query });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Fetch abstract for a specific PMID
router.get('/pubmed/:pmid', async (req: Request, res: Response) => {
  try {
    const { pmid } = req.params;
    const apiKeyParam = NCBI_API_KEY ? `&api_key=${NCBI_API_KEY}` : '';
    const url = `${NCBI_BASE}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=xml&tool=${TOOL_NAME}&email=${TOOL_EMAIL}${apiKeyParam}`;
    const fetchRes = await fetch(url);
    const xml = await fetchRes.text();
    const parsed = parsePubMedXML(xml, [pmid]);
    res.json({ paper: parsed[0] || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gene/protein lookup via NCBI Gene database
router.get('/gene/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const apiKeyParam = NCBI_API_KEY ? `&api_key=${NCBI_API_KEY}` : '';
    const searchUrl = `${NCBI_BASE}/esearch.fcgi?db=gene&term=${encodeURIComponent(query + '[gene]')}&retmax=5&retmode=json&tool=${TOOL_NAME}&email=${TOOL_EMAIL}${apiKeyParam}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json() as any;
    const ids: string[] = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return res.json({ genes: [] });

    const summaryUrl = `${NCBI_BASE}/esummary.fcgi?db=gene&id=${ids.slice(0, 5).join(',')}&retmode=json&tool=${TOOL_NAME}&email=${TOOL_EMAIL}${apiKeyParam}`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json() as any;

    const genes = ids.slice(0, 5).map(id => {
      const doc = summaryData?.result?.[id];
      if (!doc) return null;
      return {
        id,
        name: doc.name,
        description: doc.description,
        organism: doc.organism?.scientificname,
        chromosome: doc.chromosome,
        location: doc.maplocation,
        summary: doc.summary?.slice(0, 500),
        url: `https://www.ncbi.nlm.nih.gov/gene/${id}`,
      };
    }).filter(Boolean);

    res.json({ genes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as literatureRouter };

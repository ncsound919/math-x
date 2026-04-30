// Bio route — proxies NCBI E-utilities and UniProt for live biological data lookup.
// NCBI: no API key for basic queries (<3 req/sec); add NCBI_API_KEY env var for 10 req/sec.
// UniProt: fully open, no key needed.
import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const NCBISchema = z.object({
  query: z.string().min(1),
  db: z.enum(['nucleotide', 'protein', 'gene', 'pubmed']).default('protein'),
  retmax: z.number().int().min(1).max(20).default(5),
});

const UniProtSchema = z.object({
  query: z.string().min(1),
  size: z.number().int().min(1).max(10).default(5),
});

// Fetch helper with timeout
async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal } as any);
    return r as any;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/bio/ncbi — search NCBI E-utilities
router.post('/ncbi', async (req: Request, res: Response) => {
  try {
    const { query, db, retmax } = NCBISchema.parse(req.body);
    const apiKey = process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : '';

    // Step 1: esearch — get IDs
    const searchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
      `?db=${db}&term=${encodeURIComponent(query)}&retmax=${retmax}&retmode=json${apiKey}`;
    const searchRes = await fetchWithTimeout(searchUrl);
    const searchData = await (searchRes as any).json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];

    if (ids.length === 0) {
      return res.json({ results: [], query, db });
    }

    // Step 2: efetch — get summaries
    const fetchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
      `?db=${db}&id=${ids.join(',')}&retmode=json${apiKey}`;
    const fetchRes = await fetchWithTimeout(fetchUrl);
    const fetchData = await (fetchRes as any).json();

    const uids: string[] = fetchData?.result?.uids ?? ids;
    const results = uids.map((uid: string) => {
      const doc = fetchData?.result?.[uid] ?? {};
      return {
        uid,
        title: doc.title ?? doc.caption ?? '',
        description: doc.extra ?? doc.status ?? '',
        organism: doc.organism ?? '',
        length: doc.slen ?? doc.length ?? null,
        accession: doc.accessionversion ?? doc.accession ?? uid,
        db,
      };
    });

    res.json({ results, total: searchData?.esearchresult?.count ?? results.length });
  } catch (err: any) {
    console.error('Bio NCBI route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bio/uniprot — search UniProt protein database
router.post('/uniprot', async (req: Request, res: Response) => {
  try {
    const { query, size } = UniProtSchema.parse(req.body);

    const url =
      `https://rest.uniprot.org/uniprotkb/search` +
      `?query=${encodeURIComponent(query)}&format=json&size=${size}` +
      `&fields=accession,id,protein_name,gene_names,organism_name,length,cc_function,cc_subcellular_location`;

    const uniRes = await fetchWithTimeout(url);
    const data = await (uniRes as any).json();

    const results = (data?.results ?? []).map((r: any) => ({
      accession: r.primaryAccession,
      id: r.uniProtkbId,
      proteinName: r.proteinDescription?.recommendedName?.fullName?.value
        ?? r.proteinDescription?.submittedName?.[0]?.fullName?.value
        ?? '',
      geneNames: r.genes?.map((g: any) => g.geneName?.value).filter(Boolean) ?? [],
      organism: r.organism?.scientificName ?? '',
      length: r.sequence?.length ?? null,
      function: r.comments?.find((c: any) => c.commentType === 'FUNCTION')?.texts?.[0]?.value ?? '',
      subcellularLocation: r.comments
        ?.find((c: any) => c.commentType === 'SUBCELLULAR LOCATION')
        ?.subcellularLocations?.[0]?.location?.value ?? '',
      url: `https://www.uniprot.org/uniprotkb/${r.primaryAccession}`,
    }));

    res.json({ results, total: data?.results?.length ?? 0 });
  } catch (err: any) {
    console.error('Bio UniProt route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export { router as bioRouter };

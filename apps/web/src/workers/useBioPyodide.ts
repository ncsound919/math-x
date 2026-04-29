/**
 * useBioPyodide — dedicated Pyodide worker for bioinformatics file parsing.
 * Extends the base Pyodide 0.27 worker with Biopython + bioinformatics stack.
 * Runs 100% locally — no data ever leaves the browser.
 */
import { useState, useEffect, useRef } from 'react';

export type BioFileType = 'fasta' | 'fastq' | 'vcf' | 'pdb' | 'bed' | 'gff3' | 'sam' | 'csv' | 'tsv' | 'unknown';

export interface BioParseResult {
  fileType: BioFileType;
  summary: string;       // human-readable summary
  stats: Record<string, any>;
  preview: string;       // first N records as text
  pyData: string;        // JSON-serialisable extracted data for chart/table
  error?: string;
}

const WORKER_CODE = /* javascript */`
importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');

let pyodide = null;
let ready = false;

async function boot() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/' });
  await pyodide.loadPackage(['numpy', 'pandas', 'micropip']);
  const micropip = pyodide.pyimport('micropip');
  try {
    await micropip.install(['biopython', 'scikit-learn', 'statsmodels', 'networkx']);
  } catch(e) {
    console.warn('[BioWorker] Optional package install warning:', e);
  }
  ready = true;
  self.postMessage({ type: 'ready' });
}

boot();

self.onmessage = async (e) => {
  const { type, id, code, fileText, fileType } = e.data;
  if (!ready) { self.postMessage({ type: 'error', id, error: 'Worker not ready' }); return; }

  if (type === 'parse') {
    try {
      const result = await pyodide.runPythonAsync(buildParseCode(fileType, fileText));
      self.postMessage({ type: 'parsed', id, result: JSON.parse(result) });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }

  if (type === 'run') {
    try {
      await pyodide.runPythonAsync(\`import sys, io; sys.stdout = io.StringIO()\`);
      await pyodide.runPythonAsync(code);
      const out = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      self.postMessage({ type: 'result', id, out: String(out).trim() });
    } catch(err) {
      self.postMessage({ type: 'error', id, error: String(err) });
    }
  }
};

function buildParseCode(fileType, fileText) {
  const escaped = fileText.replace(/\\/g, '\\\\').replace(/\`/g, '\\\`').replace(/'/g, "\\'");
  switch(fileType) {
    case 'fasta': return parseFasta(escaped);
    case 'fastq': return parseFastq(escaped);
    case 'vcf':   return parseVcf(escaped);
    case 'pdb':   return parsePdb(escaped);
    case 'bed':   return parseBed(escaped);
    case 'gff3':  return parseGff3(escaped);
    default:      return parseGeneric(escaped);
  }
}

function parseFasta(text) { return \`
import json
from Bio import SeqIO
import io, numpy as np

handle = io.StringIO('''\${text}''')
records = list(SeqIO.parse(handle, 'fasta'))
n = len(records)
lengths = [len(r.seq) for r in records]
gc = [round(100*(r.seq.count('G')+r.seq.count('C'))/len(r.seq),2) if len(r.seq)>0 else 0 for r in records]
preview = '\\n'.join(f'>{r.id} ({len(r.seq)} bp) GC={round(100*(r.seq.count("G")+r.seq.count("C"))/max(len(r.seq),1),1)}%' for r in records[:10])
result = {
  'fileType': 'fasta',
  'summary': f'{n} sequences | mean length {round(np.mean(lengths),1) if lengths else 0} bp | mean GC {round(np.mean(gc),1) if gc else 0}%',
  'stats': {'n_sequences': n, 'mean_length': round(float(np.mean(lengths)),2) if lengths else 0, 'max_length': int(max(lengths)) if lengths else 0, 'min_length': int(min(lengths)) if lengths else 0, 'mean_gc': round(float(np.mean(gc)),2) if gc else 0},
  'preview': preview,
  'pyData': json.dumps({'chart': True, 'type': 'bar', 'title': 'Sequence Lengths', 'xlabel': 'Sequence', 'ylabel': 'Length (bp)', 'x': [r.id[:20] for r in records[:30]], 'y': lengths[:30]})
}
print(json.dumps(result))
\`; }

function parseFastq(text) { return \`
import json
from Bio import SeqIO
import io, numpy as np

handle = io.StringIO('''\${text}''')
records = list(SeqIO.parse(handle, 'fastq'))
n = len(records)
lengths = [len(r.seq) for r in records]
quals = [np.mean(r.letter_annotations.get('phred_quality', [0])) for r in records]
preview = '\\n'.join(f'@{r.id} len={len(r.seq)} meanQ={round(np.mean(r.letter_annotations.get("phred_quality",[0])),1)}' for r in records[:10])
result = {
  'fileType': 'fastq',
  'summary': f'{n} reads | mean length {round(np.mean(lengths),1) if lengths else 0} bp | mean quality {round(np.mean(quals),2) if quals else 0}',
  'stats': {'n_reads': n, 'mean_length': round(float(np.mean(lengths)),2) if lengths else 0, 'mean_quality': round(float(np.mean(quals)),2) if quals else 0, 'pct_q30': round(100*sum(q>=30 for q in quals)/max(n,1),1)},
  'preview': preview,
  'pyData': json.dumps({'chart': True, 'type': 'bar', 'title': 'Quality Score Distribution', 'xlabel': 'Read', 'ylabel': 'Mean Phred Q', 'x': [r.id[:20] for r in records[:30]], 'y': [round(float(np.mean(r.letter_annotations.get('phred_quality',[0]))),2) for r in records[:30]]})
}
print(json.dumps(result))
\`; }

function parseVcf(text) { return \`
import json
lines = [l for l in '''\${text}'''.strip().split('\\n') if not l.startswith('##')]
if lines and lines[0].startswith('#'):
    header = lines[0].lstrip('#').split('\\t')
    data_lines = lines[1:]
else:
    header = ['CHROM','POS','ID','REF','ALT','QUAL','FILTER','INFO']
    data_lines = lines
variants = []
for line in data_lines[:500]:
    parts = line.split('\\t')
    if len(parts) >= 8:
        variants.append({'chrom': parts[0], 'pos': int(parts[1]) if parts[1].isdigit() else 0, 'ref': parts[3], 'alt': parts[4], 'qual': parts[5], 'filter': parts[6]})
chroms = {}
for v in variants:
    chroms[v['chrom']] = chroms.get(v['chrom'], 0) + 1
snps = sum(1 for v in variants if len(v['ref'])==1 and len(v['alt'])==1)
indels = len(variants) - snps
result = {
  'fileType': 'vcf',
  'summary': f"{len(variants)} variants | {snps} SNPs | {indels} indels | {len(chroms)} chromosomes",
  'stats': {'n_variants': len(variants), 'snps': snps, 'indels': indels, 'chromosomes': len(chroms)},
  'preview': '\\n'.join(f"{v['chrom']}:{v['pos']} {v['ref']}->{v['alt']} [{v['filter']}]" for v in variants[:15]),
  'pyData': json.dumps({'chart': True, 'type': 'bar', 'title': 'Variants per Chromosome', 'xlabel': 'Chromosome', 'ylabel': 'Variant Count', 'x': list(chroms.keys())[:20], 'y': list(chroms.values())[:20]})
}
print(json.dumps(result))
\`; }

function parsePdb(text) { return \`
import json
from Bio.PDB import PDBParser
import io
lines = '''\${text}'''
parser = PDBParser(QUIET=True)
structure = parser.get_structure('mol', io.StringIO(lines))
models = list(structure.get_models())
chains = list(structure.get_chains())
residues = list(structure.get_residues())
atoms = list(structure.get_atoms())
aa_names = [r.resname for r in residues if r.resname not in ['HOH','WAT']]
aa_count = {}
for aa in aa_names:
    aa_count[aa] = aa_count.get(aa, 0) + 1
top10 = sorted(aa_count.items(), key=lambda x: -x[1])[:10]
result = {
  'fileType': 'pdb',
  'summary': f"{len(models)} model(s) | {len(chains)} chain(s) | {len(residues)} residues | {len(atoms)} atoms",
  'stats': {'n_models': len(models), 'n_chains': len(chains), 'n_residues': len(residues), 'n_atoms': len(atoms)},
  'preview': '\\n'.join(f"Chain {c.id}: {len(list(c.get_residues()))} residues" for c in chains[:10]),
  'pyData': json.dumps({'chart': True, 'type': 'bar', 'title': 'Residue Composition (Top 10)', 'xlabel': 'Residue', 'ylabel': 'Count', 'x': [t[0] for t in top10], 'y': [t[1] for t in top10]})
}
print(json.dumps(result))
\`; }

function parseBed(text) { return \`
import json
lines = [l for l in '''\${text}'''.strip().split('\\n') if l and not l.startswith('#') and not l.startswith('track') and not l.startswith('browser')]
features = []
for line in lines[:2000]:
    parts = line.split('\\t')
    if len(parts) >= 3:
        try:
            features.append({'chrom': parts[0], 'start': int(parts[1]), 'end': int(parts[2]), 'length': int(parts[2])-int(parts[1]), 'name': parts[3] if len(parts)>3 else '.'})
        except: pass
lengths = [f['length'] for f in features]
chroms = {}
for f in features:
    chroms[f['chrom']] = chroms.get(f['chrom'], 0) + 1
import statistics
result = {
  'fileType': 'bed',
  'summary': f"{len(features)} features | mean interval {round(statistics.mean(lengths),1) if lengths else 0} bp | {len(chroms)} chromosomes",
  'stats': {'n_features': len(features), 'mean_interval_bp': round(statistics.mean(lengths),1) if lengths else 0, 'total_coverage_bp': sum(lengths), 'chromosomes': len(chroms)},
  'preview': '\\n'.join(f"{f['chrom']}:{f['start']}-{f['end']} ({f['length']} bp)" for f in features[:15]),
  'pyData': json.dumps({'chart': True, 'type': 'bar', 'title': 'Features per Chromosome', 'xlabel': 'Chromosome', 'ylabel': 'Feature Count', 'x': list(chroms.keys())[:20], 'y': list(chroms.values())[:20]})
}
print(json.dumps(result))
\`; }

function parseGff3(text) { return \`
import json
lines = [l for l in '''\${text}'''.strip().split('\\n') if l and not l.startswith('#')]
features = []
for line in lines[:2000]:
    parts = line.split('\\t')
    if len(parts) >= 9:
        try:
            features.append({'seqid': parts[0], 'type': parts[2], 'start': int(parts[3]), 'end': int(parts[4]), 'strand': parts[6]})
        except: pass
types = {}
for f in features:
    types[f['type']] = types.get(f['type'], 0) + 1
result = {
  'fileType': 'gff3',
  'summary': f"{len(features)} features | {len(types)} feature types",
  'stats': {'n_features': len(features), 'feature_types': types},
  'preview': '\\n'.join(f"{f['seqid']} {f['type']} {f['start']}-{f['end']} ({f['strand']})" for f in features[:15]),
  'pyData': json.dumps({'chart': True, 'type': 'bar', 'title': 'Feature Type Distribution', 'xlabel': 'Type', 'ylabel': 'Count', 'x': list(types.keys())[:15], 'y': list(types.values())[:15]})
}
print(json.dumps(result))
\`; }

function parseGeneric(text) { return \`
import json
lines = '''\${text}'''.strip().split('\\n')
result = {
  'fileType': 'unknown',
  'summary': f'{len(lines)} lines detected — use the compute engine for custom analysis',
  'stats': {'lines': len(lines)},
  'preview': '\\n'.join(lines[:20]),
  'pyData': '{}'
}
print(json.dumps(result))
\`; }
`;

export function detectFileType(filename: string, content: string): BioFileType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['fa', 'fasta', 'fna', 'ffn', 'faa', 'frn'].includes(ext)) return 'fasta';
  if (['fastq', 'fq'].includes(ext)) return 'fastq';
  if (ext === 'vcf') return 'vcf';
  if (ext === 'pdb' || ext === 'ent') return 'pdb';
  if (ext === 'bed') return 'bed';
  if (['gff', 'gff3', 'gtf'].includes(ext)) return 'gff3';
  if (ext === 'sam') return 'sam';
  // Content sniffing fallback
  if (content.trimStart().startsWith('>')) return 'fasta';
  if (content.trimStart().startsWith('@') && content.includes('\n+\n')) return 'fastq';
  if (content.includes('##fileformat=VCF')) return 'vcf';
  if (content.includes('ATOM  ') || content.includes('HETATM')) return 'pdb';
  return 'unknown';
}

export function useBioPyodide() {
  const [ready, setReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (v: any) => void }>>( new Map());

  useEffect(() => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'ready') { setReady(true); return; }
      const pending = pendingRef.current.get(msg.id);
      if (pending) {
        pending.resolve(msg.type === 'error'
          ? { error: msg.error, fileType: 'unknown', summary: msg.error, stats: {}, preview: '', pyData: '{}' }
          : msg.result ?? { out: msg.out });
        pendingRef.current.delete(msg.id);
      }
    };

    return () => { worker.terminate(); URL.revokeObjectURL(url); };
  }, []);

  const parseFile = (filename: string, content: string): Promise<BioParseResult> => {
    if (!workerRef.current) return Promise.resolve({ fileType: 'unknown', summary: 'Worker not initialised', stats: {}, preview: '', pyData: '{}' });
    const id = `bio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileType = detectFileType(filename, content);
    return new Promise((resolve) => {
      pendingRef.current.set(id, { resolve });
      workerRef.current!.postMessage({ type: 'parse', id, fileText: content, fileType });
    });
  };

  const compute = (code: string): Promise<string> => {
    if (!workerRef.current || !ready) return Promise.resolve('Bio engine not ready.');
    const id = `bio-run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      pendingRef.current.set(id, { resolve: (v: any) => resolve(v.out ?? v.error ?? JSON.stringify(v)) });
      workerRef.current!.postMessage({ type: 'run', id, code });
    });
  };

  return { ready, parseFile, compute };
}

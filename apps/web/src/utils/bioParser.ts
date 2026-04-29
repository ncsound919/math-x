// Bio file format detection + Python codegen for each format.
// All code runs in the Biopython/Pyodide WASM worker — nothing leaves the browser.

export type BioFormat = 'fasta' | 'fastq' | 'vcf' | 'bed' | 'gff' | 'pdb' | 'unknown';

export interface BioFileMeta {
  format: BioFormat;
  filename: string;
  sizeKB: number;
  content: string;
}

// Detect format from filename + content sniff
export function detectBioFormat(filename: string, content: string): BioFormat {
  const lower = filename.toLowerCase();
  const firstLine = content.split('\n')[0].trim();

  if (lower.endsWith('.fa') || lower.endsWith('.fasta') || lower.endsWith('.fna') || lower.endsWith('.ffn') || lower.endsWith('.faa') || lower.endsWith('.frn')) return 'fasta';
  if (lower.endsWith('.fastq') || lower.endsWith('.fq')) return 'fastq';
  if (lower.endsWith('.vcf')) return 'vcf';
  if (lower.endsWith('.bed')) return 'bed';
  if (lower.endsWith('.gff') || lower.endsWith('.gff3') || lower.endsWith('.gtf')) return 'gff';
  if (lower.endsWith('.pdb') || lower.endsWith('.ent')) return 'pdb';

  // Content sniff fallback
  if (firstLine.startsWith('>')) return 'fasta';
  if (firstLine.startsWith('@')) return 'fastq';
  if (firstLine.startsWith('##fileformat=VCF') || firstLine.startsWith('#CHROM')) return 'vcf';
  if (firstLine.startsWith('##gff') || firstLine.startsWith('##gtf')) return 'gff';
  if (firstLine.startsWith('ATOM') || firstLine.startsWith('HETATM') || firstLine.startsWith('HEADER')) return 'pdb';

  return 'unknown';
}

// Generate Python analysis code for each format — executed in Biopython worker
export function generateBioAnalysisCode(meta: BioFileMeta): string {
  const escaped = meta.content.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const MAX_CHARS = 200_000; // Limit to prevent WASM OOM
  const safe = escaped.length > MAX_CHARS ? escaped.slice(0, MAX_CHARS) : escaped;

  switch (meta.format) {
    case 'fasta':
      return `
import json
from io import StringIO
try:
    from Bio import SeqIO
    from Bio.SeqUtils import gc_fraction
    import numpy as np
except ImportError:
    print(json.dumps({"error": "Biopython not available"}))
    raise SystemExit

content = """${safe}"""
records = list(SeqIO.parse(StringIO(content), 'fasta'))
if not records:
    print(json.dumps({"error": "No FASTA records found"}))
    raise SystemExit

seq_lens = [len(r.seq) for r in records]
gc_values = [round(gc_fraction(r.seq) * 100, 2) for r in records]

summary = {
    "format": "FASTA",
    "num_sequences": len(records),
    "total_bases": int(sum(seq_lens)),
    "min_length": int(min(seq_lens)),
    "max_length": int(max(seq_lens)),
    "mean_length": round(float(np.mean(seq_lens)), 1),
    "median_length": round(float(np.median(seq_lens)), 1),
    "mean_gc_percent": round(float(np.mean(gc_values)), 2),
    "min_gc_percent": float(min(gc_values)),
    "max_gc_percent": float(max(gc_values)),
    "first_3_ids": [r.id for r in records[:3]],
    "first_3_descriptions": [r.description for r in records[:3]],
    "first_3_lengths": seq_lens[:3],
}
print(json.dumps(summary, indent=2))
`;

    case 'fastq':
      return `
import json
from io import StringIO
try:
    from Bio import SeqIO
    from Bio.SeqUtils import gc_fraction
    import numpy as np
except ImportError:
    print(json.dumps({"error": "Biopython not available"}))
    raise SystemExit

content = """${safe}"""
records = list(SeqIO.parse(StringIO(content), 'fastq'))
if not records:
    print(json.dumps({"error": "No FASTQ records found"}))
    raise SystemExit

seq_lens = [len(r.seq) for r in records]
qual_means = [round(float(np.mean(r.letter_annotations['phred_quality'])), 2) for r in records]
gc_vals = [round(gc_fraction(r.seq) * 100, 2) for r in records]

summary = {
    "format": "FASTQ",
    "num_reads": len(records),
    "total_bases": int(sum(seq_lens)),
    "min_read_length": int(min(seq_lens)),
    "max_read_length": int(max(seq_lens)),
    "mean_read_length": round(float(np.mean(seq_lens)), 1),
    "mean_phred_quality": round(float(np.mean(qual_means)), 2),
    "min_mean_quality": round(float(min(qual_means)), 2),
    "max_mean_quality": round(float(max(qual_means)), 2),
    "reads_passing_q30": int(sum(1 for q in qual_means if q >= 30)),
    "pct_passing_q30": round(100 * sum(1 for q in qual_means if q >= 30) / len(qual_means), 1),
    "mean_gc_percent": round(float(np.mean(gc_vals)), 2),
    "first_3_ids": [r.id for r in records[:3]],
}
print(json.dumps(summary, indent=2))
`;

    case 'vcf':
      return `
import json
from io import StringIO
import re

content = """${safe}"""
lines = content.strip().split('\\n')
meta_lines = [l for l in lines if l.startswith('##')]
header_line = next((l for l in lines if l.startswith('#CHROM')), None)
data_lines = [l for l in lines if not l.startswith('#') and l.strip()]

chromosomes = {}
filter_counts = {}
variant_types = {'SNP': 0, 'INDEL': 0, 'MNP': 0, 'OTHER': 0}

for line in data_lines:
    parts = line.split('\\t')
    if len(parts) < 5:
        continue
    chrom, pos, vid, ref, alt = parts[0], parts[1], parts[2], parts[3], parts[4]
    chromosomes[chrom] = chromosomes.get(chrom, 0) + 1
    filt = parts[6] if len(parts) > 6 else 'UNKNOWN'
    filter_counts[filt] = filter_counts.get(filt, 0) + 1
    # Classify variant type
    alts = alt.split(',')
    for a in alts:
        if len(ref) == 1 and len(a) == 1:
            variant_types['SNP'] += 1
        elif len(ref) != len(a):
            variant_types['INDEL'] += 1
        elif len(ref) > 1 and len(ref) == len(a):
            variant_types['MNP'] += 1
        else:
            variant_types['OTHER'] += 1

cols = header_line.lstrip('#').split('\\t') if header_line else []
samples = cols[9:] if len(cols) > 9 else []

summary = {
    "format": "VCF",
    "num_variants": len(data_lines),
    "num_meta_lines": len(meta_lines),
    "chromosomes": dict(sorted(chromosomes.items(), key=lambda x: -x[1])[:10]),
    "variant_types": variant_types,
    "filter_counts": filter_counts,
    "samples": samples,
    "num_samples": len(samples),
    "columns": cols[:9],
}
print(json.dumps(summary, indent=2))
`;

    case 'bed':
      return `
import json
import numpy as np

content = """${safe}"""
lines = [l for l in content.strip().split('\\n') if l and not l.startswith(('track', 'browser', '#'))]

chromosomes = {}
lengths = []
strands = {'+': 0, '-': 0, '.': 0}
num_cols = 0

for line in lines:
    parts = line.split('\\t')
    if len(parts) < 3:
        continue
    num_cols = max(num_cols, len(parts))
    chrom = parts[0]
    try:
        start, end = int(parts[1]), int(parts[2])
        length = end - start
        lengths.append(length)
        chromosomes[chrom] = chromosomes.get(chrom, 0) + 1
    except ValueError:
        continue
    if len(parts) > 5:
        strand = parts[5].strip()
        if strand in strands:
            strands[strand] += 1

total_bases = int(sum(lengths)) if lengths else 0
summary = {
    "format": "BED",
    "num_intervals": len(lines),
    "num_columns": num_cols,
    "chromosomes": dict(sorted(chromosomes.items(), key=lambda x: -x[1])[:10]),
    "total_bases_covered": total_bases,
    "min_interval_length": int(min(lengths)) if lengths else 0,
    "max_interval_length": int(max(lengths)) if lengths else 0,
    "mean_interval_length": round(float(np.mean(lengths)), 1) if lengths else 0,
    "median_interval_length": round(float(np.median(lengths)), 1) if lengths else 0,
    "strand_counts": strands,
    "has_name_col": num_cols >= 4,
    "has_score_col": num_cols >= 5,
    "has_strand_col": num_cols >= 6,
}
print(json.dumps(summary, indent=2))
`;

    case 'gff':
      return `
import json

content = """${safe}"""
lines = [l for l in content.strip().split('\\n') if l and not l.startswith('#')]

feature_types = {}
chromosomes = {}
num_with_strand = 0

for line in lines:
    parts = line.split('\\t')
    if len(parts) < 9:
        continue
    seqid, source, ftype, start, end, score, strand = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6]
    feature_types[ftype] = feature_types.get(ftype, 0) + 1
    chromosomes[seqid] = chromosomes.get(seqid, 0) + 1
    if strand in ('+', '-'):
        num_with_strand += 1

summary = {
    "format": "GFF/GTF",
    "num_features": len(lines),
    "feature_types": dict(sorted(feature_types.items(), key=lambda x: -x[1])[:15]),
    "chromosomes_seqids": dict(sorted(chromosomes.items(), key=lambda x: -x[1])[:10]),
    "num_stranded_features": num_with_strand,
    "top_feature_type": max(feature_types, key=feature_types.get) if feature_types else None,
}
print(json.dumps(summary, indent=2))
`;

    case 'pdb':
      return `
import json
from io import StringIO
try:
    from Bio import PDB
    from Bio.PDB import PDBParser
except ImportError:
    print(json.dumps({"error": "Biopython not available"}))
    raise SystemExit

content = """${safe}"""
parser = PDBParser(QUIET=True)
try:
    structure = parser.get_structure('protein', StringIO(content))
except Exception as ex:
    print(json.dumps({"error": str(ex)}))
    raise SystemExit

models = list(structure.get_models())
chains = list(structure.get_chains())
residues = list(structure.get_residues())
atoms = list(structure.get_atoms())

chain_info = {}
for chain in chains:
    res_list = list(chain.get_residues())
    chain_info[chain.id] = len(res_list)

header = structure.header
summary = {
    "format": "PDB",
    "structure_id": structure.id,
    "name": header.get('name', 'Unknown'),
    "deposition_date": header.get('deposition_date', 'Unknown'),
    "resolution": header.get('resolution', 'Unknown'),
    "structure_method": header.get('structure_method', 'Unknown'),
    "num_models": len(models),
    "num_chains": len(chains),
    "num_residues": len(residues),
    "num_atoms": len(atoms),
    "chain_residue_counts": chain_info,
    "organism": header.get('source', {}).get('1', {}).get('organism_scientific', 'Unknown') if isinstance(header.get('source'), dict) else 'Unknown',
}
print(json.dumps(summary, indent=2))
`;

    default:
      return `print('Unsupported or unknown file format.')`;
  }
}

// Human-readable format label
export function bioFormatLabel(fmt: BioFormat): string {
  const labels: Record<BioFormat, string> = {
    fasta: 'FASTA — Sequence',
    fastq: 'FASTQ — Sequencing Reads',
    vcf: 'VCF — Variant Calls',
    bed: 'BED — Genomic Intervals',
    gff: 'GFF/GTF — Gene Features',
    pdb: 'PDB — Protein Structure',
    unknown: 'Unknown Format',
  };
  return labels[fmt];
}

// Format icon
export function bioFormatIcon(fmt: BioFormat): string {
  const icons: Record<BioFormat, string> = {
    fasta: '🧬',
    fastq: '🔬',
    vcf: '🧪',
    bed: '📍',
    gff: '🗺️',
    pdb: '⚛️',
    unknown: '📄',
  };
  return icons[fmt];
}

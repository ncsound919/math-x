// Builds a rich system context injection for Claude when a bio file has been parsed.
// The summary JSON + format metadata is embedded so Claude can reason about it.
import type { BioFileMeta } from './bioParser';

export function buildBioContext(meta: BioFileMeta, summary: Record<string, any>): string {
  if (summary.error) return '';

  return `
## Bioinformatics File Context
**Format:** ${meta.format.toUpperCase()} | **File:** ${meta.filename} | **Size:** ${meta.sizeKB.toFixed(1)} KB

### Parsed Summary (computed locally via Biopython/WASM)
\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\`

### Instructions
You have access to the above parsed bioinformatics data. When answering:
1. Reference specific numbers from the summary — be quantitative, not generic.
2. Connect statistical observations to biological interpretation (e.g. low Q30 rate → poor sequencing quality).
3. If the query requires deeper computation, generate Python code using Biopython/NumPy/SciPy.
4. Flag any quality concerns you detect in the metrics.
5. Suggest the most informative downstream analyses given this data type.
6. Apply your Cross-Domain Bridge — connect the mathematical structure to biological meaning.
`.trim();
}

// Build a natural language summary for the initial assistant greeting after file parse
export function buildBioGreeting(meta: BioFileMeta, summary: Record<string, any>): string {
  const fmt = meta.format.toUpperCase();
  if (summary.error) {
    return `I attempted to parse **${meta.filename}** as ${fmt} but encountered an error: ${summary.error}. Try uploading a valid ${fmt} file.`;
  }

  const lines: string[] = [
    `## 🧬 ${fmt} File Analyzed — \`${meta.filename}\``,
    `> Parsed entirely in your browser via Biopython/WASM — your data never left your device.`,
    '',
  ];

  switch (meta.format) {
    case 'fasta':
      lines.push(`Loaded **${summary.num_sequences?.toLocaleString()} sequences** totaling **${summary.total_bases?.toLocaleString()} bases**.`);
      lines.push(`- Length range: ${summary.min_length?.toLocaleString()} – ${summary.max_length?.toLocaleString()} bp (mean: ${summary.mean_length})`);
      lines.push(`- GC content: mean **${summary.mean_gc_percent}%** (range: ${summary.min_gc_percent}% – ${summary.max_gc_percent}%)`);
      break;
    case 'fastq':
      lines.push(`Loaded **${summary.num_reads?.toLocaleString()} reads** totaling **${summary.total_bases?.toLocaleString()} bases**.`);
      lines.push(`- Mean Phred quality: **Q${summary.mean_phred_quality}** | Reads passing Q30: **${summary.pct_passing_q30}%**`);
      lines.push(`- Mean GC: **${summary.mean_gc_percent}%** | Read length: ${summary.min_read_length}–${summary.max_read_length} bp`);
      if (summary.pct_passing_q30 < 70) {
        lines.push(`\n⚠️ **Quality note:** ${100 - summary.pct_passing_q30}% of reads fall below Q30. Consider quality trimming before downstream analysis.`);
      }
      break;
    case 'vcf':
      lines.push(`Loaded **${summary.num_variants?.toLocaleString()} variants** across **${Object.keys(summary.chromosomes || {}).length} chromosomes**.`);
      lines.push(`- Variant types: SNP=${summary.variant_types?.SNP?.toLocaleString()}, INDEL=${summary.variant_types?.INDEL?.toLocaleString()}, MNP=${summary.variant_types?.MNP?.toLocaleString()}`);
      lines.push(`- Samples: **${summary.num_samples}** | PASS filter: **${summary.filter_counts?.PASS?.toLocaleString() || 0}** variants`);
      break;
    case 'bed':
      lines.push(`Loaded **${summary.num_intervals?.toLocaleString()} genomic intervals** covering **${summary.total_bases_covered?.toLocaleString()} total bases**.`);
      lines.push(`- Interval length: min=${summary.min_interval_length?.toLocaleString()}, max=${summary.max_interval_length?.toLocaleString()}, mean=${summary.mean_interval_length} bp`);
      lines.push(`- Chromosomes represented: ${Object.keys(summary.chromosomes || {}).length}`);
      break;
    case 'gff':
      lines.push(`Loaded **${summary.num_features?.toLocaleString()} genomic features** across **${Object.keys(summary.chromosomes_seqids || {}).length} sequences**.`);
      lines.push(`- Top feature type: **${summary.top_feature_type}** | Total types: ${Object.keys(summary.feature_types || {}).length}`);
      break;
    case 'pdb':
      lines.push(`Structure **${summary.structure_id}**: ${summary.num_chains} chains, ${summary.num_residues?.toLocaleString()} residues, ${summary.num_atoms?.toLocaleString()} atoms.`);
      lines.push(`- Method: ${summary.structure_method} | Resolution: ${summary.resolution} | Deposited: ${summary.deposition_date}`);
      if (summary.name && summary.name !== 'Unknown') lines.push(`- Name: *${summary.name}*`);
      break;
  }

  lines.push('');
  lines.push('What would you like to explore? Use the suggested questions below or ask anything.');
  return lines.join('\n');
}

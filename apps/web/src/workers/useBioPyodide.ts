/**
 * useBioPyodide — bioinformatics file parsing hook.
 * Previously spawned its own Pyodide runtime (40-60MB).
 * Now uses the shared PyodideWorkerManager and requests bio packages on demand.
 */
import { useState, useEffect, useCallback } from 'react'
import { getPyodideManager } from './PyodideWorkerManager'

export type BioFileType = 'fasta' | 'fastq' | 'vcf' | 'pdb' | 'bed' | 'gff3' | 'sam' | 'csv' | 'tsv' | 'unknown'

export interface BioParseResult {
  summary: string
  stats: Record<string, unknown>
  preview?: string
  error?: string
}

const BIO_PACKAGES = ['pandas', 'biopython']

/**
 * Detect bio file type from filename and first line of content.
 * Kept in sync with bioParser.ts — consolidate into math-core when that migration runs.
 */
export function detectFileType(filename: string, content: string): BioFileType {
  const lower = filename.toLowerCase()
  const first = content.split('\n')[0].trim()

  if (/\.(fa|fasta|fna|faa|ffn)$/.test(lower)) return 'fasta'
  if (/\.(fq|fastq)$/.test(lower))              return 'fastq'
  if (lower.endsWith('.vcf'))                    return 'vcf'
  if (/\.(pdb|ent)$/.test(lower))               return 'pdb'
  if (lower.endsWith('.bed'))                    return 'bed'
  if (/\.(gff|gff3|gtf)$/.test(lower))          return 'gff3'
  if (lower.endsWith('.sam'))                    return 'sam'
  if (lower.endsWith('.csv'))                    return 'csv'
  if (lower.endsWith('.tsv'))                    return 'tsv'

  // Content sniff
  if (first.startsWith('>'))                         return 'fasta'
  if (first.startsWith('@'))                         return 'fastq'
  if (first.startsWith('##fileformat=VCF'))          return 'vcf'
  if (/^(ATOM|HETATM|HEADER)/.test(first))          return 'pdb'

  return 'unknown'
}

export function useBioPyodide() {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bioPackagesLoaded, setBioPackagesLoaded] = useState(false)

  useEffect(() => {
    const manager = getPyodideManager()

    const ensureBioPackages = async () => {
      try {
        // Wait for base Pyodide to be ready
        await manager.run('pass')
        setReady(true)
        setLoading(false)

        // Load bio-specific packages in the background
        // Don't block the "ready" state on biopython — it's slow to install
        manager.loadPackages(BIO_PACKAGES)
          .then(() => setBioPackagesLoaded(true))
          .catch(err => console.warn('[useBioPyodide] Bio package load failed:', err))
      } catch (err) {
        console.error('[useBioPyodide] Pyodide init failed:', err)
        setLoading(false)
      }
    }

    ensureBioPackages()
  }, [])

  const parseFile = useCallback(async (
    filename: string,
    content: string,
  ): Promise<BioParseResult> => {
    const manager = getPyodideManager()

    // Warn if biopython isn't loaded yet but proceed — Python code handles ImportError
    if (!bioPackagesLoaded) {
      console.warn('[useBioPyodide] Bio packages still loading — parse may fail for some formats')
    }

    // Truncate large files to avoid WASM OOM
    const MAX_CHARS = 200_000
    const safeContent = content.length > MAX_CHARS
      ? content.slice(0, MAX_CHARS)
      : content

    // Build a safe Python string literal — escape backslashes and triple-quotes
    const escaped = safeContent
      .replace(/\\/g, '\\\\')
      .replace(/"""/g, '\\"\\"\\"')

    const code = buildParseCode(filename, escaped)

    try {
      const stdout = await manager.run(code)
      const parsed = JSON.parse(stdout)

      // Surface any Python-level errors cleanly
      if (parsed.error) {
        return {
          summary: `Parse error: ${parsed.error}`,
          stats: {},
          error: parsed.error,
        }
      }

      return {
        summary: buildSummaryString(parsed),
        stats: parsed,
        preview: parsed.first_3_ids?.join(' · ') ?? parsed.samples?.join(' · '),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { summary: `Failed to parse ${filename}`, stats: {}, error: message }
    }
  }, [bioPackagesLoaded])

  return { ready, loading, parseFile }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSummaryString(stats: Record<string, unknown>): string {
  const fmt = String(stats.format ?? 'Unknown')
  const entries = Object.entries(stats)
    .filter(([k, v]) => k !== 'format' && (typeof v === 'number' || typeof v === 'string'))
    .slice(0, 4)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
  return `${fmt} — ${entries.join(' · ')}`
}

/**
 * Minimal parse code per format.
 * Full analysis code lives in bioParser.ts (generateBioAnalysisCode).
 * This is a slimmed version for the quick summary shown in the dropzone.
 */
function buildParseCode(filename: string, escaped: string): string {
  const lower = filename.toLowerCase()

  if (/\.(fa|fasta|fna|faa)$/.test(lower) || escaped.trimStart().startsWith('>')) {
    return `
import json
from io import StringIO
try:
    from Bio import SeqIO
    from Bio.SeqUtils import gc_fraction
    import numpy as np
    content = """${escaped}"""
    records = list(SeqIO.parse(StringIO(content), 'fasta'))
    lens = [len(r.seq) for r in records]
    gc = [round(gc_fraction(r.seq)*100, 2) for r in records]
    print(json.dumps({
        "format": "FASTA",
        "num_sequences": len(records),
        "total_bases": int(sum(lens)),
        "mean_length": round(float(np.mean(lens)), 1) if lens else 0,
        "mean_gc_percent": round(float(np.mean(gc)), 2) if gc else 0,
        "first_3_ids": [r.id for r in records[:3]],
    }))
except ImportError:
    print(json.dumps({"error": "Biopython not installed", "format": "FASTA"}))
`
  }

  if (/\.(fq|fastq)$/.test(lower) || escaped.trimStart().startsWith('@')) {
    return `
import json
from io import StringIO
try:
    from Bio import SeqIO
    import numpy as np
    content = """${escaped}"""
    records = list(SeqIO.parse(StringIO(content), 'fastq'))
    quals = [float(np.mean(r.letter_annotations['phred_quality'])) for r in records]
    print(json.dumps({
        "format": "FASTQ",
        "num_reads": len(records),
        "mean_phred_quality": round(float(np.mean(quals)), 2) if quals else 0,
        "pct_passing_q30": round(100*sum(1 for q in quals if q>=30)/len(quals), 1) if quals else 0,
        "first_3_ids": [r.id for r in records[:3]],
    }))
except ImportError:
    print(json.dumps({"error": "Biopython not installed", "format": "FASTQ"}))
`
  }

  // Generic fallback — return line/character count
  return `
import json
content = """${escaped}"""
lines = [l for l in content.split('\\n') if l.strip()]
print(json.dumps({
    "format": "Unknown",
    "filename": "${filename.replace(/"/g, '')}",
    "num_lines": len(lines),
    "num_chars": len(content),
}))
`
}

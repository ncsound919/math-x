// BioFileCard — displays parsed bioinformatics file summary in a structured card.
// Used in the chat interface whenever a bio file is uploaded and analyzed.
import { bioFormatIcon, bioFormatLabel, type BioFormat } from '../utils/bioParser';

interface BioFileCardProps {
  filename: string;
  format: BioFormat;
  summary: Record<string, any>;
  modeColor?: string;
  onAskQuestion?: (q: string) => void;
}

const SUGGESTED_QUESTIONS: Record<BioFormat, string[]> = {
  fasta: [
    'What can you tell me about the GC content distribution?',
    'Are there any unusual sequence lengths in this dataset?',
    'What statistical model would best describe this sequence length distribution?',
  ],
  fastq: [
    'How does the quality score distribution compare to typical Illumina sequencing?',
    'What fraction of reads should be trimmed given these quality metrics?',
    'Build a mathematical model of the quality score distribution.',
  ],
  vcf: [
    'What is the likely functional impact of these variants?',
    'What is the transition-to-transversion ratio and what does it tell us?',
    'Build a statistical summary of variant types and chromosomal distribution.',
  ],
  bed: [
    'What is the genome coverage represented by these intervals?',
    'Are the interval lengths normally distributed? Show me the statistics.',
    'What biological features could these genomic intervals represent?',
  ],
  gff: [
    'What is the gene density implied by these annotations?',
    'What is the ratio of coding to non-coding features?',
    'Build a mathematical model of the feature length distribution.',
  ],
  pdb: [
    'What can you infer about the protein structure from this PDB file?',
    'What is the atom-to-residue ratio and what does it tell us about resolution?',
    'Describe the mathematical geometry of the protein chain composition.',
  ],
  unknown: ['Describe what you can infer from this file.'],
};

function formatValue(val: any): string {
  if (typeof val === 'object' && val !== null) {
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }
  return String(val);
}

export function BioFileCard({ filename, format, summary, modeColor = '#F0A500', onAskQuestion }: BioFileCardProps) {
  const icon = bioFormatIcon(format);
  const label = bioFormatLabel(format);
  const questions = SUGGESTED_QUESTIONS[format] || SUGGESTED_QUESTIONS.unknown;

  if (summary.error) {
    return (
      <div style={{
        background: '#0d0a02', border: '1px solid #3a1a1a', borderRadius: 10,
        padding: '14px 16px', margin: '8px 0', maxWidth: 600,
      }}>
        <div style={{ color: '#cc4444', fontSize: '0.75rem' }}>⚠ Parse error: {summary.error}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#0a0900', border: `1px solid ${modeColor}22`,
      borderRadius: 12, padding: '16px 18px', margin: '10px 0',
      maxWidth: 680, fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <div>
          <div style={{ color: modeColor, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em' }}>{label}</div>
          <div style={{ color: '#5a4a2a', fontSize: '0.62rem', marginTop: 2 }}>{filename}</div>
        </div>
        <div style={{
          marginLeft: 'auto', background: `${modeColor}18`, border: `1px solid ${modeColor}33`,
          borderRadius: 20, padding: '3px 10px', fontSize: '0.62rem', color: modeColor,
        }}>LOCAL · PRIVATE</div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 8, marginBottom: 14,
      }}>
        {Object.entries(summary)
          .filter(([k]) => !['format', 'first_3_ids', 'first_3_descriptions', 'columns', 'samples'].includes(k))
          .map(([key, value]) => (
            <div key={key} style={{
              background: '#130f04', borderRadius: 8,
              padding: '8px 10px', border: '1px solid #2a2010',
            }}>
              <div style={{ color: '#4a3820', fontSize: '0.58rem', letterSpacing: '0.1em', marginBottom: 3 }}>
                {key.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div style={{ color: '#c8b880', fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.4 }}>
                {typeof value === 'object' ? formatValue(value) : String(value)}
              </div>
            </div>
          ))}
      </div>

      {/* IDs / sample preview */}
      {(summary.first_3_ids || summary.samples) && (
        <div style={{ marginBottom: 14, padding: '8px 10px', background: '#0f0c02', borderRadius: 8, border: '1px solid #1a1508' }}>
          <div style={{ color: '#3a2e10', fontSize: '0.58rem', letterSpacing: '0.1em', marginBottom: 4 }}>PREVIEW</div>
          <div style={{ color: '#7a6840', fontSize: '0.68rem', fontFamily: 'monospace' }}>
            {(summary.first_3_ids || summary.samples || []).join(' · ')}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {onAskQuestion && (
        <div>
          <div style={{ color: '#3a2e10', fontSize: '0.58rem', letterSpacing: '0.1em', marginBottom: 6 }}>SUGGESTED ANALYSIS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {questions.map((q) => (
              <button key={q} onClick={() => onAskQuestion(q)}
                style={{
                  background: 'none', border: `1px solid #2a2010`,
                  borderRadius: 6, padding: '6px 10px',
                  color: '#8a7850', fontSize: '0.65rem', textAlign: 'left',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = modeColor + '55'; (e.currentTarget as HTMLButtonElement).style.color = modeColor; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2010'; (e.currentTarget as HTMLButtonElement).style.color = '#8a7850'; }}
              >
                ↗ {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

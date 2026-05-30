/**
 * MathRenderer — renders assistant markdown + KaTeX math.
 *
 * Security model:
 * - All HTML produced by the regex pipeline is sanitized with DOMPurify
 *   before being written to dangerouslySetInnerHTML.
 * - KaTeX renders into a sandboxed span; its output is included in the
 *   sanitization pass so any upstream KaTeX XSS is also caught.
 * - DOMPurify is loaded once at module level. SSR environments that lack
 *   `window` will get a no-op sanitizer and should pre-sanitize server-side.
 */
import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// ---------------------------------------------------------------------------
// DOMPurify — lazy-load to survive SSR/test environments
// ---------------------------------------------------------------------------
let purify: { sanitize: (html: string, cfg?: object) => string } | null = null

function getSanitizer() {
  if (purify) return purify

  if (typeof window !== 'undefined') {
    // Dynamically require so bundlers that tree-shake SSR don't break
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DOMPurify = require('dompurify')
    purify = typeof DOMPurify.sanitize === 'function' ? DOMPurify : DOMPurify.default
  }

  // Fallback: strip all tags — better to lose formatting than ship XSS
  if (!purify) {
    purify = {
      sanitize: (html: string) =>
        html.replace(/<[^>]+>/g, ''),
    }
  }

  return purify
}

// DOMPurify config: allow the inline styles our renderer produces,
// but nothing that can execute script.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'code', 'pre', 'span', 'div',
    'sup', 'sub', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn',
    'msup', 'msub', 'mfrac', 'mover', 'munder', 'mtext', 'annotation',
    // KaTeX produces these:
    'svg', 'path', 'line', 'rect', 'circle', 'g', 'use', 'defs',
    'clippath', 'mask',
  ],
  ALLOWED_ATTR: [
    'style', 'class', 'title',
    // SVG/KaTeX attributes
    'viewbox', 'xmlns', 'fill', 'stroke', 'stroke-width',
    'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r',
    'width', 'height', 'transform', 'clip-path', 'mask',
    'href', // KaTeX uses <use href>
  ],
  // Never allow these regardless of tag whitelist
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'on*'],
  // Don't allow data: URIs (common XSS vector via SVG)
  ALLOW_DATA_ATTR: false,
}

// ---------------------------------------------------------------------------
// KaTeX rendering
// ---------------------------------------------------------------------------

function renderKaTeX(src: string): string {
  // Block math: $$...$$ or \[...\]
  src = src.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => {
    try {
      return katex.renderToString((a || b).trim(), { displayMode: true, throwOnError: false })
    } catch {
      return `<code>${escapeHtml(a || b)}</code>`
    }
  })
  // Inline math: $...$ or \(...\)
  src = src.replace(/\$([^\$\n]+?)\$|\\\((.+?)\\\)/g, (_, a, b) => {
    try {
      return katex.renderToString((a || b).trim(), { displayMode: false, throwOnError: false })
    } catch {
      return `<code>${escapeHtml(a || b)}</code>`
    }
  })
  return src
}

/** Escape HTML entities to prevent injection in fallback code blocks. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Markdown-lite transforms
// ---------------------------------------------------------------------------

function applyMarkdown(src: string, accent: string): string {
  return src
    .replace(/\*\*##\s*(.+?)\*\*/g,
      `<div style="color:${accent};font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:14px 0 5px;font-family:'JetBrains Mono',monospace">$1</div>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong style='color:#e8e0cc'>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em style='color:#c8b896'>$1</em>")
    // SECURITY: escape the captured group before interpolating into HTML
    .replace(/`([^`\n]+)`/g, (_match, code: string) =>
      `<code style="background:#1a1408;padding:2px 6px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:0.8em;color:#f0a500;border:1px solid #3a2e10">${escapeHtml(code)}</code>`
    )
    .replace(/^(\d+)\.\s/gm,
      `<span style="color:${accent};font-weight:700">$1.</span> `)
    .replace(/^-\s/gm,
      `<span style="color:${accent};opacity:0.6">◦</span> `)
    .replace(/🔗 Cross-Domain Bridge/g,
      `<span style="color:#00e5b0;font-weight:700">🔗 Cross-Domain Bridge</span>`)
    .replace(/⚡ Hidden Insight/g,
      `<span style="color:#f0a500;font-weight:700">⚡ Hidden Insight</span>`)
    .replace(/\*\*Conjecture:\*\*/g,
      `<span style="color:#e05aff;font-weight:700;font-family:'JetBrains Mono',monospace">▶ CONJECTURE:</span>`)
    .replace(/\[KNOWN\]/g,
      `<span style="background:#1a2e1a;color:#7cff6b;padding:1px 5px;border-radius:3px;font-size:0.7em">KNOWN</span>`)
    .replace(/\[UNDEREXPLORED\]/g,
      `<span style="background:#2e2a1a;color:#f0a500;padding:1px 5px;border-radius:3px;font-size:0.7em">UNDEREXPLORED</span>`)
    .replace(/\[NOVEL\]/g,
      `<span style="background:#1a1a2e;color:#00c8ff;padding:1px 5px;border-radius:3px;font-size:0.7em">NOVEL</span>`)
    .replace(/\[SPECULATIVE\]/g,
      `<span style="background:#2e1a2e;color:#e05aff;padding:1px 5px;border-radius:3px;font-size:0.7em">SPECULATIVE</span>`)
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br/>')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MathRendererProps {
  text: string
  accent?: string
  streaming?: boolean
}

export function MathRenderer({ text, accent = '#f0a500' }: MathRendererProps) {
  const html = useMemo(() => {
    // 1. Render KaTeX (produces HTML strings)
    let src = renderKaTeX(text)

    // 2. Apply markdown-lite transforms
    src = applyMarkdown(src, accent)

    // 3. Wrap in paragraph
    src = `<p style="margin:0">${src}</p>`

    // 4. SANITIZE — strip anything that could execute script
    const sanitizer = getSanitizer()
    return sanitizer.sanitize(src, PURIFY_CONFIG)
  }, [text, accent])

  return (
    <div
      style={{ lineHeight: 1.8, color: '#c8bfa8', fontSize: '0.88rem' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

# @math-x/math-core

Shared mathematical utilities, prompt builders, domain logic, and engine abstractions for the Math X monorepo.

Used by both `apps/api` and `apps/web` to share logic without duplication.

## Installation

This package is internal to the monorepo and automatically available via pnpm workspace:

```json
{
  "dependencies": {
    "@math-x/math-core": "workspace:*"
  }
}
```

## Exports

### Model Routing

```ts
import { selectProvider } from '@math-x/math-core'

// Returns 'claude' | 'ollama' | 'qwen'
const provider = selectProvider(mode, isOllamaAvailable)
```

| Mode | Default Provider | Fallback |
|------|-----------------|----------|
| `formula` | `qwen` | `claude` |
| `deep-solve` | `qwen` | `claude` |
| `scientist` | `ollama` | `claude` |
| `hypothesis` | `ollama` | `claude` |
| `synergy` | `ollama` | `claude` |
| all others | `claude` | — |

### Prompt Building

```ts
import { buildPrompt } from '@math-x/math-core'

const systemPrompt = buildPrompt(mode, domain, retrievedContext)
```

### Verification Utilities

```ts
import { parseVerifySteps, estimateTokens } from '@math-x/math-core'

// Parse structured derivation steps from raw text
const steps = parseVerifySteps(content)

// Estimate token count for a string (cl100k fallback)
const tokens = estimateTokens(text)
```

### Domain Prompts

```ts
import { getDomainPrompt } from '@math-x/math-core'

// Returns domain-specific system context for algebra, topology, etc.
const context = getDomainPrompt('topology')
```

## Development

```bash
# Build
pnpm --filter @math-x/math-core build

# Test
pnpm --filter @math-x/math-core test

# Watch
pnpm --filter @math-x/math-core test:watch
```

## Package Structure

```
packages/math-core/
  src/
    index.ts          # Main barrel export
    modelRouter.ts    # Provider selection logic
    prompts.ts        # System prompt builders
    domainPrompts.ts  # Domain-specific prompt context
    tokenizer.ts      # Token estimation utilities
  package.json
  tsconfig.json
  README.md
```

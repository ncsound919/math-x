import { z } from 'zod';

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      source: z.unknown().optional(),
    }))
  ]),
});

export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  mode: z.string().default('scientist'),
  domain: z.string().optional(),
  provider: z.enum(['claude', 'ollama', 'qwen', 'auto']).default('auto'),
  retrieved: z.array(z.object({
    source: z.string(),
    text: z.string(),
    score: z.number(),
  })).optional(),
  execution: z.object({
    stdout: z.string().optional(),
    error: z.string().optional(),
    chart: z.unknown().optional(),
    table: z.unknown().optional(),
  }).optional(),
});

export const ExportRequestSchema = z.object({
  content: z.string().min(1),
  format: z.enum(['markdown', 'latex', 'jupyter', 'plain']).default('markdown'),
  title: z.string().optional(),
  mode: z.string().optional(),
});

export const VerifyRequestSchema = z.object({
  expression: z.string().min(1),
  mode: z.enum(['algebraic', 'proof', 'calculus', 'linear_algebra']).default('algebraic'),
  domain: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

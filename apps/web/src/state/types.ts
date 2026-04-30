export interface PlotlySpec {
  data: unknown[];
  layout?: Record<string, unknown>;
}

export interface TableData {
  columns: string[];
  rows: unknown[][];
}

export interface LiteratureSnippet {
  id: string;
  title: string;
  authors: string[];
  url: string;
  score: number;
  published: string;
  source: 'arxiv' | 'pubmed';
  abstract?: string;
}

export interface HypothesisResult {
  conjecture: string;
  falsifiability: string;
  testCode: string;
  numericalResult?: string;
  symbolicResult?: string;
  verdict: 'supported' | 'refuted' | 'inconclusive' | 'pending';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
  streaming?: boolean;
  execution?: {
    stdout?: string;
    error?: string;
    chart?: PlotlySpec;
    table?: TableData;
    parsed?: unknown;
    code?: string;
  };
  plan?: Plan;
  literature?: LiteratureSnippet[];
  hypothesisResult?: HypothesisResult;
}

export interface Plan {
  requires_code: boolean;
  requires_chart: boolean;
  requires_retrieval: boolean;
  engine: string;
  domain?: string;
  complexity?: string;
  summary?: string;
}

export interface Mode {
  id: string;
  icon: string;
  label: string;
  color: string;
  desc: string;
}

export interface Session {
  id: string;
  name: string;
  mode: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

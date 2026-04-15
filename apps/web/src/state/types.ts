export interface Mode {
  id: string;
  icon: string;
  label: string;
  color: string;
  desc: string;
}

export interface Plan {
  engine: string;
  requires_code: boolean;
  requires_chart: boolean;
  requires_retrieval: boolean;
  domain: string;
  complexity: 'low' | 'medium' | 'high';
  summary: string;
}

export interface RetrievedChunk {
  source: string;
  text: string;
  score: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
  execution?: {
    stdout?: string;
    error?: string;
    parsed?: any;
  };
  plan?: Plan;
}

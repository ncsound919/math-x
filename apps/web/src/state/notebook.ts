export type NotebookCellType = 'markdown' | 'code' | 'ai';

export interface NotebookCell {
  id: string;
  type: NotebookCellType;
  content: string;
  output?: string;
  running?: boolean;
  error?: string;
}

export interface Notebook {
  id: string;
  name: string;
  cells: NotebookCell[];
  createdAt: number;
  updatedAt: number;
}
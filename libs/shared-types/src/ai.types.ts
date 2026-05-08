export type GenerationType = 'full_design' | 'element_modify';
export type GenerationStatus = 'pending' | 'streaming' | 'completed' | 'failed';

export interface AiGeneration {
  id: string;
  ownerId: string;
  projectId?: string;
  prompt: string;
  generationType: GenerationType;
  modelUsed: string;
  rawResponse?: string;
  parsedResult?: string;
  status: GenerationStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface AiModelInfo {
  name: string;
  modifiedAt: string;
  size: number;
}

export interface GenerateDesignRequest {
  prompt: string;
  canvasWidth?: number;
  canvasHeight?: number;
  model?: string;
}

export interface ModifyElementRequest {
  instruction: string;
  elementContexts: ElementContext[];
  model?: string;
}

export interface ElementContext {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}
export interface TaskDefinition {
  id: string;
  type: 'decode' | 'numeric' | 'choice' | 'sequence' | 'dependencySequence' | 'stationPlot' | 'stationBoard' | 'findError' | string;
  difficulty?: number;
  question: string;
  payload?: Record<string, unknown> & { options?: string[] };
  steps?: string[];
  correct_order?: number[];
  dependencies?: Array<[number, number]>;
  dependency_graph?: string;
  answer?: {
    kind: string;
    value?: unknown;
    unit?: string;
    tolerance?: number;
    placements?: Record<string, string>;
  };
  explanation?: string;
  principle_tags?: string[];
  sources?: Array<{ source_id: string; locator?: string }>;
  [key: string]: unknown;
}
export interface PublicTaskInstance {
  instanceId: string;
  definitionId: string;
  contentPack: string;
  type: string;
  difficulty: number;
  question: string;
  response: { kind: string; unit?: string | null };
  payload?: Record<string, unknown>;
}
export interface ValidationResult {
  correct: boolean;
  normalizedAnswer: unknown;
  correctAnswer: unknown;
  details?: Record<string, unknown>;
}
export function createTaskInstance(definition: TaskDefinition, options: { seed: number; instanceId: string; contentPack: string }): { publicTask: PublicTaskInstance; validationContext: Record<string, unknown> };
export function validateTaskAnswer(definition: TaskDefinition, validationContext: Record<string, unknown>, submitted: unknown): ValidationResult;
export function assertPublicTaskSafe(publicTask: PublicTaskInstance): true;

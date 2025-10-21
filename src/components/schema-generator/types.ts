export interface SchemaEntity {
  name: string;
  confidence: number;
  reasoning?: string;
  columns: Array<{
    name: string;
    type: string;
    primary_key?: boolean;
    nullable?: boolean;
    unique?: boolean;
    default?: string;
    references?: string;
  }>;
}

export interface GeneratedSchema {
  entities: SchemaEntity[];
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    on: string;
    confidence: number;
  }>;
  indexes?: Array<{
    table: string;
    columns: string[];
    reason: string;
  }>;
  warnings?: string[];
}

export type StepId = 'input' | 'preview' | 'edit' | 'creating';

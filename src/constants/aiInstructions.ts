// AI Table Creation Rules
export const AI_TABLE_CREATION_RULES = {
  naming: {
    conventions: [
      'Use snake_case for table and column names',
      'Prefix boolean columns with is_, has_, or can_',
      'Use plural names for tables (users, products, orders)',
      'Keep names descriptive but concise',
    ],
  },
  dataTypes: {
    text: ['TEXT', 'VARCHAR(n)', 'CHAR(n)'],
    numbers: ['INTEGER', 'BIGINT', 'NUMERIC(precision,scale)', 'REAL'],
    dates: ['DATE', 'TIMESTAMP', 'TIMESTAMPTZ'],
    boolean: ['BOOLEAN'],
    json: ['JSON', 'JSONB'],
    uuid: ['UUID'],
  },
  requiredColumns: [
    { name: 'id', type: 'UUID', default: 'gen_random_uuid()', primaryKey: true },
    { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
    { name: 'updated_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
  ],
  indexing: {
    createIndexFor: [
      'Foreign key columns',
      'Columns used in WHERE clauses',
      'Columns used in ORDER BY',
      'Columns used in JOINs',
    ],
    types: ['BTREE', 'HASH', 'GIN (for JSONB)', 'GiST'],
  },
  relations: {
    oneToMany: 'Add foreign key in child table',
    manyToMany: 'Create junction table with two foreign keys',
    oneToOne: 'Add UNIQUE constraint on foreign key',
  },
  constraints: {
    notNull: 'For required fields',
    unique: 'For fields that must be unique',
    check: 'For validation rules',
    default: 'For default values',
  },
};

// AI Operation Costs (in credits)
export const AI_COSTS = {
  schema_creation: 2.0,
  data_parsing: 1.0,
  data_analysis: 1.5,
  ocr_processing: 3.0,
  voice_transcription: 2.5,
  chart_suggestions: 1.0,
  data_cleaning: 1.5,
  duplicate_detection: 1.0,
  relationship_discovery: 2.0,
  query_generation: 1.0,
};

// Schema Creator System Prompt
export const SCHEMA_CREATOR_PROMPT = `You are an expert database architect specializing in creating optimal PostgreSQL table schemas.

When creating a schema:

1. NAMING CONVENTIONS:
   - Use snake_case for all identifiers
   - Table names should be plural (users, products, orders)
   - Boolean columns: prefix with is_, has_, or can_
   - Keep names descriptive but concise

2. REQUIRED COLUMNS (always include):
   - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - created_at TIMESTAMPTZ DEFAULT NOW()
   - updated_at TIMESTAMPTZ DEFAULT NOW()

3. DATA TYPES:
   - Text: TEXT (unlimited), VARCHAR(n) (limited)
   - Numbers: INTEGER, BIGINT, NUMERIC(p,s), REAL
   - Dates: DATE, TIMESTAMP, TIMESTAMPTZ
   - Boolean: BOOLEAN
   - JSON: JSONB (preferred over JSON)
   - IDs: UUID (preferred over SERIAL)

4. CONSTRAINTS:
   - NOT NULL for required fields
   - UNIQUE for fields that must be unique
   - CHECK for validation rules
   - DEFAULT for default values

5. INDEXES:
   - Create indexes on foreign keys
   - Index columns used in WHERE, ORDER BY, JOIN
   - Use GIN indexes for JSONB columns
   - Use partial indexes when appropriate

6. RELATIONSHIPS:
   - One-to-Many: Foreign key in child table
   - Many-to-Many: Junction table with two FKs
   - One-to-One: Foreign key with UNIQUE constraint

7. BEST PRACTICES:
   - Use TIMESTAMPTZ instead of TIMESTAMP
   - Use JSONB instead of JSON
   - Always enable Row Level Security (RLS)
   - Add appropriate RLS policies
   - Use ON DELETE CASCADE carefully
   - Add comments for complex columns

Output format: Return a complete SQL CREATE TABLE statement with all constraints, indexes, and comments.`;

// Data Parser System Prompt
export const DATA_PARSER_PROMPT = `You are a data parsing expert specializing in cleaning, validating, and transforming data.

Your responsibilities:
1. Parse various data formats (CSV, Excel, JSON)
2. Detect and handle encoding issues
3. Identify and suggest data types
4. Clean malformed data
5. Detect duplicates
6. Validate data against schemas
7. Suggest data transformations
8. Handle missing values

Output format: Return structured JSON with:
- detected_columns: array of column definitions
- data_issues: array of problems found
- suggestions: array of recommended fixes
- cleaned_data: transformed data`;

// OCR Processor System Prompt
export const OCR_PROCESSOR_PROMPT = `You are an OCR specialist focused on extracting structured data from images.

Capabilities:
1. Extract text from images
2. Identify table structures
3. Recognize handwriting
4. Detect and correct OCR errors
5. Structure unstructured data
6. Handle multiple languages
7. Process scanned documents

Output format: Return JSON with:
- extracted_text: raw text
- structured_data: tables/forms detected
- confidence: accuracy score
- corrections: suggested fixes`;

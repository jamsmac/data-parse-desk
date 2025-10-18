-- Update get_table_data RPC to support filters
CREATE OR REPLACE FUNCTION public.get_table_data(
  p_database_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_sort_column text DEFAULT NULL,
  p_sort_direction text DEFAULT 'asc',
  p_filters jsonb DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  data jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  total BIGINT;
  filter_key text;
  filter_value jsonb;
BEGIN
  -- Build filtered count
  SELECT COUNT(*) INTO total 
  FROM public.table_data td
  WHERE td.database_id = p_database_id
  AND (
    p_filters IS NULL 
    OR (
      SELECT bool_and(
        CASE 
          WHEN value->>'type' = 'text' THEN 
            (td.data->>key) ILIKE '%' || (value->>'value') || '%'
          WHEN value->>'type' = 'number' THEN
            CASE 
              WHEN value->>'operator' = '=' THEN (td.data->>key)::numeric = (value->>'value')::numeric
              WHEN value->>'operator' = '>' THEN (td.data->>key)::numeric > (value->>'value')::numeric
              WHEN value->>'operator' = '<' THEN (td.data->>key)::numeric < (value->>'value')::numeric
              WHEN value->>'operator' = '>=' THEN (td.data->>key)::numeric >= (value->>'value')::numeric
              WHEN value->>'operator' = '<=' THEN (td.data->>key)::numeric <= (value->>'value')::numeric
              ELSE true
            END
          WHEN value->>'type' = 'date' THEN
            CASE 
              WHEN value->>'operator' = 'after' THEN (td.data->>key)::date > (value->>'value')::date
              WHEN value->>'operator' = 'before' THEN (td.data->>key)::date < (value->>'value')::date
              WHEN value->>'operator' = 'equals' THEN (td.data->>key)::date = (value->>'value')::date
              ELSE true
            END
          ELSE true
        END
      )
      FROM jsonb_each(p_filters) AS filter(key, value)
    )
  );
  
  -- Return filtered and sorted results
  RETURN QUERY
  SELECT 
    td.id,
    td.data,
    td.created_at,
    td.updated_at,
    total
  FROM public.table_data td
  WHERE td.database_id = p_database_id
  AND (
    p_filters IS NULL 
    OR (
      SELECT bool_and(
        CASE 
          WHEN value->>'type' = 'text' THEN 
            (td.data->>key) ILIKE '%' || (value->>'value') || '%'
          WHEN value->>'type' = 'number' THEN
            CASE 
              WHEN value->>'operator' = '=' THEN (td.data->>key)::numeric = (value->>'value')::numeric
              WHEN value->>'operator' = '>' THEN (td.data->>key)::numeric > (value->>'value')::numeric
              WHEN value->>'operator' = '<' THEN (td.data->>key)::numeric < (value->>'value')::numeric
              WHEN value->>'operator' = '>=' THEN (td.data->>key)::numeric >= (value->>'value')::numeric
              WHEN value->>'operator' = '<=' THEN (td.data->>key)::numeric <= (value->>'value')::numeric
              ELSE true
            END
          WHEN value->>'type' = 'date' THEN
            CASE 
              WHEN value->>'operator' = 'after' THEN (td.data->>key)::date > (value->>'value')::date
              WHEN value->>'operator' = 'before' THEN (td.data->>key)::date < (value->>'value')::date
              WHEN value->>'operator' = 'equals' THEN (td.data->>key)::date = (value->>'value')::date
              ELSE true
            END
          ELSE true
        END
      )
      FROM jsonb_each(p_filters) AS filter(key, value)
    )
  )
  ORDER BY 
    CASE WHEN p_sort_column IS NOT NULL AND p_sort_direction = 'asc' 
      THEN td.data->>p_sort_column END ASC,
    CASE WHEN p_sort_column IS NOT NULL AND p_sort_direction = 'desc' 
      THEN td.data->>p_sort_column END DESC,
    td.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Create saved_charts table for analytics persistence
CREATE TABLE IF NOT EXISTS public.saved_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  name text NOT NULL,
  chart_config jsonb NOT NULL,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.saved_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved charts"
  ON public.saved_charts
  FOR ALL
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_charts_updated_at
  BEFORE UPDATE ON public.saved_charts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update ai_agents with system prompts
UPDATE public.ai_agents SET system_prompt = 'You are a database schema expert. Analyze the provided data structure and suggest optimal column types, relationships, and constraints. Focus on data normalization, performance, and best practices for relational databases.' WHERE agent_type = 'schema_creator';

UPDATE public.ai_agents SET system_prompt = 'You are a data parsing specialist. Parse and structure unstructured data into well-organized formats. Handle various file formats (CSV, Excel, JSON, XML), detect data types, clean data, and suggest appropriate transformations.' WHERE agent_type = 'data_parser';

UPDATE public.ai_agents SET system_prompt = 'You are an OCR expert. Extract text and structured data from images and scanned documents with high accuracy. Identify tables, forms, and key-value pairs. Handle multiple languages and various document layouts.' WHERE agent_type = 'ocr_processor';

UPDATE public.ai_agents SET system_prompt = 'You are a voice transcription expert. Convert speech to text with high accuracy. Identify speakers, handle multiple languages, and format transcripts for readability. Extract action items and key points from conversations.' WHERE agent_type = 'voice_transcriber';

UPDATE public.ai_agents SET system_prompt = 'You are a data analytics advisor. Analyze datasets and provide insights, trends, and recommendations. Suggest relevant visualizations, identify patterns, anomalies, and correlations. Help users understand their data better.' WHERE agent_type = 'analytics_advisor';

UPDATE public.ai_agents SET system_prompt = 'You are a chart building expert. Recommend the best chart types for different data sets and analytical goals. Suggest axes, aggregations, filters, and styling options. Create meaningful and visually appealing data visualizations.' WHERE agent_type = 'chart_builder';
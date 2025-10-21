-- Add parent_id column to comments table for nested replies
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_database_id ON public.comments(database_id);
CREATE INDEX IF NOT EXISTS idx_comments_row_id ON public.comments(row_id);

-- Add comment to explain the column
COMMENT ON COLUMN public.comments.parent_id IS 'Reference to parent comment for nested replies';

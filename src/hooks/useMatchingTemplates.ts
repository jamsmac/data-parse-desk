/**
 * Hook for managing Smart Matching Templates
 * Provides CRUD operations and template application
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MatchingRule {
  sourceColumn: string;
  targetColumn: string;
  strategy: 'exact' | 'fuzzy' | 'soundex' | 'time' | 'composite';
  weight: number;
  threshold?: number;
}

export interface MatchingWeights {
  exact: number;
  fuzzy: number;
  soundex: number;
  time: number;
  pattern: number;
}

export interface MatchingTemplate {
  id: string;
  name: string;
  description?: string;
  rules: MatchingRule[];
  weights: MatchingWeights;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  usage_count: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  rules: MatchingRule[];
  weights: MatchingWeights;
  is_public?: boolean;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

/**
 * Fetch all templates (user's own + public)
 */
export function useMatchingTemplates() {
  return useQuery({
    queryKey: ['matching-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matching_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as MatchingTemplate[];
    },
  });
}

/**
 * Fetch a single template by ID
 */
export function useMatchingTemplate(id: string | null) {
  return useQuery({
    queryKey: ['matching-template', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('matching_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as MatchingTemplate;
    },
    enabled: !!id,
  });
}

/**
 * Create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from('matching_templates')
        .insert({
          name: input.name,
          description: input.description,
          rules: input.rules,
          weights: input.weights,
          is_public: input.is_public || false,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MatchingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-templates'] });
      toast.success('Template saved successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create template:', error);
      toast.error('Failed to save template');
    },
  });
}

/**
 * Update an existing template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('matching_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MatchingTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matching-templates'] });
      queryClient.invalidateQueries({ queryKey: ['matching-template', data.id] });
      toast.success('Template updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    },
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('matching_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    },
  });
}

/**
 * Increment template usage count
 */
export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.rpc('increment_template_usage', {
        template_id: templateId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-templates'] });
    },
    onError: (error: any) => {
      console.error('Failed to increment usage:', error);
    },
  });
}

/**
 * Apply a template to matching wizard
 */
export function useApplyTemplate() {
  const incrementUsage = useIncrementTemplateUsage();

  return {
    applyTemplate: (
      template: MatchingTemplate,
      onApply: (rules: MatchingRule[], weights: MatchingWeights) => void
    ) => {
      onApply(template.rules, template.weights);
      incrementUsage.mutate(template.id);
      toast.success(`Applied template: ${template.name}`);
    },
  };
}

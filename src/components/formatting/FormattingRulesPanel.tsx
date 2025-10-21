import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Palette, Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import type { FormattingRule, ConditionType } from '@/utils/conditionalFormatting';

interface FormattingRulesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId?: string;
  compositeViewId?: string;
  columns: string[];
}

const CONDITION_TYPES: { value: ConditionType; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'greater_or_equal', label: '>=' },
  { value: 'less_or_equal', label: '<=' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
  { value: 'between', label: 'Between' },
  { value: 'in_list', label: 'In list' },
];

export const FormattingRulesPanel = ({
  open,
  onOpenChange,
  databaseId,
  compositeViewId,
  columns,
}: FormattingRulesPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // New rule state
  const [newRule, setNewRule] = useState({
    name: '',
    column_name: columns[0] || '',
    condition_type: 'equals' as ConditionType,
    condition_value: '',
    background: '#22c55e',
    text: '#ffffff',
    bold: false,
    italic: false,
    apply_to_row: false,
  });

  // Load formatting rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['formatting-rules', databaseId, compositeViewId],
    queryFn: async () => {
      let query = supabase
        .from('conditional_formatting_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (databaseId) {
        query = query.eq('database_id', databaseId);
      } else if (compositeViewId) {
        query = query.eq('composite_view_id', compositeViewId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FormattingRule[];
    },
    enabled: open && !!(databaseId || compositeViewId),
  });

  // Create rule
  const createRuleMutation = useMutation({
    mutationFn: async (rule: typeof newRule) => {
      const { error } = await supabase
        .from('conditional_formatting_rules')
        .insert({
          user_id: user?.id,
          database_id: databaseId,
          composite_view_id: compositeViewId,
          name: rule.name,
          column_name: rule.column_name,
          condition_type: rule.condition_type,
          condition_value: parseConditionValue(rule.condition_type, rule.condition_value),
          format_config: {
            background: rule.background,
            text: rule.text,
            bold: rule.bold,
            italic: rule.italic,
          },
          apply_to_row: rule.apply_to_row,
          priority: (rules?.length || 0),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formatting-rules'] });
      setIsAdding(false);
      setNewRule({
        name: '',
        column_name: columns[0] || '',
        condition_type: 'equals',
        condition_value: '',
        background: '#22c55e',
        text: '#ffffff',
        bold: false,
        italic: false,
        apply_to_row: false,
      });
      toast({ description: 'Formatting rule created' });
    },
  });

  // Delete rule
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('conditional_formatting_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formatting-rules'] });
      toast({ description: 'Rule deleted' });
    },
  });

  // Toggle active state
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('conditional_formatting_rules')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formatting-rules'] });
    },
  });

  // Move rule priority
  const movePriorityMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      if (!rules) return;

      const currentIndex = rules.findIndex(r => r.id === id);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= rules.length) return;

      // Swap priorities
      const updates = [
        { id: rules[currentIndex].id, priority: targetIndex },
        { id: rules[targetIndex].id, priority: currentIndex },
      ];

      for (const update of updates) {
        await supabase
          .from('conditional_formatting_rules')
          .update({ priority: update.priority })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formatting-rules'] });
    },
  });

  const parseConditionValue = (type: ConditionType, value: string) => {
    if (type === 'is_empty' || type === 'is_not_empty') return null;
    if (type === 'in_list') return value.split(',').map(v => v.trim());
    if (type === 'between') {
      const [min, max] = value.split(',').map(v => v.trim());
      return { min: Number(min), max: Number(max) };
    }
    if (type === 'greater_than' || type === 'less_than' || type === 'greater_or_equal' || type === 'less_or_equal') {
      return Number(value);
    }
    return value;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Conditional Formatting
          </SheetTitle>
          <SheetDescription>
            Create rules to automatically format cells based on their values
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {/* Existing Rules */}
          <div className="space-y-3 mb-6">
            {rules?.map((rule, index) => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: rule.format_config.background }}
                        />
                        {rule.name}
                        {!rule.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {rule.column_name} {rule.condition_type} {JSON.stringify(rule.condition_value)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => movePriorityMutation.mutate({ id: rule.id, direction: 'up' })}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => movePriorityMutation.mutate({ id: rule.id, direction: 'down' })}
                        disabled={index === (rules?.length || 0) - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: rule.id, isActive: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {rule.is_active ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Rule */}
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">New Formatting Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="e.g., Highlight high values"
                  />
                </div>

                <div>
                  <Label>Column</Label>
                  <Select
                    value={newRule.column_name}
                    onValueChange={(value) => setNewRule({ ...newRule, column_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select
                    value={newRule.condition_type}
                    onValueChange={(value) =>
                      setNewRule({ ...newRule, condition_type: value as ConditionType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newRule.condition_type !== 'is_empty' &&
                  newRule.condition_type !== 'is_not_empty' && (
                    <div>
                      <Label>Value</Label>
                      <Input
                        value={newRule.condition_value}
                        onChange={(e) => setNewRule({ ...newRule, condition_value: e.target.value })}
                        placeholder={
                          newRule.condition_type === 'between'
                            ? 'min, max'
                            : newRule.condition_type === 'in_list'
                            ? 'value1, value2, value3'
                            : 'value'
                        }
                      />
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Background Color</Label>
                    <Input
                      type="color"
                      value={newRule.background}
                      onChange={(e) => setNewRule({ ...newRule, background: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Text Color</Label>
                    <Input
                      type="color"
                      value={newRule.text}
                      onChange={(e) => setNewRule({ ...newRule, text: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRule.bold}
                      onCheckedChange={(checked) => setNewRule({ ...newRule, bold: checked })}
                    />
                    <Label>Bold</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRule.italic}
                      onCheckedChange={(checked) => setNewRule({ ...newRule, italic: checked })}
                    />
                    <Label>Italic</Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newRule.apply_to_row}
                    onCheckedChange={(checked) => setNewRule({ ...newRule, apply_to_row: checked })}
                  />
                  <Label>Apply to entire row</Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => createRuleMutation.mutate(newRule)}
                    disabled={!newRule.name || createRuleMutation.isPending}
                  >
                    Create Rule
                  </Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

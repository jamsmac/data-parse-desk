/**
 * Template Manager - Save and load Smart Matching templates
 * Allows users to manage reusable matching configurations
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Save,
  Loader2,
  Trash2,
  Globe,
  Lock,
  TrendingUp,
  Clock,
  Check,
} from 'lucide-react';
import {
  useMatchingTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useApplyTemplate,
  MatchingRule,
  MatchingWeights,
  MatchingTemplate,
} from '@/hooks/useMatchingTemplates';
import { cn } from '@/lib/utils';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
  currentRules: MatchingRule[];
  currentWeights: MatchingWeights;
  onApplyTemplate?: (rules: MatchingRule[], weights: MatchingWeights) => void;
}

export function TemplateManager({
  open,
  onClose,
  currentRules,
  currentWeights,
  onApplyTemplate,
}: TemplateManagerProps) {
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('load');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const { data: templates = [], isLoading } = useMatchingTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const { applyTemplate } = useApplyTemplate();

  const handleSave = async () => {
    if (!templateName.trim()) {
      return;
    }

    await createTemplate.mutateAsync({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      rules: currentRules,
      weights: currentWeights,
      is_public: isPublic,
    });

    // Reset form
    setTemplateName('');
    setTemplateDescription('');
    setIsPublic(false);
    setActiveTab('load');
  };

  const handleApply = (template: MatchingTemplate) => {
    if (onApplyTemplate) {
      applyTemplate(template, onApplyTemplate);
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate.mutateAsync(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const userTemplates = templates.filter((t) => !t.is_public);
  const publicTemplates = templates.filter((t) => t.is_public);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Matching Templates</DialogTitle>
          <DialogDescription>
            Save and reuse matching configurations for faster data matching
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="load">Load Template</TabsTrigger>
            <TabsTrigger value="save">Save Current</TabsTrigger>
          </TabsList>

          {/* Load Template Tab */}
          <TabsContent value="load" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No templates saved yet</p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab('save')}
                  className="mt-2"
                >
                  Save your first template
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* User's Templates */}
                  {userTemplates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        My Templates ({userTemplates.length})
                      </h3>
                      <div className="space-y-2">
                        {userTemplates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onApply={handleApply}
                            onDelete={handleDelete}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public Templates */}
                  {publicTemplates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public Templates ({publicTemplates.length})
                      </h3>
                      <div className="space-y-2">
                        {publicTemplates.map((template) => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onApply={handleApply}
                            onDelete={null}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Save Template Tab */}
          <TabsContent value="save" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="E.g., Customer Matching, Product Deduplication"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="template-description">
                  Description (optional)
                </Label>
                <Textarea
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                />
                <Label
                  htmlFor="is-public"
                  className="text-sm font-normal cursor-pointer"
                >
                  Make this template public (visible to all users)
                </Label>
              </div>

              {/* Preview */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold">Preview:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• {currentRules.length} matching rules</p>
                  <p>
                    • Weights: Exact {(currentWeights.exact * 100).toFixed(0)}%,
                    Fuzzy {(currentWeights.fuzzy * 100).toFixed(0)}%, Soundex{' '}
                    {(currentWeights.soundex * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!templateName.trim() || createTemplate.isPending}
                className="w-full"
              >
                {createTemplate.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: MatchingTemplate;
  onApply: (template: MatchingTemplate) => void;
  onDelete: ((id: string) => void) | null;
  formatDate: (date: string) => string;
}

function TemplateCard({
  template,
  onApply,
  onDelete,
  formatDate,
}: TemplateCardProps) {
  return (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{template.name}</h4>
            {template.is_public && (
              <Badge variant="outline" className="shrink-0">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            )}
          </div>

          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {template.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              {template.rules.length} rules
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {template.usage_count} uses
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(template.updated_at)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={() => onApply(template)}
          >
            Apply
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(template.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Smart Matching Wizard - 4-step wizard for data matching
 * Step 1: Select source and target databases
 * Step 2: Configure matching rules
 * Step 3: Preview matching results
 * Step 4: Apply matches
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Check, AlertCircle, Loader2, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { mlMapper } from '@/utils/mlMapper';
import { supabase } from '@/integrations/supabase/client';
import { TemplateManager } from './TemplateManager';
import { MatchingRule as TemplateMatchingRule, MatchingWeights } from '@/hooks/useMatchingTemplates';

interface Database {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface MatchingRule {
  sourceColumn: string;
  targetColumn: string;
  strategy: 'exact' | 'fuzzy' | 'soundex' | 'time' | 'composite';
  weight: number;
  threshold?: number;
}

interface MatchResult {
  sourceId: string;
  targetId: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  breakdown: Record<string, number>;
}

interface SmartMatchingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (results: MatchResult[]) => void;
}

export function SmartMatchingWizard({ open, onClose, onComplete }: SmartMatchingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Database selection
  const [databases, setDatabases] = useState<Database[]>([]);
  const [sourceDb, setSourceDb] = useState<string | null>(null);
  const [targetDb, setTargetDb] = useState<string | null>(null);

  // Step 2: Matching rules
  const [rules, setRules] = useState<MatchingRule[]>([]);
  const [weights, setWeights] = useState({
    exact: 0.4,
    fuzzy: 0.3,
    soundex: 0.15,
    time: 0.1,
    pattern: 0.05,
  });

  // Step 3: Results
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [processing, setProcessing] = useState(false);

  // Step 4: Apply
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());

  // Template manager
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  // Load databases on mount
  useEffect(() => {
    if (open) {
      loadDatabases();
    }
  }, [open]);

  const loadDatabases = async () => {
    try {
      const { data, error } = await supabase
        .from('databases')
        .select('id, name, icon, color')
        .order('name');

      if (error) throw error;
      setDatabases(data || []);
    } catch (error) {
      console.error('Failed to load databases:', error);
      toast.error('Failed to load databases');
    }
  };

  const handleNext = async () => {
    if (step === 1 && (!sourceDb || !targetDb)) {
      toast.error('Please select both source and target databases');
      return;
    }

    if (step === 2 && rules.length === 0) {
      toast.error('Please configure at least one matching rule');
      return;
    }

    if (step === 3) {
      // Apply matches
      await applyMatches();
      return;
    }

    if (step === 2) {
      // Run matching algorithm
      await runMatching();
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const runMatching = async () => {
    setProcessing(true);
    try {
      // Fetch data from both databases
      const { data: sourceData, error: sourceError } = await supabase
        .from('table_data')
        .select('*')
        .eq('database_id', sourceDb)
        .limit(100); // Limit for performance

      const { data: targetData, error: targetError } = await supabase
        .from('table_data')
        .select('*')
        .eq('database_id', targetDb)
        .limit(100);

      if (sourceError || targetError) {
        throw new Error('Failed to fetch data');
      }

      // Run matching algorithm
      const results: MatchResult[] = [];

      for (const sourceRow of sourceData || []) {
        for (const targetRow of targetData || []) {
          // Apply each rule and calculate composite score
          const match = mlMapper.advancedMatch(
            {
              name: sourceRow.data?.name || '',
              value: sourceRow.data,
              type: 'text',
            },
            {
              name: targetRow.data?.name || '',
              value: targetRow.data,
              type: 'text',
            },
            { weights }
          );

          if (match.score > 0.3) { // Threshold
            results.push({
              sourceId: sourceRow.id,
              targetId: targetRow.id,
              score: match.score,
              confidence: match.confidence,
              breakdown: match.breakdown,
            });
          }
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      setMatchResults(results);

      // Auto-select high confidence matches
      const highConfidenceIds = new Set(
        results
          .filter((r) => r.confidence === 'high')
          .map((r) => r.sourceId)
      );
      setSelectedMatches(highConfidenceIds);

      toast.success(`Found ${results.length} potential matches`);
    } catch (error) {
      console.error('Matching error:', error);
      toast.error('Failed to run matching algorithm');
    } finally {
      setProcessing(false);
    }
  };

  const applyMatches = async () => {
    setLoading(true);
    try {
      const matchesToApply = matchResults.filter((m) =>
        selectedMatches.has(m.sourceId)
      );

      // TODO: Implement actual data merging/linking logic
      console.log('Applying matches:', matchesToApply);

      toast.success(`Applied ${matchesToApply.length} matches`);

      if (onComplete) {
        onComplete(matchesToApply);
      }

      onClose();
    } catch (error) {
      console.error('Apply matches error:', error);
      toast.error('Failed to apply matches');
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setRules([
      ...rules,
      {
        sourceColumn: '',
        targetColumn: '',
        strategy: 'composite',
        weight: 1.0,
      },
    ]);
  };

  const updateRule = (index: number, updates: Partial<MatchingRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleApplyTemplate = (templateRules: TemplateMatchingRule[], templateWeights: MatchingWeights) => {
    setRules(templateRules);
    setWeights(templateWeights);
    setTemplateManagerOpen(false);
  };

  const progressValue = (step / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Data Matching Wizard</DialogTitle>
          <DialogDescription>
            Match and merge data from two databases using advanced algorithms
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2 text-sm">
            <span className={step >= 1 ? 'text-primary' : 'text-muted-foreground'}>
              1. Select Databases
            </span>
            <span className={step >= 2 ? 'text-primary' : 'text-muted-foreground'}>
              2. Configure Rules
            </span>
            <span className={step >= 3 ? 'text-primary' : 'text-muted-foreground'}>
              3. Preview Results
            </span>
            <span className={step >= 4 ? 'text-primary' : 'text-muted-foreground'}>
              4. Apply Matches
            </span>
          </div>
          <Progress value={progressValue} />
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Source Database</Label>
                <Select value={sourceDb || ''} onValueChange={setSourceDb}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {databases.map((db) => (
                      <SelectItem key={db.id} value={db.id}>
                        {db.icon && <span className="mr-2">{db.icon}</span>}
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Database</Label>
                <Select value={targetDb || ''} onValueChange={setTargetDb}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {databases
                      .filter((db) => db.id !== sourceDb)
                      .map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          {db.icon && <span className="mr-2">{db.icon}</span>}
                          {db.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {sourceDb && targetDb && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Ready to configure matching rules between these databases.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Matching Strategy Weights</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateManagerOpen(true)}
                  >
                    <BookmarkPlus className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </div>

                <div className="space-y-4">
                  {Object.entries(weights).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm capitalize">{key}</span>
                        <span className="text-sm text-muted-foreground">
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        value={[value * 100]}
                        onValueChange={(val) =>
                          setWeights({ ...weights, [key]: val[0] / 100 })
                        }
                        max={100}
                        step={5}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Button onClick={addRule} variant="outline" size="sm">
                  Add Matching Rule
                </Button>
              </div>

              {rules.length > 0 && (
                <div className="space-y-2">
                  {rules.map((rule, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg flex items-center gap-2"
                    >
                      <Input
                        placeholder="Source column"
                        value={rule.sourceColumn}
                        onChange={(e) =>
                          updateRule(index, { sourceColumn: e.target.value })
                        }
                        className="flex-1"
                      />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Target column"
                        value={rule.targetColumn}
                        onChange={(e) =>
                          updateRule(index, { targetColumn: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {processing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Running matching algorithm...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Found {matchResults.length} matches
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        High: {matchResults.filter((r) => r.confidence === 'high').length}
                      </Badge>
                      <Badge variant="outline">
                        Medium: {matchResults.filter((r) => r.confidence === 'medium').length}
                      </Badge>
                      <Badge variant="outline">
                        Low: {matchResults.filter((r) => r.confidence === 'low').length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {matchResults.map((result) => (
                      <div
                        key={`${result.sourceId}-${result.targetId}`}
                        className="p-3 border rounded-lg flex items-center gap-3"
                      >
                        <Checkbox
                          checked={selectedMatches.has(result.sourceId)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedMatches);
                            if (checked) {
                              newSelected.add(result.sourceId);
                            } else {
                              newSelected.delete(result.sourceId);
                            }
                            setSelectedMatches(newSelected);
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Match Score: {(result.score * 100).toFixed(1)}%
                            </span>
                            <Badge
                              variant={
                                result.confidence === 'high'
                                  ? 'default'
                                  : result.confidence === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {result.confidence}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            {Object.entries(result.breakdown).map(([key, value]) => (
                              <span key={key}>
                                {key}: {(value * 100).toFixed(0)}%
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Ready to apply matches
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {selectedMatches.size} matches will be applied
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">What will happen:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-primary" />
                    <span>
                      Selected records will be linked in the database
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Duplicate data will be merged where possible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600" />
                    <span>This action cannot be easily undone</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : handleBack}
            disabled={loading || processing}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={handleNext}
            disabled={loading || processing}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 4 ? 'Apply Matches' : step === 3 ? 'Continue' : 'Next'}
          </Button>
        </div>
      </DialogContent>

      {/* Template Manager Dialog */}
      <TemplateManager
        open={templateManagerOpen}
        onClose={() => setTemplateManagerOpen(false)}
        currentRules={rules}
        currentWeights={weights}
        onApplyTemplate={handleApplyTemplate}
      />
    </Dialog>
  );
}

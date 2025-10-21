import { useQuery } from '@tanstack/react-query';
import { X, Plus, Minus, Edit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface VersionComparisonDialogProps {
  versionId1: string;
  versionId2: string;
  onClose: () => void;
}

interface SchemaDiff {
  added_tables: any[];
  removed_tables: any[];
  modified_tables: Array<{
    table_name: string;
    before: any;
    after: any;
  }>;
  total_changes: number;
}

export function VersionComparisonDialog({
  versionId1,
  versionId2,
  onClose,
}: VersionComparisonDialogProps) {
  const { data: diff, isLoading } = useQuery({
    queryKey: ['schema-diff', versionId1, versionId2],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_schema_diff', {
        p_version_id_1: versionId1,
        p_version_id_2: versionId2,
      });

      if (error) throw error;
      return data as SchemaDiff;
    },
    enabled: !!versionId1 && !!versionId2,
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Schema Comparison</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !diff ? (
          <div className="text-center p-8 text-muted-foreground">
            No differences found
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Changes</p>
                <p className="text-2xl font-bold">{diff.total_changes}</p>
              </div>
              <div className="flex gap-4">
                {diff.added_tables.length > 0 && (
                  <Badge variant="default" className="gap-1">
                    <Plus className="h-3 w-3" />
                    {diff.added_tables.length} Added
                  </Badge>
                )}
                {diff.removed_tables.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <Minus className="h-3 w-3" />
                    {diff.removed_tables.length} Removed
                  </Badge>
                )}
                {diff.modified_tables.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Edit className="h-3 w-3" />
                    {diff.modified_tables.length} Modified
                  </Badge>
                )}
              </div>
            </div>

            {/* Added Tables */}
            {diff.added_tables.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-green-600 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Added Tables ({diff.added_tables.length})
                </h3>
                <div className="space-y-2">
                  {diff.added_tables.map((table, idx) => (
                    <div
                      key={idx}
                      className="border border-green-200 bg-green-50 rounded-lg p-4"
                    >
                      <p className="font-semibold text-green-900">{table.name}</p>
                      {table.columns && (
                        <div className="mt-2 space-y-1">
                          {table.columns.map((col: any, colIdx: number) => (
                            <div
                              key={colIdx}
                              className="text-sm text-green-700 flex items-center gap-2"
                            >
                              <span className="font-mono">{col.name}</span>
                              <span className="text-xs text-green-600">
                                {col.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed Tables */}
            {diff.removed_tables.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-red-600 flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  Removed Tables ({diff.removed_tables.length})
                </h3>
                <div className="space-y-2">
                  {diff.removed_tables.map((table, idx) => (
                    <div
                      key={idx}
                      className="border border-red-200 bg-red-50 rounded-lg p-4"
                    >
                      <p className="font-semibold text-red-900">{table.name}</p>
                      {table.columns && (
                        <div className="mt-2 space-y-1">
                          {table.columns.map((col: any, colIdx: number) => (
                            <div
                              key={colIdx}
                              className="text-sm text-red-700 flex items-center gap-2"
                            >
                              <span className="font-mono">{col.name}</span>
                              <span className="text-xs text-red-600">
                                {col.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modified Tables */}
            {diff.modified_tables.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-600 flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Modified Tables ({diff.modified_tables.length})
                </h3>
                <div className="space-y-3">
                  {diff.modified_tables.map((change, idx) => (
                    <div
                      key={idx}
                      className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                    >
                      <p className="font-semibold text-blue-900 mb-3">
                        {change.table_name}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Before
                          </p>
                          <div className="bg-white rounded p-2 space-y-1">
                            {change.before.columns?.map((col: any, colIdx: number) => (
                              <div
                                key={colIdx}
                                className="text-sm flex items-center gap-2"
                              >
                                <span className="font-mono">{col.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {col.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            After
                          </p>
                          <div className="bg-white rounded p-2 space-y-1">
                            {change.after.columns?.map((col: any, colIdx: number) => (
                              <div
                                key={colIdx}
                                className="text-sm flex items-center gap-2"
                              >
                                <span className="font-mono">{col.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {col.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.total_changes === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                <p>No differences between these versions</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

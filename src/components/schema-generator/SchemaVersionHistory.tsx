import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Tag, RotateCcw, GitCompare, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VersionComparisonDialog } from './VersionComparisonDialog';

interface SchemaVersion {
  id: string;
  version_number: number;
  schema_data: any;
  created_at: string;
  description: string | null;
  is_current: boolean;
  checksum: string;
  tags: Array<{
    id: string;
    tag_name: string;
    description: string | null;
    created_at: string;
  }>;
}

interface SchemaVersionHistoryProps {
  projectId: string;
}

export function SchemaVersionHistory({ projectId }: SchemaVersionHistoryProps) {
  const [compareVersionIds, setCompareVersionIds] = useState<[string, string] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch version history
  const { data: versions, isLoading } = useQuery({
    queryKey: ['schema-version-history', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_schema_version_history', {
        p_project_id: projectId,
        p_limit: 50,
      });

      if (error) throw error;
      return data as SchemaVersion[];
    },
    enabled: !!projectId,
  });

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ versionId, createNew }: { versionId: string; createNew: boolean }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('Unauthorized');

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/schema-version-restore`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            versionId,
            createNewVersion: createNew,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to restore version');
      }

      return result;
    },
    onSuccess: (data) => {
      toast({
        title: 'Version restored',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['schema-version-history', projectId] });
    },
    onError: (error) => {
      toast({
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleRestore = (versionId: string, createNew: boolean) => {
    restoreMutation.mutate({ versionId, createNew });
  };

  const handleCompare = (versionId: string) => {
    if (!versions || versions.length < 2) return;

    // Compare with current version
    const currentVersion = versions.find((v) => v.is_current);
    if (currentVersion && currentVersion.id !== versionId) {
      setCompareVersionIds([currentVersion.id, versionId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No version history yet</p>
        <p className="text-sm mt-2">Versions will appear here when you save schemas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`border rounded-lg p-4 transition-colors ${
              version.is_current ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">
                    Version {version.version_number}
                  </h4>
                  {version.is_current && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Current
                    </Badge>
                  )}
                  {version.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag.tag_name}
                    </Badge>
                  ))}
                </div>

                {version.description && (
                  <p className="text-sm text-muted-foreground">{version.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                  <span className="font-mono">{version.checksum.slice(0, 8)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {!version.is_current && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompare(version.id)}
                      disabled={!versions.find((v) => v.is_current)}
                    >
                      <GitCompare className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(version.id, false)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {compareVersionIds && (
        <VersionComparisonDialog
          versionId1={compareVersionIds[0]}
          versionId2={compareVersionIds[1]}
          onClose={() => setCompareVersionIds(null)}
        />
      )}
    </div>
  );
}

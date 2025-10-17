/**
 * Диалог отображения истории версий базы данных
 * Показывает дерево клонов и их взаимосвязи
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  Calendar,
  Database,
  FileStack,
  ChevronRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Database as DatabaseType } from '@/types/database';
import { DatabaseAPI } from '@/api/databaseAPI';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface DatabaseVersion {
  id: string;
  databaseId: string;
  displayName: string;
  systemName: string;
  versionNumber: number;
  cloneType: 'full' | 'structure' | 'partial';
  rowsCopied: number;
  clonedAt: string;
  depth: number;
}

interface DatabaseVersionsDialogProps {
  database: DatabaseType;
  isOpen: boolean;
  onClose: () => void;
}

export function DatabaseVersionsDialog({
  database,
  isOpen,
  onClose
}: DatabaseVersionsDialogProps) {
  const [versions, setVersions] = useState<DatabaseVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, database.id]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const versionList = await DatabaseAPI.getDatabaseVersions(database.id);
      setVersions(versionList);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCloneTypeBadge = (type: string) => {
    switch (type) {
      case 'full':
        return <Badge className="bg-green-500/10 text-green-500">Полный</Badge>;
      case 'partial':
        return <Badge className="bg-blue-500/10 text-blue-500">С данными</Badge>;
      case 'structure':
        return <Badge className="bg-gray-500/10 text-gray-500">Структура</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const openDatabase = (databaseId: string) => {
    navigate(`/database/${databaseId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>История версий базы данных</DialogTitle>
              <DialogDescription>
                Дерево клонов для "{database.display_name}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {/* Оригинальная БД */}
            <GlassCard intensity="medium" className="p-4 border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{database.display_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        Оригинал
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {database.system_name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileStack className="h-3 w-3" />
                        <span>{database.row_count || 0} записей</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(database.created_at), 'dd MMM yyyy', { locale: ru })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openDatabase(database.id)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>

            {/* Клоны */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8">
                <Copy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Нет клонов этой базы данных
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className="relative"
                    style={{ marginLeft: `${version.depth * 24}px` }}
                  >
                    {/* Линия связи */}
                    {version.depth > 0 && (
                      <div className="absolute -left-6 top-6 w-6 h-0.5 bg-border" />
                    )}

                    <GlassCard intensity="weak" className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-muted rounded">
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {version.displayName}
                              </span>
                              <Badge variant="secondary" className="text-xs px-1.5">
                                v{version.versionNumber}
                              </Badge>
                              {getCloneTypeBadge(version.cloneType)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {version.systemName}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              {version.rowsCopied > 0 && (
                                <div className="flex items-center gap-1">
                                  <FileStack className="h-3 w-3" />
                                  <span>{version.rowsCopied} записей</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(version.clonedAt), 'dd MMM yyyy HH:mm', { locale: ru })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDatabase(version.databaseId)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </GlassCard>
                  </div>
                ))}
              </div>
            )}

            {/* Статистика */}
            {versions.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {versions.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Всего клонов
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {versions.filter(v => v.cloneType === 'full').length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Полных копий
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {Math.max(0, ...versions.map(v => v.depth)) + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Глубина дерева
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
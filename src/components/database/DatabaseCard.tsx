import React, { useState } from 'react';
import { Database, MoreVertical, Edit, Trash2, Users, Calendar, Copy, GitBranch } from 'lucide-react';
import {
  GlassCard,
  GlassCardContent,
  GlassCardFooter
} from '@/components/aurora';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Database as DatabaseType } from '@/types/database';
import { CloneDatabaseDialog } from './CloneDatabaseDialog';
import { DatabaseVersionsDialog } from './DatabaseVersionsDialog';

interface DatabaseCardProps {
  database: DatabaseType;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: (newDatabase: DatabaseType) => void;
}

export const DatabaseCard: React.FC<DatabaseCardProps> = ({
  database,
  onClick,
  onEdit,
  onDelete,
  onClone,
}) => {
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Не вызываем onClick если клик был по меню действий
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return;
    }
    onClick?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
        <GlassCard
        intensity="medium"
        variant="default"
        animated={true}
        className="group cursor-pointer"
        onClick={() => handleCardClick({} as React.MouseEvent)}
      >
      <GlassCardContent className="pt-6">
        <div className="flex items-start justify-between">
          {/* Иконка и название */}
          <div className="flex items-start gap-3 flex-1">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: database.color || '#6366f1' }}
            >
              {database.icon ? (
                <span className="text-2xl">{database.icon}</span>
              ) : (
                <Database className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                {database.name}
              </h3>
              {database.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {database.description}
                </p>
              )}
            </div>
          </div>

          {/* Меню действий */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-dropdown-trigger>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCloneDialog(true);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Клонировать
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVersionsDialog(true);
                }}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                История версий
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Метаданные */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{database.table_count || 0} таблиц</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(database.created_at)}</span>
          </div>
        </div>
      </GlassCardContent>

      <GlassCardFooter className="pt-0">
        {database.tags && database.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {database.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {database.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{database.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </GlassCardFooter>
    </GlassCard>

    {/* Диалог клонирования */}
    <CloneDatabaseDialog
      database={database}
      isOpen={showCloneDialog}
      onClose={() => setShowCloneDialog(false)}
      onSuccess={(newDatabase) => {
        setShowCloneDialog(false);
        onClone?.(newDatabase);
      }}
    />

    {/* Диалог истории версий */}
    <DatabaseVersionsDialog
      database={database}
      isOpen={showVersionsDialog}
      onClose={() => setShowVersionsDialog(false)}
    />
    </>
  );
};

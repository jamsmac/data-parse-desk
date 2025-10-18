import React from 'react';
import { MoreVertical, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  databaseCount?: number;
  createdAt?: string;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  description,
  icon = '📁',
  color = '#94A3B8',
  databaseCount = 0,
  createdAt,
  onOpen,
  onEdit,
  onDelete,
}) => {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('ru-RU')
    : '';

  return (
    <Card className="group hover:shadow-xl hover:border-primary/20 hover:scale-[1.02] transition-all duration-300 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3" onClick={onOpen}>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{name}</CardTitle>
              {description && (
                <CardDescription className="line-clamp-2 text-sm mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpen}>
                Открыть
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Редактировать
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    Удалить
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent onClick={onOpen}>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>
              {databaseCount} {databaseCount === 1 ? 'база' : databaseCount < 5 ? 'базы' : 'баз'}
            </span>
          </div>
          {formattedDate && (
            <span className="text-xs">{formattedDate}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

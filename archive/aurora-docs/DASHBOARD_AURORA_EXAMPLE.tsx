/**
 * Dashboard с Aurora Design System - Пример интеграции
 * 
 * Этот файл показывает как интегрировать Aurora компоненты в Dashboard
 * Скопируйте нужные части в src/pages/Dashboard.tsx
 */

import { useState, useEffect } from 'react';
import { Plus, Database, Search, Grid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Существующие импорты
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDatabases, useCreateDatabase } from '../hooks/useDatabases';

// 🌟 Новые Aurora импорты
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  AuroraBackground,
  FadeIn,
  StaggerChildren,
} from '@/components/aurora';

/**
 * Dashboard с Aurora Design System
 */
export default function DashboardAurora() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const { data: databases, isLoading, error } = useDatabases(userId || '');
  const createDatabase = useCreateDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Фильтрация баз данных
  const filteredDatabases = databases?.filter(db =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Получение пользователя
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || '00000000-0000-0000-0000-000000000000');
    };
    getUser();
  }, []);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    // 🌟 AuroraBackground оборачивает весь Dashboard
    <AuroraBackground variant="aurora" intensity="subtle">
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b backdrop-blur-md bg-background/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* 🌟 FadeIn для заголовка */}
              <FadeIn direction="down" duration={600}>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-fluid-cyan to-fluid-purple bg-clip-text text-transparent">
                    VHData Platform
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Управляйте данными как профессионал
                  </p>
                </div>
              </FadeIn>
              
              <FadeIn direction="down" delay={200}>
                <Button size="lg" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-5 w-5" />
                  Создать базу данных
                </Button>
              </FadeIn>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Search and View Controls */}
          <FadeIn direction="up" delay={300}>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск баз данных..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass-input"
                />
              </div>
              
              <div className="flex gap-1 border rounded-lg p-1 glass-subtle">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </FadeIn>

          {/* Loading State */}
          {isLoading && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <GlassCard key={i} intensity="subtle" animated={false}>
                  <div className="h-32 animate-pulse bg-muted rounded" />
                </GlassCard>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <FadeIn>
              <GlassCard intensity="medium" className="border-destructive">
                <GlassCardHeader>
                  <GlassCardTitle className="text-destructive">Ошибка загрузки</GlassCardTitle>
                  <GlassCardDescription>{error.message}</GlassCardDescription>
                </GlassCardHeader>
              </GlassCard>
            </FadeIn>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredDatabases?.length === 0 && (
            <FadeIn>
              <GlassCard intensity="medium" className="border-dashed">
                <GlassCardContent className="flex flex-col items-center justify-center py-16">
                  <Database className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'Базы данных не найдены' : 'Нет баз данных'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery
                      ? 'Попробуйте изменить поисковый запрос'
                      : 'Создайте свою первую базу данных для начала работы'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Создать базу данных
                    </Button>
                  )}
                </GlassCardContent>
              </GlassCard>
            </FadeIn>
          )}

          {/* 🌟 Databases Grid с StaggerChildren */}
          {!isLoading && !error && filteredDatabases && filteredDatabases.length > 0 && (
            <StaggerChildren staggerDelay={100}>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredDatabases.map((database) => (
                  // 🌟 GlassCard вместо обычного Card
                  <GlassCard
                    key={database.id}
                    intensity="medium"
                    hover="float"
                    variant="aurora"
                    className="cursor-pointer"
                    onClick={() => navigate(`/database/${database.id}`)}
                  >
                    <GlassCardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Иконка с glass эффектом */}
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl glass-subtle"
                            style={{ 
                              backgroundColor: database.color ? `${database.color}20` : undefined,
                              borderColor: database.color ? `${database.color}40` : undefined,
                            }}
                          >
                            {database.icon || '📊'}
                          </div>
                          <div>
                            <GlassCardTitle className="text-lg">{database.name}</GlassCardTitle>
                            <GlassCardDescription className="text-xs">
                              {new Date(database.created_at).toLocaleDateString('ru-RU')}
                            </GlassCardDescription>
                          </div>
                        </div>
                      </div>
                    </GlassCardHeader>
                    
                    <GlassCardContent>
                      {database.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {database.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs glass-badge">
                          База данных
                        </Badge>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                ))}
              </div>
            </StaggerChildren>
          )}

          {/* Statistics */}
          {!isLoading && databases && databases.length > 0 && (
            <FadeIn delay={400}>
              <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>
                    {databases.length} {databases.length === 1 ? 'база' : 'баз'} данных
                  </span>
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </AuroraBackground>
  );
}



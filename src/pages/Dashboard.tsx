import { useState, useEffect } from 'react';
import { Plus, Database, Search, Grid, List } from 'lucide-react';
import { useDatabases, useCreateDatabase } from '../hooks/useDatabases';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// 🌟 Aurora Design System imports
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  AuroraBackground,
  AuroraContainer,
  FadeIn,
  StaggerChildren,
  AnimatedList,
  FluidButton,
  GlassDialog as Dialog,
  GlassDialogContent as DialogContent,
  GlassDialogDescription as DialogDescription,
  GlassDialogFooter as DialogFooter,
  GlassDialogHeader as DialogHeader,
  GlassDialogTitle as DialogTitle,
  GlassDialogTrigger as DialogTrigger,
} from '@/components/aurora';

/**
 * Главная страница - Dashboard со списком баз данных
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || null;
  const { data: databases, isLoading, error } = useDatabases(userId || '');
  const createDatabase = useCreateDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatabase, setNewDatabase] = useState({
    name: '',
    description: '',
    icon: '📊',
    color: '#3b82f6',
  });

  // Фильтрация баз данных по поисковому запросу
  const filteredDatabases = databases?.filter(db =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Создание новой базы данных
  const handleCreateDatabase = async () => {
    if (!newDatabase.name.trim()) {
      toast.error('Введите название базы данных');
      return;
    }

    try {
      const created = await createDatabase.mutateAsync({
        ...newDatabase,
        user_id: userId!,
      });
      toast.success('База данных создана!');
      setIsCreateDialogOpen(false);
      setNewDatabase({ name: '', description: '', icon: '📊', color: '#3b82f6' });
      navigate(`/database/${created.id}`);
    } catch (error) {
      toast.error('Ошибка при создании базы данных');
      console.error(error);
    }
  };

  // Иконки для выбора
  const availableIcons = ['📊', '📈', '📉', '💼', '🗂️', '📋', '📁', '🏢', '💰', '👥', '🎯', '📝', '🔧', '⚙️', '🌟'];

  // Редирект на страницу входа, если пользователь не авторизован
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Показываем загрузку пока идет проверка авторизации
  if (authLoading || !userId) {
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
    // 🌟 Aurora Background обертывает весь Dashboard
    <AuroraBackground variant="aurora" intensity="subtle">
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b backdrop-blur-md bg-background/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* 🌟 FadeIn анимация для заголовка */}
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
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <FluidButton variant="primary" size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Создать базу данных
                  </FluidButton>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Новая база данных</DialogTitle>
                  <DialogDescription>
                    Создайте новую базу данных для управления вашими данными
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Название *</Label>
                    <Input
                      id="name"
                      placeholder="Мои данные"
                      value={newDatabase.name}
                      onChange={(e) => setNewDatabase({ ...newDatabase, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      placeholder="Описание базы данных..."
                      rows={3}
                      value={newDatabase.description}
                      onChange={(e) => setNewDatabase({ ...newDatabase, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Иконка</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewDatabase({ ...newDatabase, icon })}
                          className={`w-10 h-10 rounded-md flex items-center justify-center text-xl transition-all ${
                            newDatabase.icon === icon
                              ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="color">Цвет</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={newDatabase.color}
                        onChange={(e) => setNewDatabase({ ...newDatabase, color: e.target.value })}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={newDatabase.color}
                        onChange={(e) => setNewDatabase({ ...newDatabase, color: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <FluidButton variant="secondary" onClick={() => setIsCreateDialogOpen(false)}>
                    Отмена
                  </FluidButton>
                  <FluidButton variant="primary" onClick={handleCreateDatabase} disabled={createDatabase.isPending}>
                    {createDatabase.isPending ? 'Создание...' : 'Создать'}
                  </FluidButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
              <FluidButton
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </FluidButton>
              <FluidButton
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </FluidButton>
            </div>
          </div>
        </FadeIn>

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <GlassCard key={i} intensity="light" animated={false}>
                <div className="h-32 animate-pulse bg-muted/20 rounded" />
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
                <GlassCardDescription>Не удалось загрузить базы данных</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </GlassCardContent>
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
                  <FluidButton variant="primary" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Создать базу данных
                  </FluidButton>
                )}
              </GlassCardContent>
            </GlassCard>
          </FadeIn>
        )}

        {/* 🌟 Databases Grid с AnimatedList */}
        {!isLoading && !error && filteredDatabases && filteredDatabases.length > 0 && (
          <AnimatedList
            direction="bottom"
            stagger={0.05}
            className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}
          >
            {filteredDatabases.map((database) => (
              <GlassCard
                key={database.id}
                intensity="medium"
                variant="interactive"
                className="cursor-pointer"
                onClick={() => navigate(`/database/${database.id}`)}
              >
                  <GlassCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
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
          </AnimatedList>
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

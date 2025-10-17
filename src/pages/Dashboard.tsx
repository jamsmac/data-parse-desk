import { useState, useEffect } from 'react';
import { Plus, Database, Search, Grid, List } from 'lucide-react';
import { useDatabases, useCreateDatabase } from '../hooks/useDatabases';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Главная страница - Dashboard со списком баз данных
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
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

  // Получение текущего пользователя
  // Теперь защищено ProtectedRoute - пользователь гарантированно авторизован
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      // Больше не нужен fallback UUID - ProtectedRoute обеспечивает авторизацию
    };
    getUser();
  }, []);

  // Не показываем контент пока не получим userId
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                VHData Platform
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Управляйте данными как профессионал
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Создать базу данных
                </Button>
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
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateDatabase} disabled={createDatabase.isPending}>
                    {createDatabase.isPending ? 'Создание...' : 'Создать'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search and View Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск баз данных..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-1 border rounded-lg p-1">
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

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Ошибка загрузки</CardTitle>
              <CardDescription>Не удалось загрузить базы данных</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredDatabases?.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="h-16 w-16 text-muted-foreground mb-4" />
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
            </CardContent>
          </Card>
        )}

        {/* Databases Grid */}
        {!isLoading && !error && filteredDatabases && filteredDatabases.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredDatabases.map((database) => (
              <Card
                key={database.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                onClick={() => navigate(`/database/${database.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: database.color + '20' }}
                      >
                        {database.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{database.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(database.created_at).toLocaleDateString('ru-RU')}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {database.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {database.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      База данных
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Statistics */}
        {!isLoading && databases && databases.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>
                {databases.length} {databases.length === 1 ? 'база' : 'баз'} данных
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Eye, Star, TrendingUp, Clock, Package } from 'lucide-react';

const CATEGORIES = [
  'E-commerce',
  'CRM',
  'Project Management',
  'Inventory',
  'HR',
  'Finance',
  'Marketing',
  'Education',
  'Healthcare',
  'Other',
];

export default function TemplateMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Загрузка публичных шаблонов
  const { data: templates, isLoading } = useQuery({
    queryKey: ['marketplace-templates', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('schema_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Использование шаблона
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Получаем шаблон
      const { data: template, error } = await supabase
        .from('schema_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Увеличиваем счётчик использований
      await supabase
        .from('schema_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', templateId);

      return template;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-templates'] });
      toast({
        title: 'Шаблон применён',
        description: 'Теперь создайте проект на основе этого шаблона',
      });
      
      // Переходим на создание проекта с шаблоном
      navigate('/projects', { 
        state: { template: template.schema } 
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось использовать шаблон',
        variant: 'destructive',
      });
    },
  });

  // Фильтрация шаблонов
  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Статистика
  const stats = templates ? {
    total: templates.length,
    categories: new Set(templates.map(t => t.category)).size,
    totalUsage: templates.reduce((sum, t) => sum + (t.usage_count || 0), 0),
  } : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Маркетплейс шаблонов</h1>
          <p className="text-muted-foreground">
            Готовые схемы баз данных для быстрого старта
          </p>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Всего шаблонов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Категорий
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.categories}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Всего использований
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsage.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Поиск и фильтры */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">Все</TabsTrigger>
              {CATEGORIES.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Шаблоны */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Загрузка шаблонов...</p>
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Download className="h-3 w-3" />
                      {template.usage_count || 0}
                    </div>
                  </div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {template.preview_image && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-3">
                      <img
                        src={template.preview_image}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Создан {new Date(template.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Показать превью схемы
                      toast({
                        title: 'Превью шаблона',
                        description: JSON.stringify(template.schema).slice(0, 100) + '...',
                      });
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Превью
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => useTemplateMutation.mutate(template.id)}
                    disabled={useTemplateMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Использовать
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              {searchQuery || selectedCategory ? 'Шаблоны не найдены' : 'Пока нет публичных шаблонов'}
            </p>
            {(searchQuery || selectedCategory) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                Сбросить фильтры
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

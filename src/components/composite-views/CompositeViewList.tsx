import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Eye, Edit, Trash2, Layers } from 'lucide-react';
import { CompositeViewBuilder } from './CompositeViewBuilder';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CompositeViewListProps {
  projectId: string;
}

export function CompositeViewList({ projectId }: CompositeViewListProps) {
  const navigate = useNavigate();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const { data: compositeViews, isLoading, refetch } = useQuery({
    queryKey: ['composite-views', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('composite_views')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (viewId: string) => {
    try {
      const { error } = await supabase
        .from('composite_views')
        .delete()
        .eq('id', viewId);

      if (error) throw error;

      toast.success('Составное представление удалено');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Составные представления</h2>
          <p className="text-muted-foreground">
            Объединяйте данные из нескольких таблиц
          </p>
        </div>
        <Button onClick={() => setIsBuilderOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать представление
        </Button>
      </div>

      {compositeViews && compositeViews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {compositeViews.map((view) => (
            <Card key={view.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{view.name}</CardTitle>
                      {view.description && (
                        <CardDescription className="text-sm mt-1">
                          {view.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/projects/${projectId}/composite-view/${view.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Просмотр
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(view.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет составных представлений</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Создайте составное представление чтобы объединить данные из нескольких таблиц
              и добавить кастомные колонки (чеклисты, статусы, прогресс-бары)
            </p>
            <Button onClick={() => setIsBuilderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первое представление
            </Button>
          </CardContent>
        </Card>
      )}

      <CompositeViewBuilder
        open={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          refetch();
        }}
        projectId={projectId}
      />
    </div>
  );
}

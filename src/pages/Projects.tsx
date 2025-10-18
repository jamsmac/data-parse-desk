import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { ProjectCard } from '@/components/database/ProjectCard';
import { ProjectFormDialog } from '@/components/database/ProjectFormDialog';
import { useToast } from '@/hooks/use-toast';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Получение проектов
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_user_projects', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Создание проекта
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string; icon?: string; color?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('create_project', {
        p_name: projectData.name,
        p_user_id: user.id,
        p_description: projectData.description || null,
        p_icon: projectData.icon || '📁',
        p_color: projectData.color || '#94A3B8',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (data?.id) {
        navigate(`/projects/${data.id}`);
      }
    },
  });

  // Удаление проекта
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('delete_project', {
        p_id: projectId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Проект удален',
        description: 'Проект успешно удален',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить проект',
        variant: 'destructive',
      });
    },
  });

  const filteredProjects = projects?.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Проекты</h1>
            <p className="text-muted-foreground mt-1">
              Управляйте своими проектами и базами данных
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать проект
          </Button>
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск проектов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Список проектов */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Загрузка проектов...</p>
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                description={project.description || undefined}
                icon={project.icon || undefined}
                color={project.color || undefined}
                databaseCount={0} // TODO: получать реальное количество
                createdAt={project.created_at || undefined}
                onOpen={() => navigate(`/projects/${project.id}`)}
                onDelete={() => deleteProjectMutation.mutate(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Проекты не найдены' : 'У вас пока нет проектов'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать первый проект
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Диалог создания проекта */}
      <ProjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={async (data) => {
          await createProjectMutation.mutateAsync(data as any);
        }}
      />
    </div>
  );
}

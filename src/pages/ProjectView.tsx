import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Upload, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { DatabaseCard } from '@/components/database/DatabaseCard';
import { DatabaseFormDialog } from '@/components/database/DatabaseFormDialog';
import { UploadFileDialog } from '@/components/import/UploadFileDialog';
import { useToast } from '@/hooks/use-toast';

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Получение проекта
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase.rpc('get_database', {
        p_id: projectId,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Получение баз данных проекта
  const { data: databases, isLoading } = useQuery({
    queryKey: ['project-databases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase.rpc('get_project_databases', {
        p_project_id: projectId,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Создание базы данных
  const createDatabaseMutation = useMutation({
    mutationFn: async (databaseData: { 
      name: string; 
      description?: string; 
      icon?: string; 
      color?: string;
      tags?: string[];
    }) => {
      if (!user?.id || !projectId) throw new Error('Missing required data');

      const { data, error } = await supabase.rpc('create_database', {
        name: databaseData.name,
        user_id: user.id,
        description: databaseData.description || null,
        icon: databaseData.icon || '📊',
        color: databaseData.color || '#6366f1',
      });

      if (error) throw error;

      // Обновить project_id после создания
      if (data?.id) {
        const { error: updateError } = await supabase.rpc('update_database', {
          p_id: data.id,
          p_name: databaseData.name,
          p_description: databaseData.description || null,
          p_icon: databaseData.icon || '📊',
          p_color: databaseData.color || '#6366f1',
          p_tags: databaseData.tags || [],
        });

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-databases', projectId] });
      if (data?.id) {
        navigate(`/projects/${projectId}/database/${data.id}`);
      }
    },
  });

  // Удаление базы данных
  const deleteDatabaseMutation = useMutation({
    mutationFn: async (databaseId: string) => {
      const { error } = await supabase.rpc('delete_database', {
        p_id: databaseId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-databases', projectId] });
      toast({
        title: 'База данных удалена',
        description: 'База данных успешно удалена',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить базу данных',
        variant: 'destructive',
      });
    },
  });

  const filteredDatabases = databases?.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Кнопка назад */}
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к проектам
        </Button>

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {project?.name || 'Проект'}
            </h1>
            {project?.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Загрузить файл
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать базу данных
            </Button>
          </div>
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск баз данных..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Список баз данных */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Загрузка баз данных...</p>
          </div>
        ) : filteredDatabases && filteredDatabases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDatabases.map((database) => (
              <DatabaseCard
                key={database.id}
                database={database as any}
                onOpen={() => navigate(`/projects/${projectId}/database/${database.id}`)}
                onDelete={() => deleteDatabaseMutation.mutate(database.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Базы данных не найдены' : 'В этом проекте пока нет баз данных'}
            </p>
            {!searchQuery && (
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать базу данных
                </Button>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить файл
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Диалоги */}
      <DatabaseFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={async (data) => {
          await createDatabaseMutation.mutateAsync(data as any);
        }}
      />

      <UploadFileDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onSuccess={() => {
          setIsUploadDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['project-databases', projectId] });
        }}
      />
    </div>
  );
}

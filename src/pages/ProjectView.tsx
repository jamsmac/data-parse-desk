import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Upload, Search, Network } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { DatabaseCard } from '@/components/database/DatabaseCard';
import { DatabaseFormDialog } from '@/components/database/DatabaseFormDialog';
import { RelationshipGraph } from '@/components/relations/RelationshipGraph';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompositeViewList } from '@/components/composite-views/CompositeViewList';
import { SchemaGeneratorDialog } from '@/components/schema-generator/SchemaGeneratorDialog';
import { SchemaVersionHistory } from '@/components/schema-generator/SchemaVersionHistory';
import { Sparkles } from 'lucide-react';

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSchemaGeneratorOpen, setIsSchemaGeneratorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('databases');

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
    mutationFn: async ({ 
      databaseData, 
      file 
    }: { 
      databaseData: { 
        name: string; 
        description?: string; 
        icon?: string; 
        color?: string;
        tags?: string[];
      },
      file?: File
    }) => {
      if (!user?.id || !projectId) throw new Error('Missing required data');

      const { data, error } = await supabase.rpc('create_database', {
        name: databaseData.name,
        user_id: user.id,
        description: databaseData.description || null,
        icon: databaseData.icon || '📊',
        color: databaseData.color || '#6366f1',
        project_id: projectId,
      });

      if (error) throw error;

      // If file is provided, import data
      if (file && data?.id) {
        const { parseFile } = await import('@/utils/fileParser');
        const parsed = await parseFile(file);

        // Create table schemas from headers
        for (let i = 0; i < parsed.headers.length; i++) {
          const header = parsed.headers[i];
          let columnType = 'text';
          
          if (parsed.dateColumns.includes(header)) {
            columnType = 'date';
          } else if (parsed.amountColumns.includes(header)) {
            columnType = 'number';
          }

          await supabase.rpc('create_table_schema', {
            p_database_id: data.id,
            p_column_name: header,
            p_column_type: columnType,
            p_position: i,
          });
        }

        // Insert data rows
        const rows = parsed.data.map(row => row.data);
        if (rows.length > 0) {
          await supabase.rpc('bulk_insert_table_rows', {
            p_database_id: data.id,
            p_rows: rows,
          });
        }
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

      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        {/* Кнопка назад */}
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="mb-4"
          aria-label="Назад к проектам"
        >
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Назад к проектам
        </Button>

        {/* Заголовок */}
        <header className="flex items-center justify-between mb-8">
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
            <Button onClick={() => setIsCreateDialogOpen(true)} aria-label="Создать новую базу данных">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Создать базу данных
            </Button>
            <Button variant="outline" onClick={() => setIsSchemaGeneratorOpen(true)} aria-label="Открыть AI генератор схем">
              <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
              AI Генератор схем
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList role="tablist" aria-label="Разделы проекта">
            <TabsTrigger value="databases">Базы данных</TabsTrigger>
            <TabsTrigger value="composite">Составные представления</TabsTrigger>
            <TabsTrigger value="versions">Версии схем</TabsTrigger>
            <TabsTrigger value="graph">График связей</TabsTrigger>
          </TabsList>

          <TabsContent value="databases" className="mt-6">
            {/* Поиск */}
            <section className="mb-6" aria-label="Поиск баз данных">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  placeholder="Поиск баз данных..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Поиск баз данных по названию"
                />
              </div>
            </section>

            {/* Список баз данных */}
            {isLoading ? (
              <div className="text-center py-12" role="status">
                <p className="text-muted-foreground">Загрузка баз данных...</p>
              </div>
            ) : filteredDatabases && filteredDatabases.length > 0 ? (
              <section aria-label="Список баз данных">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                  {filteredDatabases.map((database) => (
                    <DatabaseCard
                      key={database.id}
                      database={database as any}
                      onOpen={() => navigate(`/projects/${projectId}/database/${database.id}`)}
                      onDelete={() => deleteDatabaseMutation.mutate(database.id)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className="text-center py-12" role="status">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Базы данных не найдены' : 'В этом проекте пока нет баз данных'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} aria-label="Создать первую базу данных">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Создать базу данных
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="composite" className="mt-6">
            {projectId && <CompositeViewList projectId={projectId} />}
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            {projectId && <SchemaVersionHistory projectId={projectId} />}
          </TabsContent>

          <TabsContent value="graph" className="mt-6">
            {databases && databases.length > 0 ? (
              <RelationshipGraph
                databases={databases as any}
                relations={[]}
                onDatabaseClick={(db) => navigate(`/projects/${projectId}/database/${db.id}`)}
              />
            ) : (
              <div className="text-center py-12">
                <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Создайте базы данных и связи между ними, чтобы увидеть график
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать базу данных
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Диалоги */}
      <DatabaseFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={async (data, file) => {
          await createDatabaseMutation.mutateAsync({ databaseData: data as any, file });
        }}
      />

      {projectId && (
        <SchemaGeneratorDialog
          open={isSchemaGeneratorOpen}
          onClose={() => setIsSchemaGeneratorOpen(false)}
          projectId={projectId}
        />
      )}

    </div>
  );
}

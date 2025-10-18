import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatabaseCard } from '@/components/database/DatabaseCard';
import { DatabaseFormDialog } from '@/components/database/DatabaseFormDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Database } from '@/types/database';

interface Project {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_projects', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка загрузки',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: Partial<Database>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('create_project', {
        p_name: projectData.name,
        p_user_id: user.id,
        p_description: projectData.description,
        p_icon: projectData.icon,
        p_color: projectData.color,
      });

      if (error) throw error;

      toast({
        title: 'Проект создан',
        description: `Проект "${projectData.name}" успешно создан`,
      });

      loadProjects();
      setShowCreateDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка создания',
        description: error.message,
      });
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Мои проекты</h1>
          <p className="text-muted-foreground">
            Управляйте своими проектами и базами данных
          </p>
        </div>

        {/* Search and Create */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск проектов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать проект
          </Button>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'Проекты не найдены' : 'Нет проектов'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Попробуйте изменить запрос поиска'
                : 'Создайте свой первый проект для начала работы'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать первый проект
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <DatabaseCard
                key={project.id}
                database={project as any}
                onClick={() => navigate(`/projects/${project.id}`)}
              />
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <DatabaseFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSave={handleCreateProject}
        />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Database as DatabaseIcon, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DatabaseCard } from '@/components/database/DatabaseCard';
import { DatabaseFormDialog } from '@/components/database/DatabaseFormDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UploadFileDialog } from '@/components/import/UploadFileDialog';
import type { Database } from '@/types/database';

interface Project {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
}

export default function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadProject();
    loadDatabases();
  }, [projectId, user]);

  const loadProject = async () => {
    if (!projectId || !user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
      navigate('/projects');
    }
  };

  const loadDatabases = async () => {
    if (!projectId || !user) return;

    try {
      const { data, error } = await supabase.rpc('get_project_databases', {
        p_project_id: projectId,
      });

      if (error) throw error;
      setDatabases(data || []);
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

  const handleCreateDatabase = async (dbData: Partial<Database>) => {
    if (!user || !projectId) return;

    try {
      const { data, error } = await supabase.rpc('create_database', {
        name: dbData.name,
        user_id: user.id,
        description: dbData.description,
        icon: dbData.icon,
        color: dbData.color,
      });

      if (error) throw error;

      // Привязать к проекту
      await supabase
        .from('databases')
        .update({ project_id: projectId })
        .eq('id', data.id);

      toast({
        title: 'База данных создана',
        description: `База "${dbData.name}" успешно создана`,
      });

      loadDatabases();
      setShowCreateDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка создания',
        description: error.message,
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    // Этот функционал будет реализован в UploadFileDialog
    setShowUploadDialog(true);
  };

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
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к проектам
          </Button>

          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl text-3xl"
              style={{ backgroundColor: project?.color }}
            >
              {project?.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{project?.name}</h1>
              {project?.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать базу данных
          </Button>
          <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Загрузить из файла
          </Button>
        </div>

        {/* Databases Grid */}
        {databases.length === 0 ? (
          <div className="text-center py-12">
            <DatabaseIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет баз данных</h3>
            <p className="text-muted-foreground mb-4">
              Создайте базу данных или загрузите из файла
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать базу данных
              </Button>
              <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Загрузить из файла
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {databases.map((database) => (
              <DatabaseCard
                key={database.id}
                database={database}
                onClick={() => navigate(`/projects/${projectId}/database/${database.id}`)}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <DatabaseFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSave={handleCreateDatabase}
        />

        {showUploadDialog && (
          <UploadFileDialog
            open={showUploadDialog}
            onOpenChange={setShowUploadDialog}
            onSuccess={loadDatabases}
          />
        )}
      </div>
    </div>
  );
}

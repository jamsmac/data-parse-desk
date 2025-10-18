import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DatabaseCard } from '@/components/database/DatabaseCard';
import { DatabaseFormDialog } from '@/components/database/DatabaseFormDialog';
import { UploadFileDialog } from '@/components/import/UploadFileDialog';
import type { Database } from '@/types/database';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, [user]);

  const loadDatabases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_user_databases', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setDatabases((data || []) as any);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDatabase = async (data: Partial<Database>) => {
    if (!user) return;

    try {
      const { data: newDb, error } = await supabase.rpc('create_database', {
        name: data.name!,
        user_id: user.id,
        description: data.description,
        icon: data.icon,
        color: data.color,
      });

      if (error) throw error;

      toast({
        title: 'База данных создана',
        description: `База "${data.name}" успешно создана`,
      });

      loadDatabases();
      navigate(`/database/${newDb.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleDeleteDatabase = async (id: string) => {
    try {
      const { error } = await supabase.rpc('delete_database', {
        p_id: id,
      });

      if (error) throw error;

      toast({
        title: 'База данных удалена',
      });

      loadDatabases();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <h1 className="text-4xl font-bold mb-2">Мои базы данных</h1>
          <p className="text-muted-foreground">
            Управляйте своими данными, создавайте связи и анализируйте информацию
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск баз данных..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать базу данных
          </Button>
          <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Загрузить файл
          </Button>
        </div>

        {/* Databases Grid */}
        {filteredDatabases.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4 text-6xl">📊</div>
            <h2 className="text-2xl font-semibold mb-2">Нет баз данных</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'По вашему запросу ничего не найдено'
                : 'Создайте свою первую базу данных или загрузите файл'}
            </p>
            {!searchQuery && (
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать базу данных
                </Button>
                <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                  Загрузить файл
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDatabases.map((database) => (
              <DatabaseCard
                key={database.id}
                database={database}
                onOpen={() => navigate(`/database/${database.id}`)}
                onDelete={() => handleDeleteDatabase(database.id)}
              />
            ))}
          </div>
        )}

        {/* Create Database Dialog */}
        <DatabaseFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSave={handleCreateDatabase}
        />

        {/* Upload File Dialog */}
        <UploadFileDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onSuccess={() => {
            setShowUploadDialog(false);
            loadDatabases();
          }}
        />
      </div>
    </div>
  );
}

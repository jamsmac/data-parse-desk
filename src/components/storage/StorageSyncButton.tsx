import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StorageSyncButtonProps {
  providerId?: string;
  databaseId?: string;
}

export const StorageSyncButton = ({ providerId, databaseId }: StorageSyncButtonProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(providerId || '');
  const [selectedDatabase, setSelectedDatabase] = useState(databaseId || '');

  const handleSync = async () => {
    if (!selectedProvider || !selectedDatabase) {
      toast({
        title: 'Ошибка',
        description: 'Выберите провайдер и базу данных',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-storage', {
        body: {
          provider_id: selectedProvider,
          database_id: selectedDatabase,
        },
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: `Синхронизировано ${data.rows_synced} записей`,
      });

      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: 'Ошибка синхронизации',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Синхронизировать
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Синхронизация с облаком</DialogTitle>
          <DialogDescription>
            Выберите провайдер и базу данных для синхронизации
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Провайдер хранилища</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Выберите провайдер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provider-1">DigitalOcean Spaces</SelectItem>
                <SelectItem value="provider-2">Google Drive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">База данных</Label>
            <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
              <SelectTrigger id="database">
                <SelectValue placeholder="Выберите базу данных" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="db-1">База данных 1</SelectItem>
                <SelectItem value="db-2">База данных 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSyncing}>
            Отмена
          </Button>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Синхронизация...
              </>
            ) : (
              'Синхронизировать'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

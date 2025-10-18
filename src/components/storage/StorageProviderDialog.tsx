import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

interface StorageProviderDialogProps {
  onSuccess?: () => void;
}

export function StorageProviderDialog({ onSuccess }: StorageProviderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerType, setProviderType] = useState<string>('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('storage_providers').insert({
        user_id: user.id,
        provider_type: providerType,
        name,
        config: {
          api_key: apiKey,
          ...config,
        },
      });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Провайдер добавлен',
      });

      setOpen(false);
      setProviderType('');
      setName('');
      setApiKey('');
      setConfig({});
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить провайдер',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить провайдер
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить Storage Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider-type">Тип провайдера</Label>
            <Select value={providerType} onValueChange={setProviderType} required>
              <SelectTrigger id="provider-type">
                <SelectValue placeholder="Выберите провайдер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="digitalocean">DigitalOcean Spaces</SelectItem>
                <SelectItem value="googledrive">Google Drive</SelectItem>
                <SelectItem value="dropbox">Dropbox</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мое хранилище"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key / Access Token</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {providerType === 'digitalocean' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={config.region || ''}
                  onChange={(e) => setConfig({ ...config, region: e.target.value })}
                  placeholder="nyc3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bucket">Bucket Name</Label>
                <Input
                  id="bucket"
                  value={config.bucket || ''}
                  onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
                  placeholder="my-bucket"
                  required
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

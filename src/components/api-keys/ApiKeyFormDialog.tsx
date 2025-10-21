import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createHash } from 'crypto-browserify';
import { Copy, Eye, EyeOff } from 'lucide-react';

interface ApiKeyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyFormDialog({ open, onOpenChange }: ApiKeyFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [rateLimit, setRateLimit] = useState(1000);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Permissions state
  const [permissions, setPermissions] = useState({
    databases: { read: true, write: false, delete: false },
    rows: { read: true, write: false, delete: false },
    projects: { read: true, write: false, delete: false },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const generateApiKey = () => {
    // Generate a random 32-character API key
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const key = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `dpd_${key}`;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const apiKey = generateApiKey();
      const keyPrefix = apiKey.substring(0, 12); // dpd_12345678

      // Hash the full key using crypto-browserify
      const hash = createHash('sha256');
      hash.update(apiKey);
      const keyHash = hash.digest('hex');

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          permissions,
          rate_limit: rateLimit,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      return { data, fullKey: apiKey };
    },
    onSuccess: ({ fullKey }) => {
      setGeneratedKey(fullKey);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'API ключ создан',
        description: 'Скопируйте ключ сейчас - он больше не будет показан',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать API ключ',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название для API ключа',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate();
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast({
        title: 'Скопировано',
        description: 'API ключ скопирован в буфер обмена',
      });
    }
  };

  const handleClose = () => {
    setName('');
    setRateLimit(1000);
    setExpiresInDays(null);
    setGeneratedKey(null);
    setShowKey(false);
    setPermissions({
      databases: { read: true, write: false, delete: false },
      rows: { read: true, write: false, delete: false },
      projects: { read: true, write: false, delete: false },
    });
    onOpenChange(false);
  };

  const updatePermission = (resource: string, action: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource as keyof typeof prev],
        [action]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {generatedKey ? 'API ключ создан' : 'Создать API ключ'}
          </DialogTitle>
          <DialogDescription>
            {generatedKey
              ? 'Скопируйте ключ сейчас - он больше не будет показан'
              : 'Создайте новый API ключ для доступа к REST API'}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
                Важно: Сохраните этот ключ
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Этот API ключ показывается только один раз. После закрытия окна вы не сможете его увидеть снова.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ваш API ключ</Label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={generatedKey}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleCopyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Пример использования</Label>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
{`curl -H "x-api-key: ${generatedKey}" \\
  https://your-project.supabase.co/functions/v1/rest-api/databases`}
              </pre>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  placeholder="Например: Production API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimit">Rate Limit (запросов/час)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min="1"
                  max="10000"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresInDays">Истекает через (дней)</Label>
                <Input
                  id="expiresInDays"
                  type="number"
                  min="1"
                  placeholder="Оставьте пустым для бессрочного ключа"
                  value={expiresInDays || ''}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <h4 className="font-semibold">Права доступа</h4>

              {/* Databases */}
              <div className="space-y-2">
                <Label className="text-base">Базы данных</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="db-read"
                      checked={permissions.databases.read}
                      onCheckedChange={(checked) =>
                        updatePermission('databases', 'read', checked as boolean)
                      }
                    />
                    <label htmlFor="db-read" className="text-sm cursor-pointer">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="db-write"
                      checked={permissions.databases.write}
                      onCheckedChange={(checked) =>
                        updatePermission('databases', 'write', checked as boolean)
                      }
                    />
                    <label htmlFor="db-write" className="text-sm cursor-pointer">
                      Write
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="db-delete"
                      checked={permissions.databases.delete}
                      onCheckedChange={(checked) =>
                        updatePermission('databases', 'delete', checked as boolean)
                      }
                    />
                    <label htmlFor="db-delete" className="text-sm cursor-pointer">
                      Delete
                    </label>
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                <Label className="text-base">Записи</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rows-read"
                      checked={permissions.rows.read}
                      onCheckedChange={(checked) =>
                        updatePermission('rows', 'read', checked as boolean)
                      }
                    />
                    <label htmlFor="rows-read" className="text-sm cursor-pointer">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rows-write"
                      checked={permissions.rows.write}
                      onCheckedChange={(checked) =>
                        updatePermission('rows', 'write', checked as boolean)
                      }
                    />
                    <label htmlFor="rows-write" className="text-sm cursor-pointer">
                      Write
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rows-delete"
                      checked={permissions.rows.delete}
                      onCheckedChange={(checked) =>
                        updatePermission('rows', 'delete', checked as boolean)
                      }
                    />
                    <label htmlFor="rows-delete" className="text-sm cursor-pointer">
                      Delete
                    </label>
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div className="space-y-2">
                <Label className="text-base">Проекты</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projects-read"
                      checked={permissions.projects.read}
                      onCheckedChange={(checked) =>
                        updatePermission('projects', 'read', checked as boolean)
                      }
                    />
                    <label htmlFor="projects-read" className="text-sm cursor-pointer">
                      Read
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projects-write"
                      checked={permissions.projects.write}
                      onCheckedChange={(checked) =>
                        updatePermission('projects', 'write', checked as boolean)
                      }
                    />
                    <label htmlFor="projects-write" className="text-sm cursor-pointer">
                      Write
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projects-delete"
                      checked={permissions.projects.delete}
                      onCheckedChange={(checked) =>
                        updatePermission('projects', 'delete', checked as boolean)
                      }
                    />
                    <label htmlFor="projects-delete" className="text-sm cursor-pointer">
                      Delete
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Создание...' : 'Создать ключ'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {generatedKey && (
          <DialogFooter>
            <Button onClick={handleClose}>Готово</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

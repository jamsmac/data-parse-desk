import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, HardDrive, CheckCircle2, Settings, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StorageProviderCardProps {
  id: string;
  providerType: 'digitalocean' | 'google_drive' | 'supabase';
  name: string;
  isActive: boolean;
  lastSyncAt?: string;
  onConfigure: () => void;
  onDelete: () => void;
}

const providerIcons = {
  digitalocean: Cloud,
  google_drive: HardDrive,
  supabase: Cloud,
};

const providerLabels = {
  digitalocean: 'DigitalOcean Spaces',
  google_drive: 'Google Drive',
  supabase: 'Supabase Storage',
};

export const StorageProviderCard = ({
  id,
  providerType,
  name,
  isActive,
  lastSyncAt,
  onConfigure,
  onDelete,
}: StorageProviderCardProps) => {
  const Icon = providerIcons[providerType];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{providerLabels[providerType]}</CardDescription>
            </div>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Активен
              </>
            ) : (
              'Неактивен'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSyncAt && (
          <div className="text-sm text-muted-foreground">
            Последняя синхронизация:{' '}
            {format(new Date(lastSyncAt), 'dd MMM yyyy, HH:mm', { locale: ru })}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onConfigure} className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Настроить
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

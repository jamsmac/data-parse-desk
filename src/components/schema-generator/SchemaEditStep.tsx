import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SchemaEditor } from './SchemaEditor';
import { GeneratedSchema } from './types';

interface SchemaEditStepProps {
  generatedSchema: GeneratedSchema;
  onSchemaChange: (schema: GeneratedSchema) => void;
}

export function SchemaEditStep({ generatedSchema, onSchemaChange }: SchemaEditStepProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Редактирование схемы</AlertTitle>
        <AlertDescription>
          Вы можете изменить названия таблиц и колонок, типы данных, добавить или удалить колонки.
        </AlertDescription>
      </Alert>

      <SchemaEditor schema={generatedSchema} onChange={onSchemaChange} />
    </div>
  );
}

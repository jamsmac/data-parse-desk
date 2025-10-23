import React from 'react';
import { Label } from '@/components/ui/label';
import { ImportModeSelector } from './ImportModeSelector';
import { DuplicateStrategySelector } from './DuplicateStrategySelector';

export interface ImportOptionsStepProps {
  importMode: 'data' | 'schema_only';
  duplicateStrategy: 'skip' | 'update' | 'add_all';
  onImportModeChange: (mode: 'data' | 'schema_only') => void;
  onDuplicateStrategyChange: (strategy: 'skip' | 'update' | 'add_all') => void;
}

export const ImportOptionsStep: React.FC<ImportOptionsStepProps> = ({
  importMode,
  duplicateStrategy,
  onImportModeChange,
  onDuplicateStrategyChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Import Mode Selector */}
      <div className="space-y-2">
        <Label>Режим импорта</Label>
        <ImportModeSelector value={importMode} onChange={onImportModeChange} />
      </div>

      {/* Duplicate Strategy Selector (only for data mode) */}
      {importMode === 'data' && (
        <div className="space-y-2">
          <Label>Обработка дубликатов</Label>
          <DuplicateStrategySelector value={duplicateStrategy} onChange={onDuplicateStrategyChange} />
        </div>
      )}
    </div>
  );
};

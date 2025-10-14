import { Upload, FileSpreadsheet } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from './ui/button';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full max-w-2xl rounded-lg border-2 border-dashed border-border bg-card p-12 text-center transition-colors hover:border-primary hover:bg-muted/50"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-primary/10 p-6">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-foreground">Upload Your Data</h3>
            <p className="text-muted-foreground">
              Drag & drop or click to select Excel/CSV file
            </p>
            <p className="text-sm text-muted-foreground">
              Supports .xlsx, .xls, .csv files up to 50MB
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              disabled={isLoading}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mr-2 h-5 w-5" />
              {isLoading ? 'Processing...' : 'Select File'}
            </Button>
            
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>✓ Smart date parsing (all formats supported)</p>
            <p>✓ Amount normalization (UZS currency)</p>
            <p>✓ Timezone: Asia/Tashkent (UTC+5)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

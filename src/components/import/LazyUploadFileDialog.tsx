/**
 * Lazy Upload File Dialog
 * Wrapper component that lazy loads the heavy UploadFileDialog component
 * Reduces initial bundle size
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Lazy load the actual UploadFileDialog component
const UploadFileDialog = lazy(() => import('./UploadFileDialog'));

interface LazyUploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId: string;
  onImportComplete?: () => void;
}

// Loading fallback for lazy loaded component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
      <p className="text-sm text-muted-foreground">
        Загрузка модуля импорта...
      </p>
    </div>
  </div>
);

export function LazyUploadFileDialog({
  open,
  onOpenChange,
  databaseId,
  onImportComplete,
}: LazyUploadFileDialogProps) {
  // Only render the heavy component when dialog is actually opened
  if (!open) {
    return null;
  }

  return (
    <Suspense fallback={
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <LoadingFallback />
        </DialogContent>
      </Dialog>
    }>
      <UploadFileDialog
        open={open}
        onOpenChange={onOpenChange}
        databaseId={databaseId}
        onImportComplete={onImportComplete}
      />
    </Suspense>
  );
}

export default LazyUploadFileDialog;

/**
 * BarcodeCell - Barcode generation and display
 * Supports formats: CODE128, EAN13, UPC, CODE39
 */

import { BarcodeConfig } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Note: jsbarcode will be dynamically imported when needed
// npm install jsbarcode @types/jsbarcode

interface BarcodeCellProps {
  value?: string | null;  // Barcode value
  config: BarcodeConfig;
  onChange?: (value: string) => void;
  readonly?: boolean;
}

export function BarcodeCell({
  value = '',
  config,
  onChange,
  readonly = false
}: BarcodeCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [JsBarcode, setJsBarcode] = useState<any>(null);

  const format = config.format || 'CODE128';
  const displayValue = config.display_value ?? true;
  const width = config.width || 2;
  const height = config.height || 50;

  // Dynamically import jsbarcode
  useEffect(() => {
    import('jsbarcode').then((module) => {
      setJsBarcode(() => module.default);
    }).catch((error) => {
      console.error('Failed to load jsbarcode:', error);
      setBarcodeError('Barcode library not loaded');
    });
  }, []);

  // Generate barcode when value or config changes
  useEffect(() => {
    if (!JsBarcode || !canvasRef.current || !value) {
      return;
    }

    try {
      JsBarcode(canvasRef.current, value, {
        format,
        width,
        height,
        displayValue,
        margin: 10,
        fontSize: 14,
      });
      setBarcodeError(null);
    } catch (error: any) {
      console.error('Barcode generation error:', error);
      setBarcodeError(error.message || 'Invalid barcode value');
    }
  }, [value, format, width, height, displayValue, JsBarcode]);

  const handleBlur = () => {
    if (!onChange) {
      setEditing(false);
      return;
    }

    if (inputValue.trim()) {
      onChange(inputValue.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(value || '');
      setEditing(false);
    }
  };

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success('Barcode value copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-${value || 'unknown'}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Barcode downloaded');
      }
    });
  };

  if (!value && !editing) {
    return (
      <div
        onClick={() => !readonly && onChange && setEditing(true)}
        className={cn(
          "text-sm text-muted-foreground",
          !readonly && onChange && "cursor-pointer hover:bg-accent p-1 rounded"
        )}
      >
        No barcode
      </div>
    );
  }

  if (editing && !readonly && onChange) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Enter barcode value"
          className="h-8 w-40"
          autoFocus
        />
        <span className="text-xs text-muted-foreground">{format}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <div className="relative">
        {barcodeError ? (
          <div className="text-xs text-red-500 p-2 bg-red-50 dark:bg-red-950 rounded">
            {barcodeError}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={cn(
              "border rounded",
              !readonly && onChange && "cursor-pointer"
            )}
            onClick={() => !readonly && onChange && setEditing(true)}
          />
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleCopy}
          title="Copy value"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleDownload}
          title="Download barcode"
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

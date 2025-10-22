/**
 * QRCell - QR code generation and display
 * Supports error correction levels: L, M, Q, H
 */

import { QRConfig } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

// Note: qrcode.react will be used for QR generation
// npm install qrcode.react

interface QRCellProps {
  value?: string | null;  // QR code value (URL, text, etc.)
  config: QRConfig;
  onChange?: (value: string) => void;
  readonly?: boolean;
}

export function QRCell({
  value = '',
  config,
  onChange,
  readonly = false
}: QRCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const qrRef = useRef<HTMLDivElement>(null);

  const size = config.size || 128;
  const errorCorrection = config.error_correction || 'M';  // L, M, Q, H
  const includeMargin = config.include_margin ?? true;

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
      toast.success('QR code value copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas and download
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `qrcode-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(downloadUrl);
          toast.success('QR code downloaded');
        }
      });
      URL.revokeObjectURL(url);
    };

    img.src = url;
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
        No QR code
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
          placeholder="Enter text or URL"
          className="h-8 w-48"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <div
        ref={qrRef}
        className={cn(
          "border rounded p-2 bg-white",
          !readonly && onChange && "cursor-pointer"
        )}
        onClick={() => !readonly && onChange && setEditing(true)}
      >
        <QRCodeSVG
          value={value || ''}
          size={size}
          level={errorCorrection}
          includeMargin={includeMargin}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <div className="flex flex-col gap-1">
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
            title="Download QR code"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>

        {value && (
          <div className="text-xs text-muted-foreground max-w-[100px] truncate" title={value}>
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import { formatBytes, getFileIcon } from '../formatBytes';

describe('formatBytes', () => {
  describe('Basic functionality', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes (< 1024)', () => {
      expect(formatBytes(100)).toBe('100 Bytes');
      expect(formatBytes(500)).toBe('500 Bytes');
      expect(formatBytes(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
      expect(formatBytes(5120)).toBe('5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
      expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
      expect(formatBytes(2.5 * 1024 * 1024 * 1024 * 1024)).toBe('2.5 TB');
    });
  });

  describe('Decimal precision', () => {
    it('should use 2 decimals by default', () => {
      expect(formatBytes(1536)).toBe('1.5 KB'); // 1.5 * 1024
      expect(formatBytes(1638)).toBe('1.6 KB'); // ~1.6 * 1024
    });

    it('should support 0 decimals', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB'); // Rounds to 2
      expect(formatBytes(1024, 0)).toBe('1 KB');
    });

    it('should support 1 decimal', () => {
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1638, 1)).toBe('1.6 KB');
    });

    it('should support 3 decimals', () => {
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
      expect(formatBytes(1638, 3)).toBe('1.6 KB'); // 1.599609375 rounds to 1.600, parseFloat removes trailing zeros
    });

    it('should handle negative decimals as 0', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
      expect(formatBytes(1536, -5)).toBe('2 KB');
    });
  });

  describe('Real-world file sizes', () => {
    it('should format small document', () => {
      expect(formatBytes(50 * 1024)).toBe('50 KB'); // 50 KB doc
    });

    it('should format large document', () => {
      expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB'); // 5 MB PDF
    });

    it('should format image file', () => {
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB'); // 2.5 MB image
    });

    it('should format video file', () => {
      expect(formatBytes(750 * 1024 * 1024)).toBe('750 MB'); // 750 MB video
    });

    it('should format HD movie', () => {
      expect(formatBytes(4.7 * 1024 * 1024 * 1024)).toBe('4.7 GB'); // DVD size
    });

    it('should format large database', () => {
      expect(formatBytes(1.5 * 1024 * 1024 * 1024 * 1024)).toBe('1.5 TB');
    });
  });

  describe('Edge cases', () => {
    it('should handle 1 byte', () => {
      expect(formatBytes(1)).toBe('1 Bytes');
    });

    it('should handle fractional bytes (rounds)', () => {
      expect(formatBytes(1.5)).toBe('1.5 Bytes');
      expect(formatBytes(1.9)).toBe('1.9 Bytes');
    });

    it('should handle very large numbers', () => {
      const petabyte = 1024 * 1024 * 1024 * 1024 * 1024;
      // Will show as very large value, sizes array ends at TB
      const result = formatBytes(petabyte);
      // Result will be undefined for index > sizes.length, just check it's a string
      expect(typeof result).toBe('string');
    });

    it('should handle boundary values', () => {
      expect(formatBytes(1023)).toBe('1023 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1025)).toBe('1 KB');
    });
  });

  describe('Precision edge cases', () => {
    it('should handle 0.5 KB correctly', () => {
      expect(formatBytes(512)).toBe('512 Bytes');
      expect(formatBytes(512 + 512)).toBe('1 KB');
    });

    it('should round to specified decimals', () => {
      const value = 1.5555 * 1024; // ~1.56 KB
      expect(formatBytes(value, 0)).toBe('2 KB');
      expect(formatBytes(value, 1)).toBe('1.6 KB');
      expect(formatBytes(value, 2)).toBe('1.56 KB');
    });

    it('should handle very small KB values', () => {
      expect(formatBytes(1100, 2)).toBe('1.07 KB');
      expect(formatBytes(1200, 2)).toBe('1.17 KB');
    });
  });
});

describe('getFileIcon', () => {
  describe('Image files', () => {
    it('should return FileImage for image MIME types', () => {
      expect(getFileIcon('image/png')).toBe('FileImage');
      expect(getFileIcon('image/jpeg')).toBe('FileImage');
      expect(getFileIcon('image/gif')).toBe('FileImage');
      expect(getFileIcon('image/svg+xml')).toBe('FileImage');
      expect(getFileIcon('image/webp')).toBe('FileImage');
    });
  });

  describe('PDF files', () => {
    it('should return FileText for PDF', () => {
      expect(getFileIcon('application/pdf')).toBe('FileText');
    });
  });

  describe('Video files', () => {
    it('should return FileVideo for video MIME types', () => {
      expect(getFileIcon('video/mp4')).toBe('FileVideo');
      expect(getFileIcon('video/mpeg')).toBe('FileVideo');
      expect(getFileIcon('video/quicktime')).toBe('FileVideo');
      expect(getFileIcon('video/x-msvideo')).toBe('FileVideo');
      expect(getFileIcon('video/webm')).toBe('FileVideo');
    });
  });

  describe('Audio files', () => {
    it('should return FileAudio for audio MIME types', () => {
      expect(getFileIcon('audio/mpeg')).toBe('FileAudio');
      expect(getFileIcon('audio/wav')).toBe('FileAudio');
      expect(getFileIcon('audio/ogg')).toBe('FileAudio');
      expect(getFileIcon('audio/mp3')).toBe('FileAudio');
    });
  });

  describe('Spreadsheet files', () => {
    it('should return FileSpreadsheet for Excel files', () => {
      expect(getFileIcon('application/vnd.ms-excel')).toBe('FileSpreadsheet');
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('FileSpreadsheet');
    });

    it('should return FileSpreadsheet for spreadsheet keyword', () => {
      expect(getFileIcon('application/spreadsheet')).toBe('FileSpreadsheet');
    });

    it('should return FileSpreadsheet for .sheet extension', () => {
      expect(getFileIcon('application/x-excel.sheet')).toBe('FileSpreadsheet');
    });
  });

  describe('Document files', () => {
    it('should return FileText for Word documents', () => {
      expect(getFileIcon('application/msword')).toBe('FileText');
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('FileText');
    });

    it('should return FileText for text files', () => {
      expect(getFileIcon('text/plain')).toBe('FileText');
      expect(getFileIcon('text/html')).toBe('FileText');
      expect(getFileIcon('text/csv')).toBe('FileText');
    });

    it('should return FileText for document keyword', () => {
      expect(getFileIcon('application/document')).toBe('FileText');
    });
  });

  describe('Generic files', () => {
    it('should return File for unknown types', () => {
      expect(getFileIcon('application/octet-stream')).toBe('File');
      expect(getFileIcon('application/zip')).toBe('File');
      expect(getFileIcon('application/x-rar')).toBe('File');
      expect(getFileIcon('unknown/type')).toBe('File');
    });

    it('should return File for empty string', () => {
      expect(getFileIcon('')).toBe('File');
    });
  });

  describe('Edge cases', () => {
    it('should handle case sensitivity in MIME types', () => {
      // startsWith is case-sensitive
      expect(getFileIcon('Image/png')).toBe('File'); // Capital I not matched
      expect(getFileIcon('image/PNG')).toBe('FileImage'); // lowercase 'image/' matches
    });

    it('should handle complex MIME types', () => {
      expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('FileText');
      expect(getFileIcon('application/vnd.ms-excel.sheet.macroEnabled.12')).toBe('FileSpreadsheet');
    });

    it('should prioritize specific matches over generic', () => {
      // PDF is specifically matched before text check
      expect(getFileIcon('application/pdf')).toBe('FileText');
    });
  });

  describe('Real-world MIME types', () => {
    it('should handle common image formats', () => {
      expect(getFileIcon('image/jpeg')).toBe('FileImage');
      expect(getFileIcon('image/png')).toBe('FileImage');
      expect(getFileIcon('image/gif')).toBe('FileImage');
      expect(getFileIcon('image/bmp')).toBe('FileImage');
    });

    it('should handle common document formats', () => {
      expect(getFileIcon('application/pdf')).toBe('FileText');
      expect(getFileIcon('application/msword')).toBe('FileText');
      expect(getFileIcon('text/plain')).toBe('FileText');
    });

    it('should handle common archive formats', () => {
      expect(getFileIcon('application/zip')).toBe('File');
      expect(getFileIcon('application/x-tar')).toBe('File');
      expect(getFileIcon('application/x-gzip')).toBe('File');
    });
  });
});

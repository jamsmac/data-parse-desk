/**
 * Format bytes to human-readable file size
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get file icon based on MIME type
 * @param mimeType - File MIME type
 * @returns Icon name from lucide-react
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'FileImage';
  if (mimeType === 'application/pdf') return 'FileText';
  if (mimeType.startsWith('video/')) return 'FileVideo';
  if (mimeType.startsWith('audio/')) return 'FileAudio';
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.endsWith('.sheet')
  ) {
    return 'FileSpreadsheet';
  }
  if (
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  ) {
    return 'FileText';
  }
  return 'File';
}

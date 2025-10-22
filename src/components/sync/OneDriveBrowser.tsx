/**
 * OneDrive File Browser Component
 * Simplified browser for OneDrive files
 */

import { useState, useEffect } from 'react';
import { useOneDrive } from '@/hooks/useOneDrive';
import { OneDriveFile } from '@/lib/onedriveSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Cloud, Folder, File, Upload, Download, Trash2, Search, Loader2, User } from 'lucide-react';

export function OneDriveBrowser() {
  const {
    isAuthorized,
    isLoading,
    currentFolderId,
    accountInfo,
    authorize,
    logout,
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    searchFiles,
  } = useOneDrive();

  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthorized) {
      loadFiles();
    }
  }, [isAuthorized, currentFolderId]);

  const loadFiles = async () => {
    const loadedFiles = await listFiles(currentFolderId);
    setFiles(loadedFiles);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadFiles();
      return;
    }
    const results = await searchFiles(searchQuery);
    setFiles(results);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    await uploadFile(currentFolderId, file, (progress) => {
      setUploadProgress(progress.percentage);
    });

    setUploadProgress(null);
    await loadFiles();
    event.target.value = '';
  };

  const handleDownload = async (file: OneDriveFile) => {
    await downloadFile(file.id, file.name);
  };

  const handleDelete = async (file: OneDriveFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    const success = await deleteFile(file.id);
    if (success) await loadFiles();
  };

  const navigateToFolder = async (folder: OneDriveFile) => {
    await listFiles(folder.id);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive Integration
          </CardTitle>
          <CardDescription>
            Connect your Microsoft OneDrive account to sync and manage files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <Cloud className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect to OneDrive to upload, download, and manage your files
            </p>
            <Button onClick={authorize} size="lg">
              <Cloud className="mr-2 h-4 w-4" />
              Connect to OneDrive
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              OneDrive Browser
            </CardTitle>
            {accountInfo && (
              <CardDescription className="flex items-center gap-2 mt-1">
                <User className="h-3 w-3" />
                {accountInfo.displayName} ({accountInfo.email})
              </CardDescription>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            Disconnect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              Upload
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </label>
          </Button>
        </div>

        {/* Upload Progress */}
        {uploadProgress !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* File List */}
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Folder className="h-16 w-16 mb-4" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => file.isFolder && navigateToFolder(file)}
                  >
                    {file.isFolder ? (
                      <Folder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <File className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.modified.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {!file.isFolder && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

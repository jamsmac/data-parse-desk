/**
 * Dropbox File Browser Component
 * Browse, upload, download files from Dropbox
 */

import { useState, useEffect } from 'react';
import { useDropbox } from '@/hooks/useDropbox';
import { DropboxFile, UploadProgress } from '@/lib/dropboxSync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Cloud,
  Folder,
  File,
  Upload,
  Download,
  Trash2,
  FolderPlus,
  Search,
  ArrowLeft,
  Share2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function DropboxBrowser() {
  const {
    isAuthorized,
    isLoading,
    currentPath,
    authorize,
    logout,
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    createFolder,
    searchFiles,
    getSharedLink,
  } = useDropbox();

  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedLink, setSharedLink] = useState('');

  // Load files when authorized or path changes
  useEffect(() => {
    if (isAuthorized) {
      loadFiles();
    }
  }, [isAuthorized, currentPath]);

  const loadFiles = async () => {
    const loadedFiles = await listFiles(currentPath);
    setFiles(loadedFiles);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadFiles();
      return;
    }
    const results = await searchFiles(searchQuery, currentPath);
    setFiles(results);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const path = currentPath ? `${currentPath}/${file.name}` : `/${file.name}`;
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

    await uploadFile(path, file, (progress) => {
      setUploadProgress(progress);
    });

    setUploadProgress(null);
    await loadFiles();

    // Reset input
    event.target.value = '';
  };

  const handleDownload = async (file: DropboxFile) => {
    await downloadFile(file.path, file.name);
  };

  const handleDelete = async (file: DropboxFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;

    const success = await deleteFile(file.path);
    if (success) {
      await loadFiles();
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const path = currentPath ? `${currentPath}/${newFolderName}` : `/${newFolderName}`;
    const folder = await createFolder(path);

    if (folder) {
      setNewFolderDialogOpen(false);
      setNewFolderName('');
      await loadFiles();
    }
  };

  const handleShare = async (file: DropboxFile) => {
    const link = await getSharedLink(file.path);
    if (link) {
      setSharedLink(link);
      setShareDialogOpen(true);
    }
  };

  const navigateToFolder = async (folder: DropboxFile) => {
    await listFiles(folder.path);
  };

  const navigateUp = async () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = parts.length > 0 ? '/' + parts.join('/') : '';
    await listFiles(parentPath);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Dropbox Integration
          </CardTitle>
          <CardDescription>
            Connect your Dropbox account to sync and manage files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4 py-8">
            <Cloud className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect to Dropbox to upload, download, and manage your files
            </p>
            <Button onClick={authorize} size="lg">
              <Cloud className="mr-2 h-4 w-4" />
              Connect to Dropbox
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
              Dropbox Browser
            </CardTitle>
            <CardDescription>
              {currentPath || '/ (Root)'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            Disconnect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex gap-2">
          {currentPath && (
            <Button variant="outline" size="sm" onClick={navigateUp}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

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

          <Button variant="outline" size="sm" onClick={() => setNewFolderDialogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>

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
        {uploadProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress.percentage.toFixed(0)}%</span>
            </div>
            <Progress value={uploadProgress.percentage} />
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
              <p>This folder is empty</p>
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
                    {file.isFolder && <Badge variant="outline">Folder</Badge>}
                  </div>

                  {!file.isFolder && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(file)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
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

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Link Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Link</DialogTitle>
            <DialogDescription>
              Anyone with this link can view and download the file
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={sharedLink} readOnly />
            <Button onClick={() => copyToClipboard(sharedLink)}>
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

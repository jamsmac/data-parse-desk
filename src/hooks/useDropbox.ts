/**
 * React Hook for Dropbox Integration
 */

import { useState, useCallback, useEffect } from 'react';
import { getDropboxSync, DropboxFile, UploadProgress } from '@/lib/dropboxSync';
import { toast } from 'sonner';

const DROPBOX_CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID || '';

export function useDropbox() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Try to restore session on mount
    try {
      const dropbox = getDropboxSync({
        clientId: DROPBOX_CLIENT_ID,
        redirectUri: window.location.origin + '/dropbox-callback',
      });
      const restored = dropbox.restoreSession();
      setIsAuthorized(restored);
    } catch (error) {
      console.error('Failed to restore Dropbox session:', error);
    }
  }, []);

  const authorize = useCallback(async () => {
    try {
      const dropbox = getDropboxSync();
      const authUrl = await dropbox.authorize();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Dropbox authorization failed:', error);
      toast.error('Failed to connect to Dropbox');
    }
  }, []);

  const completeAuth = useCallback(async (code: string) => {
    try {
      const dropbox = getDropboxSync();
      await dropbox.completeAuthorization(code);
      setIsAuthorized(true);
      toast.success('Connected to Dropbox successfully');
    } catch (error) {
      console.error('Dropbox auth completion failed:', error);
      toast.error('Failed to complete Dropbox authorization');
    }
  }, []);

  const logout = useCallback(() => {
    try {
      const dropbox = getDropboxSync();
      dropbox.logout();
      setIsAuthorized(false);
      setCurrentPath('');
      toast.success('Disconnected from Dropbox');
    } catch (error) {
      console.error('Dropbox logout failed:', error);
    }
  }, []);

  const listFiles = useCallback(
    async (path?: string): Promise<DropboxFile[]> => {
      setIsLoading(true);
      try {
        const dropbox = getDropboxSync();
        const files = await dropbox.listFiles(path);
        if (path !== undefined) {
          setCurrentPath(path);
        }
        return files;
      } catch (error) {
        console.error('Failed to list files:', error);
        toast.error('Failed to load files from Dropbox');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (
      path: string,
      file: File,
      onProgress?: (progress: UploadProgress) => void
    ): Promise<DropboxFile | null> => {
      setIsLoading(true);
      try {
        const dropbox = getDropboxSync();
        const result = await dropbox.uploadFile(path, file, onProgress);
        toast.success(`Uploaded ${file.name} successfully`);
        return result;
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const downloadFile = useCallback(async (path: string, filename: string): Promise<void> => {
    setIsLoading(true);
    try {
      const dropbox = getDropboxSync();
      const blob = await dropbox.downloadFile(path);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename} successfully`);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error(`Failed to download ${filename}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (path: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const dropbox = getDropboxSync();
      await dropbox.deleteFile(path);
      toast.success('File deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (path: string): Promise<DropboxFile | null> => {
    setIsLoading(true);
    try {
      const dropbox = getDropboxSync();
      const folder = await dropbox.createFolder(path);
      toast.success('Folder created successfully');
      return folder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchFiles = useCallback(
    async (query: string, path?: string): Promise<DropboxFile[]> => {
      setIsLoading(true);
      try {
        const dropbox = getDropboxSync();
        return await dropbox.searchFiles(query, path);
      } catch (error) {
        console.error('Failed to search files:', error);
        toast.error('Failed to search files');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getSharedLink = useCallback(async (path: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const dropbox = getDropboxSync();
      const link = await dropbox.getSharedLink(path);
      toast.success('Shared link created');
      return link;
    } catch (error) {
      console.error('Failed to create shared link:', error);
      toast.error('Failed to create shared link');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isAuthorized,
    isLoading,
    currentPath,
    authorize,
    completeAuth,
    logout,
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    createFolder,
    searchFiles,
    getSharedLink,
  };
}

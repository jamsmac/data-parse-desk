/**
 * React Hook for OneDrive Integration
 */

import { useState, useCallback, useEffect } from 'react';
import { getOneDriveSync, OneDriveFile, UploadProgress } from '@/lib/onedriveSync';
import { toast } from 'sonner';

const ONEDRIVE_CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID || '';

export function useOneDrive() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [accountInfo, setAccountInfo] = useState<{ displayName: string; email: string } | null>(null);

  useEffect(() => {
    // Try to restore session on mount
    try {
      const onedrive = getOneDriveSync({
        clientId: ONEDRIVE_CLIENT_ID,
        redirectUri: window.location.origin + '/onedrive-callback',
      });
      const restored = onedrive.restoreSession();
      setIsAuthorized(restored);

      if (restored) {
        loadAccountInfo();
      }
    } catch (error) {
      console.error('Failed to restore OneDrive session:', error);
    }
  }, []);

  const loadAccountInfo = async () => {
    try {
      const onedrive = getOneDriveSync();
      const info = await onedrive.getAccountInfo();
      setAccountInfo(info);
    } catch (error) {
      console.error('Failed to load account info:', error);
    }
  };

  const authorize = useCallback(() => {
    try {
      const onedrive = getOneDriveSync();
      const authUrl = onedrive.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('OneDrive authorization failed:', error);
      toast.error('Failed to connect to OneDrive');
    }
  }, []);

  const completeAuth = useCallback(async (accessToken: string) => {
    try {
      const onedrive = getOneDriveSync();
      onedrive.setAccessToken(accessToken);
      setIsAuthorized(true);
      await loadAccountInfo();
      toast.success('Connected to OneDrive successfully');
    } catch (error) {
      console.error('OneDrive auth completion failed:', error);
      toast.error('Failed to complete OneDrive authorization');
    }
  }, []);

  const logout = useCallback(() => {
    try {
      const onedrive = getOneDriveSync();
      onedrive.logout();
      setIsAuthorized(false);
      setCurrentFolderId('root');
      setAccountInfo(null);
      toast.success('Disconnected from OneDrive');
    } catch (error) {
      console.error('OneDrive logout failed:', error);
    }
  }, []);

  const listFiles = useCallback(
    async (folderId?: string): Promise<OneDriveFile[]> => {
      setIsLoading(true);
      try {
        const onedrive = getOneDriveSync();
        const files = await onedrive.listFiles(folderId);
        if (folderId !== undefined) {
          setCurrentFolderId(folderId);
        }
        return files;
      } catch (error) {
        console.error('Failed to list files:', error);
        toast.error('Failed to load files from OneDrive');
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const uploadFile = useCallback(
    async (
      parentId: string,
      file: File,
      onProgress?: (progress: UploadProgress) => void
    ): Promise<OneDriveFile | null> => {
      setIsLoading(true);
      try {
        const onedrive = getOneDriveSync();
        const result = await onedrive.uploadFile(parentId, file, onProgress);
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

  const downloadFile = useCallback(
    async (fileId: string, filename: string): Promise<void> => {
      setIsLoading(true);
      try {
        const onedrive = getOneDriveSync();
        const blob = await onedrive.downloadFile(fileId);

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
    },
    []
  );

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const onedrive = getOneDriveSync();
      await onedrive.deleteFile(fileId);
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

  const createFolder = useCallback(
    async (parentId: string, name: string): Promise<OneDriveFile | null> => {
      setIsLoading(true);
      try {
        const onedrive = getOneDriveSync();
        const folder = await onedrive.createFolder(parentId, name);
        toast.success('Folder created successfully');
        return folder;
      } catch (error) {
        console.error('Failed to create folder:', error);
        toast.error('Failed to create folder');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const searchFiles = useCallback(async (query: string): Promise<OneDriveFile[]> => {
    setIsLoading(true);
    try {
      const onedrive = getOneDriveSync();
      return await onedrive.searchFiles(query);
    } catch (error) {
      console.error('Failed to search files:', error);
      toast.error('Failed to search files');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSharedLink = useCallback(async (fileId: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      const onedrive = getOneDriveSync();
      const link = await onedrive.getSharedLink(fileId);
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
    currentFolderId,
    accountInfo,
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

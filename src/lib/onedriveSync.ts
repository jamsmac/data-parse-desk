/**
 * OneDrive Sync Integration
 * Синхронизация файлов с Microsoft OneDrive
 */

import { Client } from '@microsoft/microsoft-graph-client';

export interface OneDriveConfig {
  clientId: string;
  redirectUri: string;
}

export interface OneDriveFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: Date;
  isFolder: boolean;
  webUrl?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class OneDriveSync {
  private client: Client | null = null;
  private accessToken: string | null = null;
  private config: OneDriveConfig;

  constructor(config: OneDriveConfig) {
    this.config = config;
  }

  /**
   * Генерация URL для OAuth авторизации
   */
  getAuthUrl(): string {
    const scope = 'Files.ReadWrite offline_access';
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: scope,
      response_type: 'token',
      redirect_uri: this.config.redirectUri,
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Установка access token из URL fragment
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.client = Client.init({
      authProvider: (done) => {
        done(null, token);
      },
    });

    // Сохраняем токен
    localStorage.setItem('onedrive_access_token', token);
  }

  /**
   * Восстановление сессии из localStorage
   */
  restoreSession(): boolean {
    const token = localStorage.getItem('onedrive_access_token');
    if (token) {
      this.setAccessToken(token);
      return true;
    }
    return false;
  }

  /**
   * Проверка авторизации
   */
  isAuthorized(): boolean {
    return !!this.client;
  }

  /**
   * Выход
   */
  logout(): void {
    this.accessToken = null;
    this.client = null;
    localStorage.removeItem('onedrive_access_token');
  }

  /**
   * Список файлов в папке
   */
  async listFiles(folderId: string = 'root'): Promise<OneDriveFile[]> {
    if (!this.client) throw new Error('Not authorized');

    try {
      const response = await this.client
        .api(`/me/drive/items/${folderId}/children`)
        .select('id,name,size,lastModifiedDateTime,folder,webUrl,parentReference')
        .get();

      return response.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        path: item.parentReference?.path?.replace('/drive/root:', '') + '/' + item.name || '/' + item.name,
        size: item.size || 0,
        modified: new Date(item.lastModifiedDateTime),
        isFolder: !!item.folder,
        webUrl: item.webUrl,
      }));
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Загрузка файла в OneDrive
   */
  async uploadFile(
    parentId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<OneDriveFile> {
    if (!this.client) throw new Error('Not authorized');

    // Для файлов < 4MB используем простую загрузку
    if (file.size < 4 * 1024 * 1024) {
      const response = await this.client
        .api(`/me/drive/items/${parentId}:/${file.name}:/content`)
        .put(file);

      onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });

      return {
        id: response.id,
        name: response.name,
        path: response.parentReference?.path?.replace('/drive/root:', '') + '/' + response.name,
        size: response.size,
        modified: new Date(response.lastModifiedDateTime),
        isFolder: false,
        webUrl: response.webUrl,
      };
    }

    // Для больших файлов используем upload session
    return this.uploadLargeFile(parentId, file, onProgress);
  }

  /**
   * Chunked upload для больших файлов
   */
  private async uploadLargeFile(
    parentId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<OneDriveFile> {
    if (!this.client) throw new Error('Not authorized');

    // Создаем upload session
    const uploadSession = await this.client
      .api(`/me/drive/items/${parentId}:/${file.name}:/createUploadSession`)
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'replace',
        },
      });

    const uploadUrl = uploadSession.uploadUrl;
    const chunkSize = 320 * 1024; // 320KB chunks
    const chunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
          'Content-Type': 'application/octet-stream',
        },
        body: chunk,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      onProgress?.({
        loaded: end,
        total: file.size,
        percentage: (end / file.size) * 100,
      });

      // Последний chunk возвращает metadata файла
      if (i === chunks - 1) {
        const result = await response.json();
        return {
          id: result.id,
          name: result.name,
          path: result.parentReference?.path?.replace('/drive/root:', '') + '/' + result.name,
          size: result.size,
          modified: new Date(result.lastModifiedDateTime),
          isFolder: false,
          webUrl: result.webUrl,
        };
      }
    }

    throw new Error('Upload failed');
  }

  /**
   * Скачивание файла
   */
  async downloadFile(fileId: string): Promise<Blob> {
    if (!this.client) throw new Error('Not authorized');

    const response = await this.client
      .api(`/me/drive/items/${fileId}/content`)
      .getStream();

    return new Blob([response]);
  }

  /**
   * Удаление файла
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.client) throw new Error('Not authorized');

    await this.client.api(`/me/drive/items/${fileId}`).delete();
  }

  /**
   * Создание папки
   */
  async createFolder(parentId: string, name: string): Promise<OneDriveFile> {
    if (!this.client) throw new Error('Not authorized');

    const response = await this.client
      .api(`/me/drive/items/${parentId}/children`)
      .post({
        name: name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      });

    return {
      id: response.id,
      name: response.name,
      path: response.parentReference?.path?.replace('/drive/root:', '') + '/' + response.name,
      size: 0,
      modified: new Date(response.lastModifiedDateTime),
      isFolder: true,
      webUrl: response.webUrl,
    };
  }

  /**
   * Поиск файлов
   */
  async searchFiles(query: string): Promise<OneDriveFile[]> {
    if (!this.client) throw new Error('Not authorized');

    const response = await this.client
      .api('/me/drive/root/search(q=\'' + query + '\')')
      .select('id,name,size,lastModifiedDateTime,folder,webUrl,parentReference')
      .get();

    return response.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      path: item.parentReference?.path?.replace('/drive/root:', '') + '/' + item.name,
      size: item.size || 0,
      modified: new Date(item.lastModifiedDateTime),
      isFolder: !!item.folder,
      webUrl: item.webUrl,
    }));
  }

  /**
   * Получение ссылки для общего доступа
   */
  async getSharedLink(fileId: string): Promise<string> {
    if (!this.client) throw new Error('Not authorized');

    const response = await this.client
      .api(`/me/drive/items/${fileId}/createLink`)
      .post({
        type: 'view',
        scope: 'anonymous',
      });

    return response.link.webUrl;
  }

  /**
   * Получение информации об аккаунте
   */
  async getAccountInfo(): Promise<{ displayName: string; email: string }> {
    if (!this.client) throw new Error('Not authorized');

    const response = await this.client.api('/me').get();

    return {
      displayName: response.displayName,
      email: response.userPrincipalName,
    };
  }
}

// Singleton instance
let onedriveInstance: OneDriveSync | null = null;

export function getOneDriveSync(config?: OneDriveConfig): OneDriveSync {
  if (!onedriveInstance && config) {
    onedriveInstance = new OneDriveSync(config);
  }
  if (!onedriveInstance) {
    throw new Error('OneDrive not initialized. Call with config first.');
  }
  return onedriveInstance;
}

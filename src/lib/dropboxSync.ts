/**
 * Dropbox Sync Integration
 * Синхронизация файлов с Dropbox
 */

import { Dropbox, DropboxAuth } from 'dropbox';

export interface DropboxConfig {
  clientId: string;
  redirectUri: string;
}

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: Date;
  isFolder: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class DropboxSync {
  private dbx: Dropbox | null = null;
  private auth: DropboxAuth;
  private accessToken: string | null = null;

  constructor(config: DropboxConfig) {
    this.auth = new DropboxAuth({
      clientId: config.clientId,
    });
  }

  /**
   * Инициализация OAuth авторизации
   */
  async authorize(): Promise<string> {
    const authUrl = await this.auth.getAuthenticationUrl(
      window.location.origin + '/dropbox-callback',
      undefined,
      'code',
      'offline',
      undefined,
      undefined,
      true
    );
    return authUrl.toString();
  }

  /**
   * Завершение OAuth авторизации
   */
  async completeAuthorization(code: string): Promise<void> {
    this.auth.setCodeVerifier(window.sessionStorage.getItem('codeVerifier') || '');
    const response = await this.auth.getAccessTokenFromCode(
      window.location.origin + '/dropbox-callback',
      code
    );

    this.accessToken = response.result.access_token;
    this.dbx = new Dropbox({
      accessToken: this.accessToken,
    });

    // Сохраняем токен для последующих сессий
    localStorage.setItem('dropbox_access_token', this.accessToken);
  }

  /**
   * Восстановление из сохраненного токена
   */
  restoreSession(): boolean {
    const token = localStorage.getItem('dropbox_access_token');
    if (token) {
      this.accessToken = token;
      this.dbx = new Dropbox({ accessToken: token });
      return true;
    }
    return false;
  }

  /**
   * Проверка авторизации
   */
  isAuthorized(): boolean {
    return !!this.dbx;
  }

  /**
   * Выход из аккаунта
   */
  logout(): void {
    this.accessToken = null;
    this.dbx = null;
    localStorage.removeItem('dropbox_access_token');
  }

  /**
   * Список файлов в папке
   */
  async listFiles(path: string = ''): Promise<DropboxFile[]> {
    if (!this.dbx) throw new Error('Not authorized');

    const response = await this.dbx.filesListFolder({
      path: path || '',
      limit: 1000,
    });

    return response.result.entries.map((entry) => ({
      id: 'id' in entry ? entry.id : entry.path_display || '',
      name: entry.name,
      path: entry.path_display || entry.path_lower || '',
      size: 'size' in entry ? entry.size : 0,
      modified: 'client_modified' in entry ? new Date(entry.client_modified) : new Date(),
      isFolder: entry['.tag'] === 'folder',
    }));
  }

  /**
   * Загрузка файла в Dropbox
   */
  async uploadFile(
    path: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DropboxFile> {
    if (!this.dbx) throw new Error('Not authorized');

    // Для файлов < 150MB используем простую загрузку
    if (file.size < 150 * 1024 * 1024) {
      const response = await this.dbx.filesUpload({
        path: path,
        contents: file,
        mode: { '.tag': 'overwrite' },
        autorename: false,
      });

      onProgress?.({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });

      return {
        id: response.result.id,
        name: response.result.name,
        path: response.result.path_display || '',
        size: response.result.size,
        modified: new Date(response.result.client_modified),
        isFolder: false,
      };
    }

    // Для больших файлов используем chunked upload
    return this.uploadLargeFile(path, file, onProgress);
  }

  /**
   * Chunked upload для больших файлов
   */
  private async uploadLargeFile(
    path: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DropboxFile> {
    if (!this.dbx) throw new Error('Not authorized');

    const chunkSize = 8 * 1024 * 1024; // 8MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    let offset = 0;
    let sessionId: string | undefined;

    for (let i = 0; i < chunks; i++) {
      const chunk = file.slice(offset, offset + chunkSize);

      if (i === 0) {
        // Start session
        const response = await this.dbx.filesUploadSessionStart({
          contents: chunk,
          close: false,
        });
        sessionId = response.result.session_id;
      } else if (i === chunks - 1) {
        // Finish session
        const response = await this.dbx.filesUploadSessionFinish({
          cursor: {
            session_id: sessionId!,
            offset: offset,
          },
          commit: {
            path: path,
            mode: { '.tag': 'overwrite' },
            autorename: false,
          },
          contents: chunk,
        });

        onProgress?.({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });

        return {
          id: response.result.id,
          name: response.result.name,
          path: response.result.path_display || '',
          size: response.result.size,
          modified: new Date(response.result.client_modified),
          isFolder: false,
        };
      } else {
        // Append chunk
        await this.dbx.filesUploadSessionAppendV2({
          cursor: {
            session_id: sessionId!,
            offset: offset,
          },
          contents: chunk,
          close: false,
        });
      }

      offset += chunkSize;
      onProgress?.({
        loaded: Math.min(offset, file.size),
        total: file.size,
        percentage: Math.min((offset / file.size) * 100, 100),
      });
    }

    throw new Error('Upload failed');
  }

  /**
   * Скачивание файла из Dropbox
   */
  async downloadFile(path: string): Promise<Blob> {
    if (!this.dbx) throw new Error('Not authorized');

    const response = await this.dbx.filesDownload({ path });

    // @ts-ignore - fileBlob exists on result
    return response.result.fileBlob;
  }

  /**
   * Удаление файла
   */
  async deleteFile(path: string): Promise<void> {
    if (!this.dbx) throw new Error('Not authorized');

    await this.dbx.filesDeleteV2({ path });
  }

  /**
   * Создание папки
   */
  async createFolder(path: string): Promise<DropboxFile> {
    if (!this.dbx) throw new Error('Not authorized');

    const response = await this.dbx.filesCreateFolderV2({
      path,
      autorename: false,
    });

    return {
      id: response.result.metadata.id,
      name: response.result.metadata.name,
      path: response.result.metadata.path_display || '',
      size: 0,
      modified: new Date(),
      isFolder: true,
    };
  }

  /**
   * Получение информации о файле
   */
  async getFileMetadata(path: string): Promise<DropboxFile> {
    if (!this.dbx) throw new Error('Not authorized');

    const response = await this.dbx.filesGetMetadata({ path });
    const metadata = response.result;

    return {
      id: 'id' in metadata ? metadata.id : '',
      name: metadata.name,
      path: metadata.path_display || metadata.path_lower || '',
      size: 'size' in metadata ? metadata.size : 0,
      modified: 'client_modified' in metadata ? new Date(metadata.client_modified) : new Date(),
      isFolder: metadata['.tag'] === 'folder',
    };
  }

  /**
   * Поиск файлов
   */
  async searchFiles(query: string, path: string = ''): Promise<DropboxFile[]> {
    if (!this.dbx) throw new Error('Not authorized');

    const response = await this.dbx.filesSearchV2({
      query,
      options: {
        path: path || undefined,
        max_results: 100,
      },
    });

    return response.result.matches
      .map((match) => {
        if (match.metadata['.tag'] !== 'metadata') return null;
        const metadata = match.metadata.metadata;

        return {
          id: 'id' in metadata ? metadata.id : '',
          name: metadata.name,
          path: metadata.path_display || metadata.path_lower || '',
          size: 'size' in metadata ? metadata.size : 0,
          modified: 'client_modified' in metadata ? new Date(metadata.client_modified) : new Date(),
          isFolder: metadata['.tag'] === 'folder',
        };
      })
      .filter((file): file is DropboxFile => file !== null);
  }

  /**
   * Получение ссылки для общего доступа
   */
  async getSharedLink(path: string): Promise<string> {
    if (!this.dbx) throw new Error('Not authorized');

    try {
      const response = await this.dbx.sharingCreateSharedLinkWithSettings({
        path,
      });
      return response.result.url;
    } catch (error: any) {
      // Если ссылка уже существует, получаем ее
      if (error.error?.error['.tag'] === 'shared_link_already_exists') {
        const response = await this.dbx.sharingListSharedLinks({ path });
        if (response.result.links.length > 0) {
          return response.result.links[0].url;
        }
      }
      throw error;
    }
  }
}

// Singleton instance
let dropboxInstance: DropboxSync | null = null;

export function getDropboxSync(config?: DropboxConfig): DropboxSync {
  if (!dropboxInstance && config) {
    dropboxInstance = new DropboxSync(config);
  }
  if (!dropboxInstance) {
    throw new Error('Dropbox not initialized. Call with config first.');
  }
  return dropboxInstance;
}

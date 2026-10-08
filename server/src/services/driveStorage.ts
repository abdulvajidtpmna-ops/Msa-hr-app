import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { getDriveClient } from './googleAuth';
import { config } from '../config/env';

import os from 'os';

// In-memory cache for folder IDs to reduce Drive API calls
const folderCache: Map<string, string> = new Map();

function getUploadsDir(): string {
  try {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.join(os.tmpdir(), 'msa_hr', 'uploads');
    }
    return path.resolve(process.cwd(), 'server', 'uploads');
  } catch {
    return path.join(os.tmpdir(), 'msa_hr', 'uploads');
  }
}

const UPLOADS_DIR = getUploadsDir();
const FILE_META_FILE = path.join(UPLOADS_DIR, 'files_meta.json');

interface LocalFileMeta {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  filePath: string;
  createdAt: string;
}

let localFilesMap: Map<string, LocalFileMeta> = new Map();

function ensureUploadsDir() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (localFilesMap.size === 0 && fs.existsSync(FILE_META_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(FILE_META_FILE, 'utf-8'));
        Object.entries(data).forEach(([k, v]) => {
          localFilesMap.set(k, v as LocalFileMeta);
        });
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // In-memory fallback
  }
}

function saveLocalFileMeta() {
  try {
    ensureUploadsDir();
    const obj: Record<string, LocalFileMeta> = {};
    localFilesMap.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(FILE_META_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DriveStorage] Error saving local files metadata:', err);
  }
}

function isGoogleDriveConfigured(): boolean {
  return !!(config.googleServiceAccountEmail && config.googlePrivateKey);
}

export class DriveStorage {
  /**
   * Find or create a folder inside a parent folder
   */
  static async getOrCreateFolder(folderName: string, parentFolderId?: string): Promise<string> {
    if (!isGoogleDriveConfigured()) {
      return `local_folder_${folderName}`;
    }

    const parentId = parentFolderId || config.googleDriveFolderId || 'root';
    const cacheKey = `${parentId}:${folderName}`;

    if (folderCache.has(cacheKey)) {
      return folderCache.get(cacheKey)!;
    }

    try {
      const drive = getDriveClient();

      // Query existing folder
      const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (response.data.files && response.data.files.length > 0) {
        const folderId = response.data.files[0].id!;
        folderCache.set(cacheKey, folderId);
        return folderId;
      }

      // Create new folder
      const createResponse = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        },
        fields: 'id'
      });

      const folderId = createResponse.data.id!;
      folderCache.set(cacheKey, folderId);
      return folderId;
    } catch (err) {
      console.warn(`[DriveStorage] Google Drive folder error, using local folder ID:`, (err as any)?.message);
      return `local_folder_${folderName}`;
    }
  }

  /**
   * Resolves or creates a nested folder path, e.g. ["Recruitment", "JobSlug", "Ref - Name"]
   */
  static async resolveFolderPath(pathSegments: string[], rootFolderId?: string): Promise<string> {
    let currentParentId = rootFolderId || config.googleDriveFolderId || 'root';
    for (const segment of pathSegments) {
      currentParentId = await this.getOrCreateFolder(segment, currentParentId);
    }
    return currentParentId;
  }

  /**
   * Uploads a file buffer/stream to a specific target folder in Drive or local storage
   */
  static async uploadFile(
    fileName: string,
    mimeType: string,
    bufferOrStream: Buffer | Readable,
    targetFolderId: string
  ): Promise<{ fileId: string; webViewLink?: string }> {
    if (isGoogleDriveConfigured()) {
      try {
        const drive = getDriveClient();
        const mediaStream = Buffer.isBuffer(bufferOrStream)
          ? Readable.from(bufferOrStream)
          : bufferOrStream;

        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [targetFolderId]
          },
          media: {
            mimeType,
            body: mediaStream
          },
          fields: 'id, webViewLink, webContentLink'
        });

        return {
          fileId: response.data.id!,
          webViewLink: response.data.webViewLink || undefined
        };
      } catch (err) {
        console.warn(`[DriveStorage] Google Drive upload error. Falling back to local storage:`, (err as any)?.message);
      }
    }

    // Local file storage fallback
    ensureUploadsDir();
    const fileId = `loc_${uuidv4()}`;
    const sanitizedFileName = `${fileId}_${path.basename(fileName)}`;
    const diskPath = path.join(UPLOADS_DIR, sanitizedFileName);

    let buffer: Buffer;
    if (Buffer.isBuffer(bufferOrStream)) {
      buffer = bufferOrStream;
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of bufferOrStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    fs.writeFileSync(diskPath, buffer);

    const meta: LocalFileMeta = {
      fileId,
      fileName,
      mimeType,
      size: buffer.length,
      filePath: diskPath,
      createdAt: new Date().toISOString()
    };

    localFilesMap.set(fileId, meta);
    saveLocalFileMeta();

    return {
      fileId,
      webViewLink: `/api/files/${fileId}/download`
    };
  }

  /**
   * Streams a file from Drive or local storage for authenticated download/preview
   */
  static async getFileStream(fileId: string): Promise<{
    stream: Readable;
    mimeType: string;
    fileName: string;
    size?: number;
  }> {
    ensureUploadsDir();
    if (fileId.startsWith('loc_') || localFilesMap.has(fileId)) {
      const meta = localFilesMap.get(fileId);
      if (meta && fs.existsSync(meta.filePath)) {
        return {
          stream: fs.createReadStream(meta.filePath),
          mimeType: meta.mimeType || 'application/octet-stream',
          fileName: meta.fileName || 'file',
          size: meta.size
        };
      }
    }

    if (isGoogleDriveConfigured()) {
      try {
        const drive = getDriveClient();

        // Get metadata
        const meta = await drive.files.get({
          fileId,
          fields: 'name, mimeType, size'
        });

        // Get media
        const response = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
        );

        return {
          stream: response.data as Readable,
          mimeType: meta.data.mimeType || 'application/octet-stream',
          fileName: meta.data.name || 'file',
          size: meta.data.size ? parseInt(meta.data.size, 10) : undefined
        };
      } catch (err) {
        console.warn('[DriveStorage] Google Drive fetch error:', (err as any)?.message);
      }
    }

    throw new Error(`File not found: ${fileId}`);
  }
}


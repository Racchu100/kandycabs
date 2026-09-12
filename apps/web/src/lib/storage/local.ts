import fs from 'fs';
import path from 'path';
import { StorageProvider, StorageFile, StorageUploadResult } from './types';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    // Files are stored inside uploads/ in project workspace directory
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Sanitizes relative storage path to prevent path traversal attacks (../../etc/passwd)
   */
  private sanitizePath(relativePath: string): string {
    // Normalize path separators and remove leading slashes/backslashes
    const cleanPath = relativePath.replace(/^[\/\\]+/, '').replace(/\.\.[\/\\]/g, '');
    const absolutePath = path.resolve(this.baseDir, cleanPath);

    // Strict security assertion: Resolved path MUST start with baseDir
    if (!absolutePath.startsWith(this.baseDir)) {
      throw new Error(`Security Violation: Path traversal attempt blocked for path: ${relativePath}`);
    }

    return cleanPath;
  }

  async uploadFile(
    driverId: string,
    category: 'documents' | 'vehicle',
    fileKey: string,
    file: StorageFile
  ): Promise<StorageUploadResult> {
    // Safe sanitized driver folder and category directory
    const safeDriverId = driverId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCategory = category === 'documents' ? 'documents' : 'vehicle';
    const safeFileKey = fileKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = file.mimeType === 'application/pdf' ? 'pdf' : 'webp';

    // Target filename & relative path
    const relativePath = `drivers/${safeDriverId}/${safeCategory}/${safeFileKey}.${ext}`;
    const cleanRelativePath = this.sanitizePath(relativePath);
    const targetAbsolutePath = path.resolve(this.baseDir, cleanRelativePath);

    // Create target directory structure automatically
    this.ensureDirectory(path.dirname(targetAbsolutePath));

    // Save file buffer to local filesystem synchronously/async
    await fs.promises.writeFile(targetAbsolutePath, file.buffer);

    return {
      path: cleanRelativePath,
      url: this.getFileUrl(cleanRelativePath),
    };
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    try {
      const cleanPath = this.sanitizePath(relativePath);
      const targetAbsolutePath = path.resolve(this.baseDir, cleanPath);
      if (fs.existsSync(targetAbsolutePath)) {
        await fs.promises.unlink(targetAbsolutePath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[LocalStorage] Failed to delete file ${relativePath}:`, err);
      return false;
    }
  }

  getFileUrl(relativePath: string): string {
    const cleanPath = relativePath.replace(/^[\/\\]+/, '');
    return `/api/driver/documents/file?path=${encodeURIComponent(cleanPath)}`;
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const cleanPath = this.sanitizePath(relativePath);
      const targetAbsolutePath = path.resolve(this.baseDir, cleanPath);
      return fs.existsSync(targetAbsolutePath);
    } catch {
      return false;
    }
  }

  async getFileBuffer(relativePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const cleanPath = this.sanitizePath(relativePath);
      const targetAbsolutePath = path.resolve(this.baseDir, cleanPath);

      if (!fs.existsSync(targetAbsolutePath)) {
        return null;
      }

      const buffer = await fs.promises.readFile(targetAbsolutePath);
      const ext = path.extname(targetAbsolutePath).toLowerCase();
      const mimeType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/webp';

      return { buffer, mimeType };
    } catch (err) {
      console.warn(`[LocalStorage] Error reading file buffer ${relativePath}:`, err);
      return null;
    }
  }
}

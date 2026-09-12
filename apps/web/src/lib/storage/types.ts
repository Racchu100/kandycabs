/**
 * Unified Storage Interface for Driver Document System
 * 
 * Abstracted interface so local filesystem storage can be swapped
 * for Supabase Storage (or S3) seamlessly in the future without changing
 * frontend UI or API contracts.
 */

export interface StorageFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export interface StorageUploadResult {
  /**
   * Relative storage path stored in PostgreSQL / Prisma
   * e.g., "drivers/d_123/documents/license.webp" or "drivers/d_123/vehicle/front.webp"
   */
  path: string;
  /**
   * Protected access URL to retrieve/serve the file safely
   * e.g., "/api/driver/documents/file?path=drivers/d_123/documents/license.webp"
   */
  url: string;
}

export interface StorageProvider {
  /**
   * Upload a file to storage under a driver's category folder
   */
  uploadFile(
    driverId: string,
    category: 'documents' | 'vehicle',
    fileKey: string,
    file: StorageFile
  ): Promise<StorageUploadResult>;

  /**
   * Delete a file from storage by relative path
   */
  deleteFile(path: string): Promise<boolean>;

  /**
   * Generate access URL for serving/viewing a file
   */
  getFileUrl(path: string): string;

  /**
   * Check if a file exists in storage
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Retrieve binary buffer for serving file safely (for protected file server)
   */
  getFileBuffer(path: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
}

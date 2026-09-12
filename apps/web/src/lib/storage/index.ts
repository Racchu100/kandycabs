import { StorageProvider } from './types';
import { LocalStorageProvider } from './local';

export * from './types';
export * from './optimizer';
export * from './local';

// Default storage provider factory instance
// In the future, this can switch to `new SupabaseStorageProvider()` based on process.env.STORAGE_PROVIDER
export const storageProvider: StorageProvider = new LocalStorageProvider();

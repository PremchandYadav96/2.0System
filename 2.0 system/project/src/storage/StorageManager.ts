import { compress, decompress } from '../utils/compression';
import { encrypt, decrypt } from '../utils/encryption';

export class StorageManager {
  private readonly PREFIX = 'health_';
  private readonly VERSION = 'v1';

  async save<T>(key: string, data: T): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      const compressed = await compress(serialized);
      const encrypted = await encrypt(compressed);
      
      localStorage.setItem(
        `${this.PREFIX}${this.VERSION}_${key}`,
        encrypted
      );
    } catch (error) {
      console.error('Storage error:', error);
      throw new Error('Failed to save data');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(
        `${this.PREFIX}${this.VERSION}_${key}`
      );
      
      if (!encrypted) return null;
      
      const compressed = await decrypt(encrypted);
      const serialized = await decompress(compressed);
      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error('Retrieval error:', error);
      return null;
    }
  }

  async getStorageStats(): Promise<{
    used: number;
    available: number;
    percentUsed: number;
  }> {
    const estimate = await navigator.storage?.estimate();
    return {
      used: estimate?.usage || 0,
      available: estimate?.quota || 0,
      percentUsed: (estimate?.usage || 0) / (estimate?.quota || 1) * 100
    };
  }
}
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SecurityManager } from '../security/encryption';

interface MedicalAnalyzerDB extends DBSchema {
  reports: {
    key: string;
    value: {
      id: string;
      encryptedData: string;
      signature: string;
      timestamp: number;
      version: number;
    };
    indexes: {
      'by-timestamp': number;
    };
  };
  models: {
    key: string;
    value: {
      id: string;
      type: string;
      data: ArrayBuffer;
      version: number;
      timestamp: number;
    };
  };
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: IDBPDatabase<MedicalAnalyzerDB> | null = null;
  private securityManager: SecurityManager;
  private readonly DB_NAME = 'medical-analyzer';
  private readonly DB_VERSION = 1;

  private constructor() {
    this.securityManager = SecurityManager.getInstance();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<MedicalAnalyzerDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade: (db, oldVersion, newVersion, transaction) => {
          // Reports store
          if (!db.objectStoreNames.contains('reports')) {
            const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
            reportStore. <boltAction type="file" filePath="src/services/storage/database.ts">            reportStore.createIndex('by-timestamp', 'timestamp');
          }

          // Models store
          if (!db.objectStoreNames.contains('models')) {
            db.createObjectStore('models', { keyPath: 'id' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async saveReport(id: string, data: string): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const encryptedData = await this.securityManager.encryptData(data);
      await this.db!.put('reports', {
        id,
        encryptedData: encryptedData.data,
        signature: encryptedData.signature,
        timestamp: encryptedData.timestamp,
        version: 1,
      });
    } catch (error) {
      console.error('Failed to save report:', error);
      throw error;
    }
  }

  async getReport(id: string): Promise<string> {
    if (!this.db) await this.initialize();

    try {
      const encryptedReport = await this.db!.get('reports', id);
      if (!encryptedReport) {
        throw new Error('Report not found');
      }

      const decryptedData = await this.securityManager.decryptData({
        data: encryptedReport.encryptedData,
        signature: encryptedReport.signature,
        timestamp: encryptedReport.timestamp,
      });

      return decryptedData;
    } catch (error) {
      console.error('Failed to retrieve report:', error);
      throw error;
    }
  }

  async getAllReports(): Promise<string[]> {
    if (!this.db) await this.initialize();

    try {
      const encryptedReports = await this.db!.getAllFromIndex('reports', 'by-timestamp');
      const decryptedReports = await Promise.all(
        encryptedReports.map(async (report) => {
          return this.securityManager.decryptData({
            data: report.encryptedData,
            signature: report.signature,
            timestamp: report.timestamp,
          });
        })
      );

      return decryptedReports;
    } catch (error) {
      console.error('Failed to retrieve reports:', error);
      throw error;
    }
  }

  async saveModel(id: string, type: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      await this.db!.put('models', {
        id,
        type,
        data,
        version: 1,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save model:', error);
      throw error;
    }
  }

  async getModel(id: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.initialize();

    try {
      const model = await this.db!.get('models', id);
      return model ? model.data : null;
    } catch (error) {
      console.error('Failed to retrieve model:', error);
      throw error;
    }
  }

  async exportData(): Promise<Blob> {
    if (!this.db) await this.initialize();

    try {
      const reports = await this.db!.getAll('reports');
      const models = await this.db!.getAll('models');
      
      const exportData = {
        version: this.DB_VERSION,
        timestamp: Date.now(),
        reports,
        models: models.map(model => ({
          ...model,
          data: Array.from(new Uint8Array(model.data)),
        })),
      };

      const encryptedExport = await this.securityManager.encryptData(
        JSON.stringify(exportData)
      );

      return new Blob([JSON.stringify(encryptedExport)], {
        type: 'application/json',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(importBlob: Blob): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const importText = await importBlob.text();
      const encryptedData = JSON.parse(importText);
      const decryptedData = await this.securityManager.decryptData(encryptedData);
      const importedData = JSON.parse(decryptedData);

      if (importedData.version > this.DB_VERSION) {
        throw new Error('Import data version is newer than current database version');
      }

      const tx = this.db!.transaction(['reports', 'models'], 'readwrite');

      // Import reports
      for (const report of importedData.reports) {
        await tx.store.put('reports', report);
      }

      // Import models
      for (const model of importedData.models) {
        await tx.store.put('models', {
          ...model,
          data: new Uint8Array(model.data).buffer,
        });
      }

      await tx.done;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
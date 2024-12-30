import { openDB } from 'idb';
import { MedicalReport } from '../types';

const DB_NAME = 'medical-analyzer';
const REPORTS_STORE = 'reports';

export const initDB = async () => {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(REPORTS_STORE)) {
        const store = db.createObjectStore(REPORTS_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });
  return db;
};

export const saveReport = async (report: MedicalReport) => {
  const db = await initDB();
  return db.put(REPORTS_STORE, report);
};

export const getReports = async () => {
  const db = await initDB();
  return db.getAllFromIndex(REPORTS_STORE, 'timestamp');
};
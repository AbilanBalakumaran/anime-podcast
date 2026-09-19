/**
 * IndexedDB Database Manager
 * Permet de stocker et synchroniser les mascottes personnalisées avec leurs 5 poses
 * directement dans le stockage persistant du navigateur.
 */

const DB_NAME = 'anime_podcast_db';
const DB_VERSION = 1;
const STORE_MASCOTS = 'mascots';

export class DBManager {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_MASCOTS)) {
          const store = db.createObjectStore(STORE_MASCOTS, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[DB] Erreur d\'ouverture IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getAllMascots() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MASCOTS, 'readonly');
      const store = transaction.objectStore(STORE_MASCOTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getMascotById(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MASCOTS, 'readonly');
      const store = transaction.objectStore(STORE_MASCOTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async saveMascot(mascot) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MASCOTS, 'readwrite');
      const store = transaction.objectStore(STORE_MASCOTS);

      const dataToSave = {
        ...mascot,
        updatedAt: Date.now()
      };

      const request = store.put(dataToSave);
      request.onsuccess = () => resolve(dataToSave);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteMascot(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MASCOTS, 'readwrite');
      const store = transaction.objectStore(STORE_MASCOTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

export const dbManager = new DBManager();

/**
 * IndexedDB Database Manager - Anime Podcast Studio
 * Gère le stockage persistant des mascottes avec support multi-émotions et multi-poses par émotion.
 */

const DB_NAME = 'anime_podcast_db';
const DB_VERSION = 2; // Version 2 pour la migration vers structure multi-émotions
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

      request.onsuccess = () => {
        const rawMascots = request.result || [];
        // Migration à la volée de l'ancien format `poses` vers `emotions`
        const migrated = rawMascots.map(m => {
          if (!m.emotions && m.poses) {
            m.emotions = {};
            for (const [key, val] of Object.entries(m.poses)) {
              m.emotions[key] = Array.isArray(val) ? val : [val];
            }
          }
          return m;
        });
        resolve(migrated);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getMascotById(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_MASCOTS, 'readonly');
      const store = transaction.objectStore(STORE_MASCOTS);
      const request = store.get(id);

      request.onsuccess = () => {
        const m = request.result || null;
        if (m && !m.emotions && m.poses) {
          m.emotions = {};
          for (const [key, val] of Object.entries(m.poses)) {
            m.emotions[key] = Array.isArray(val) ? val : [val];
          }
        }
        resolve(m);
      };
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

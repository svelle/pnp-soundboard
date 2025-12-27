// IndexedDB Manager - Low-level database operations

import { DB_NAME, DB_VERSION, SOUNDS_STORE, SETTINGS_STORE } from '../utils/constants.js';

export class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize and open the IndexedDB database
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create sounds object store
        if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
          const soundsStore = db.createObjectStore(SOUNDS_STORE, { keyPath: 'id' });
          soundsStore.createIndex('category', 'category', { unique: false });
          soundsStore.createIndex('dateAdded', 'dateAdded', { unique: false });
        }

        // Create settings object store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Add a new record to an object store
   * @param {string} storeName - Name of the object store
   * @param {Object} data - Data to add
   * @returns {Promise<string>} ID of added record
   */
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to add data to ${storeName}`));
      };
    });
  }

  /**
   * Get a record by ID from an object store
   * @param {string} storeName - Name of the object store
   * @param {string} id - ID of the record
   * @returns {Promise<Object>} Retrieved record
   */
  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get data from ${storeName}`));
      };
    });
  }

  /**
   * Get all records from an object store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<Array>} Array of all records
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all data from ${storeName}`));
      };
    });
  }

  /**
   * Get all records matching an index value
   * @param {string} storeName - Name of the object store
   * @param {string} indexName - Name of the index
   * @param {*} value - Value to match
   * @returns {Promise<Array>} Array of matching records
   */
  async getAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get data by index from ${storeName}`));
      };
    });
  }

  /**
   * Update a record in an object store
   * @param {string} storeName - Name of the object store
   * @param {Object} data - Data to update (must include id)
   * @returns {Promise<string>} ID of updated record
   */
  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to update data in ${storeName}`));
      };
    });
  }

  /**
   * Delete a record from an object store
   * @param {string} storeName - Name of the object store
   * @param {string} id - ID of the record to delete
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete data from ${storeName}`));
      };
    });
  }

  /**
   * Clear all records from an object store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear ${storeName}`));
      };
    });
  }
}

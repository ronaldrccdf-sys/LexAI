
const DB_NAME = 'LexAI_Storage';
const STORE_NAME = 'ClientFiles';

export interface StoredFile {
  id: string;
  clientId: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 ou Blob URL
  date: string;
}

export const fileStorage = {
  init: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  saveFile: async (file: StoredFile): Promise<void> => {
    const db = await fileStorage.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getClientFiles: async (clientId: string): Promise<StoredFile[]> => {
    const db = await fileStorage.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const allFiles = request.result as StoredFile[];
        resolve(allFiles.filter(f => f.clientId === clientId));
      };
      request.onerror = () => reject(request.error);
    });
  },

  deleteFile: async (id: string): Promise<void> => {
    const db = await fileStorage.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

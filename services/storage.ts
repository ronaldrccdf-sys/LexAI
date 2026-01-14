
import { api } from './api';

export interface StoredFile {
  id: string;
  clientId: string;
  name: string;
  type: string;
  size: number;
  data: string;
  date: string;
}

export const fileStorage = {
  saveFile: async (file: StoredFile): Promise<void> => {
    await api.createFile(file);
  },

  getClientFiles: async (clientId: string): Promise<StoredFile[]> => {
    return api.getFiles(clientId);
  },

  deleteFile: async (id: string): Promise<void> => {
    await api.deleteFile(id);
  }
};


import { api } from './api';

export interface DatajudMovement {
  id: string | number;
  data: string;
  conteudo: string;
  nome?: string;
}

export interface DatajudProcess {
  id: string;
  numero_cnj: string;
  classe?: string;
  tribunal: string;
  orgao_julgador?: string;
  data_ajuizamento?: string;
  movimentacoes: DatajudMovement[];
  partes: {
    nome: string;
    tipo: 'ATIVO' | 'PASSIVO';
  }[];
}

export const datajudService = {
  async getProcessByCNJ(cnj: string): Promise<DatajudProcess | null> {
    try {
      const result = await api.getDatajudProcess(cnj);
      return result;
    } catch (error: any) {
      console.warn("Aviso DATAJUD: Erro de conexão com backend.", error.message);
      return null;
    }
  }
};

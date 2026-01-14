
import * as mammoth from "mammoth";
import { api } from './api';

export interface JurisprudenceItem {
  id: string;
  title: string;
  summary: string;
  uri: string;
}

export interface DoctrineItem {
  id: string;
  title: string;
  summary: string;
  uri: string;
  source?: string;
}

export interface JurisprudenceFilters {
  court?: string;
  startDate?: string;
  endDate?: string;
  caseType?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  data: string; // Base64
  type: string;
  role: 'template' | 'source';
}

const GEMINI_NATIVE_MIMES = [
  'image/png', 
  'image/jpeg', 
  'image/webp', 
  'application/pdf'
];

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const extractTextFromWord = async (base64: string): Promise<string> => {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (e) {
    console.error("Erro ao processar Word:", e);
    return "[Erro na extração de texto do arquivo Word]";
  }
};

export const convertWordToHtml = async (base64: string): Promise<string> => {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64);
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  } catch (e) {
    console.error("Erro ao converter Word para HTML:", e);
    return "";
  }
};

export const legalAssistantService = {
  async generateDailyBriefing(stats: any, userName: string) {
    return api.aiDailyBriefing(stats, userName);
  },

  async searchJurisprudence(query: string, filters: JurisprudenceFilters): Promise<JurisprudenceItem[]> {
    return api.aiSearchJurisprudence(query);
  },

  async searchDoctrines(query: string): Promise<DoctrineItem[]> {
    return api.aiSearchDoctrines(query);
  },

  async advancedLegalDrafting(params: { 
    prompt: string, 
    files: UploadedFile[], 
    jurisprudence?: JurisprudenceItem[],
    doctrines?: DoctrineItem[] 
  }) {
    const payload = {
      prompt: params.prompt,
      files: await Promise.all(params.files.map(async (f) => ({
        ...f,
        data: GEMINI_NATIVE_MIMES.includes(f.type) ? f.data : await extractTextFromWord(f.data)
      }))),
      jurisprudence: params.jurisprudence,
      doctrines: params.doctrines
    };
    return api.aiAdvancedDrafting(payload);
  },

  async interpretMovement(movement: string) {
    return api.aiInterpretMovement(movement);
  },

  async smartTimeEntry(description: string) {
    return api.aiSmartTimeEntry(description);
  },

  async extractHearingData(base64: string, mimeType: string) {
    return api.aiExtractData({ base64, mimeType, prompt: 'Extraia dados de audiência em JSON.' });
  },

  async extractClientOnboardingData(base64: string, mimeType: string) {
    return api.aiExtractData({ base64, mimeType, prompt: 'Extraia dados do cliente em JSON.' });
  },

  async extractProcessDataFromDoc(base64: string, mimeType: string) {
    return api.aiExtractData({ base64, mimeType, prompt: 'Extraia dados do processo em JSON.' });
  },

  async extractContractData(base64: string, mimeType: string) {
    return api.aiExtractData({ base64, mimeType, prompt: 'Extraia dados do contrato em JSON.' });
  },

  async extractExecutionData(base64: string, mimeType: string) {
    return api.aiExtractData({ base64, mimeType, prompt: 'Extraia dados de execução em JSON.' });
  },

  async unifiedActionHandler(query: string, files: UploadedFile[], currentData: any) {
    const response = await api.aiUnifiedAction({ query, files, appContext: currentData });
    return { text: response.text, toolCalls: [] };
  },

  async generateDailySummaryWhatsApp(events: any[]) {
    return api.aiWhatsappSummary(events);
  },

  async generateBillingActivityReport(clientName: string, period: string, events: any[]) {
    return api.aiBillingReport(clientName, period, events);
  },

  async generateManagementAnalysis(data: any) {
    return api.aiManagementAnalysis(data);
  },

  async answerManagementQuery(query: string, data: any) {
    return api.aiAnswerManagementQuery(query, data);
  }
};

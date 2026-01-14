import { AgendaEvent, BillingCycle, Case, Contact, Hearing, Contract, LegalExecution } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ApiResponse<T> = { data: T };

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error ? JSON.stringify(error.error) : 'Erro na API');
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const payload = (await res.json()) as ApiResponse<T>;
  return payload.data;
};

export const api = {
  health: () => request<{ status: string }>('/api/health'),
  getDatajudProcess: (cnj: string) => request<any | null>('/api/datajud/process', { method: 'POST', body: JSON.stringify({ cnj }) }),
  getContacts: () => request<Contact[]>('/api/contacts'),
  createContact: (payload: Contact) => request<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(payload) }),
  getContracts: () => request<Contract[]>('/api/contracts'),
  createContract: (payload: Contract) => request<Contract>('/api/contracts', { method: 'POST', body: JSON.stringify(payload) }),
  getMatters: () => request<Case[]>('/api/matters'),
  createMatter: (payload: Case) => request<Case>('/api/matters', { method: 'POST', body: JSON.stringify(payload) }),
  updateMatter: (id: string, payload: Partial<Pick<Case, 'lastMovementSummary' | 'updates'>>) =>
    request<Case>(`/api/matters/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getHearings: () => request<Hearing[]>('/api/hearings'),
  createHearing: (payload: Hearing) => request<Hearing>('/api/hearings', { method: 'POST', body: JSON.stringify(payload) }),
  updateHearing: (id: string, payload: Partial<Pick<Hearing, 'result' | 'notes'>>) =>
    request<Hearing>(`/api/hearings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getAgenda: () => request<AgendaEvent[]>('/api/agenda'),
  createAgendaEvent: (payload: AgendaEvent) => request<AgendaEvent>('/api/agenda', { method: 'POST', body: JSON.stringify(payload) }),
  getActivities: () => request<{ id: string; matter: string; description: string; duration: string; createdAt?: string }[]>('/api/activities'),
  createActivity: (payload: { matter: string; description: string; duration: string }) => request<{ id: string; matter: string; description: string; duration: string; createdAt?: string }>('/api/activities', { method: 'POST', body: JSON.stringify(payload) }),
  getExecutions: () => request<LegalExecution[]>('/api/executions'),
  createExecution: (payload: LegalExecution) => request<LegalExecution>('/api/executions', { method: 'POST', body: JSON.stringify(payload) }),
  getFiles: (clientId?: string) => request<{ id: string; clientId: string; name: string; type: string; size: number; data: string; date: string }[]>(`/api/files${clientId ? `?clientId=${clientId}` : ''}`),
  createFile: (payload: { clientId: string; name: string; type: string; size: number; data: string; date: string }) =>
    request<{ id: string; clientId: string; name: string; type: string; size: number; data: string; date: string }>('/api/files', { method: 'POST', body: JSON.stringify(payload) }),
  deleteFile: (id: string) => request<void>(`/api/files/${id}`, { method: 'DELETE' }),
  getBillingCycles: () => request<BillingCycle[]>('/api/billing/cycles'),
  createBillingCycle: (payload: Omit<BillingCycle, 'id'>) => request<BillingCycle>('/api/billing/cycles', { method: 'POST', body: JSON.stringify(payload) }),
  updateBillingCycle: (id: string, payload: Partial<Pick<BillingCycle, 'status' | 'requirements'>>) => request<BillingCycle>(`/api/billing/cycles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  syncBilling: () => request<{ message: string; syncedAt: string }>('/api/billing/sync', { method: 'POST' }),
  aiDailyBriefing: (stats: any, userName: string) => request<string>('/api/ai/daily-briefing', { method: 'POST', body: JSON.stringify({ stats, userName }) }),
  aiInterpretMovement: (movement: string) => request<string>('/api/ai/interpret-movement', { method: 'POST', body: JSON.stringify({ movement }) }),
  aiSmartTimeEntry: (description: string) => request<string>('/api/ai/smart-time-entry', { method: 'POST', body: JSON.stringify({ description }) }),
  aiManagementAnalysis: (firmData: any) => request<string>('/api/ai/management-analysis', { method: 'POST', body: JSON.stringify({ firmData }) }),
  aiAnswerManagementQuery: (query: string, firmData: any) => request<string>('/api/ai/answer-management-query', { method: 'POST', body: JSON.stringify({ query, firmData }) }),
  aiBillingReport: (clientName: string, period: string, events: any[]) =>
    request<string>('/api/ai/billing-report', { method: 'POST', body: JSON.stringify({ clientName, period, events }) }),
  aiWhatsappSummary: (events: any[]) => request<string>('/api/ai/whatsapp-summary', { method: 'POST', body: JSON.stringify({ events }) }),
  aiSearchJurisprudence: (query: string) => request<any[]>('/api/ai/search-jurisprudence', { method: 'POST', body: JSON.stringify({ query }) }),
  aiSearchDoctrines: (query: string) => request<any[]>('/api/ai/search-doctrines', { method: 'POST', body: JSON.stringify({ query }) }),
  aiAdvancedDrafting: (payload: any) => request<{ html: string }>('/api/ai/advanced-drafting', { method: 'POST', body: JSON.stringify(payload) }),
  aiExtractData: (payload: { base64: string; mimeType: string; prompt: string }) =>
    request<any>('/api/ai/extract-data', { method: 'POST', body: JSON.stringify(payload) }),
  aiUnifiedAction: (payload: { query: string; files: any[]; appContext: any }) =>
    request<{ text: string }>('/api/ai/unified-action', { method: 'POST', body: JSON.stringify(payload) })
};

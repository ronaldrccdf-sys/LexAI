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
  syncBilling: () => request<{ message: string; syncedAt: string }>('/api/billing/sync', { method: 'POST' })
};

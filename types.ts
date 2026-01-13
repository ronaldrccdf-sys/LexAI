
export type CaseType = 'Conhecimento' | 'Execução' | 'Cumprimento de Sentença' | 'Consultivo' | 'Administrativo' | 'Cível' | 'Trabalhista' | 'Criminal';
export type ContractType = 'Mensalidade fixa' | 'Honorários de êxito' | 'Híbrido';
export type ExecutionStatus = 'Em curso' | 'Em acordo' | 'Inadimplente' | 'Quitada' | 'Frustrada';
export type HearingType = 'Conciliação' | 'Instrução' | 'Julgamento' | 'Mediação' | 'Justificação';
export type HearingResult = 'Acordo firmado' | 'Sem acordo' | 'Redesignada' | 'Suspensa';
export type BillingStatus = 'Em preparação' | 'Documentação pendente' | 'Pronto para envio' | 'Enviado para pagamento' | 'Pago' | 'Em atraso';

export interface BillingCycle {
  id: string;
  clientId: string;
  clientName: string;
  period: string;
  type: ContractType;
  baseValue: number;
  successFeeValue: number;
  totalValue: number;
  status: BillingStatus;
  requirements: {
    nf: boolean;
    certidaoFederal: boolean;
    certidaoEstadual: boolean;
    certidaoMunicipal: boolean;
    certidaoFGTS: boolean;
    certidaoTrabalhista: boolean;
    activityReport: boolean;
  };
  dueDate: string;
}

export interface Hearing {
  id: string;
  matterId: string;
  matterNumber: string;
  clientId: string;
  clientName: string;
  type: HearingType;
  date: string;
  time: string;
  court: string;
  modality: 'Presencial' | 'Telepresencial';
  responsible: string;
  settlementProbability: number;
  valueInvolved: number;
  result?: HearingResult;
  notes?: string;
}

export interface AgendaEvent {
  id: string;
  type: 'Audiência' | 'Prazo' | 'Reunião' | 'Compromisso';
  date: string;
  timeStart: string;
  timeEnd: string;
  sourceId: string;
  matterId?: string;
  clientName?: string;
  responsible: string;
  title: string;
}

export interface Contract {
  id: string;
  clientId: string;
  type: ContractType;
  successPercentage?: number;
  monthlyValue?: number;
  validity: string;
  status: 'Ativo' | 'Vencido' | 'Suspenso' | 'Rescindido';
  adjustments: string;
  specialConditions: string;
}

export interface CaseUpdate {
  id: string;
  date: string;
  content: string;
  source: string;
  type: string;
}

export interface Case {
  id: string;
  number: string;
  title: string;
  client: string;
  opposingParty?: string; // Novo Campo
  status: 'Aberto' | 'Fechado' | 'Pendente';
  type: CaseType;
  responsible: string;
  openDate: string;
  billableHours: number;
  value?: number;
  currentSituation?: string;
  lastMovementSummary?: string; // Novo Campo
  finalDeadline?: string;
  nextDeadline?: string;
  notificationDate?: string;
  termStartDate?: string;
  updates?: CaseUpdate[];
}

export interface LegalExecution {
  id: string;
  clientId: string;
  matterId: string;
  contractId: string;
  defendant: string;
  origin: 'Acordo' | 'Sentença' | 'Confissão';
  valueExecuted: number;
  valueRecovered: number;
  feePercentage: number;
  feesDue: number;
  feesPaid: number;
  status: ExecutionStatus;
}

export interface Contact {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  type: 'Individual' | 'Empresa';
  totalMatters: number;
  folderId: string;
  financialStatus?: 'Em dia' | 'Inadimplente' | 'Acordos em curso';
  category?: 'Recorrente' | 'Contencioso em massa' | 'Novo (IA)';
  lastMovement?: string;
}

export type View = 'dashboard' | 'processos' | 'contatos' | 'audiencias' | 'agenda' | 'faturamento' | 'estudio-ia' | 'relatorios';

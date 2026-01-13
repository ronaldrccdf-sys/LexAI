
import React, { useState, useEffect, useRef } from 'react';
import { Contact, Case, Contract, LegalExecution, CaseType, ExecutionStatus, BillingCycle } from '../types';
import { legalAssistantService } from '../services/gemini';
import { fileStorage, StoredFile } from '../services/storage';

interface ContactsProps {
  externalContacts: Contact[];
  setExternalContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

const Contacts: React.FC<ContactsProps> = ({ externalContacts, setExternalContacts }) => {
  // Synchronize local contacts with external contacts from props
  const [contacts, setContacts] = useState<Contact[]>(externalContacts);

  useEffect(() => {
    setContacts(externalContacts);
  }, [externalContacts]);

  // Wrapper to update both local and parent state
  const updateContacts = (newContacts: Contact[]) => {
    setContacts(newContacts);
    setExternalContacts(newContacts);
  };

  const [contracts, setContracts] = useState<Contract[]>([
    { id: 'c1', clientId: '1', type: 'Híbrido', monthlyValue: 2500, successPercentage: 20, validity: '31/12/2025', status: 'Ativo', adjustments: 'IPCA anual', specialConditions: 'Assessoria extra-judicial' }
  ]);

  const [billingCycles] = useState<BillingCycle[]>([
    {
      id: 'cy1',
      clientId: '1',
      clientName: 'Maria Souza',
      period: 'Novembro 2023',
      type: 'Híbrido',
      baseValue: 2500,
      successFeeValue: 1200,
      totalValue: 3700,
      status: 'Pago',
      requirements: { nf: true, certidaoFederal: true, certidaoEstadual: true, certidaoMunicipal: true, certidaoFGTS: true, certidaoTrabalhista: true, activityReport: true },
      dueDate: '2023-11-10'
    }
  ]);

  const [cases, setCases] = useState<Case[]>([
    { id: 'ca1', number: '1000234-12.2023.8.26.0100', title: 'Inventário Souza', client: 'Maria Souza', status: 'Aberto', type: 'Conhecimento', responsible: 'Dr. Ronald Serra', openDate: '12/01/2023', billableHours: 42, currentSituation: 'Aguardando manifestação' }
  ]);

  const [executions, setExecutions] = useState<LegalExecution[]>([
    { id: 'ex1', clientId: '2', matterId: 'ca2', contractId: 'c2', defendant: 'João Silva', origin: 'Acordo', valueExecuted: 15000, valueRecovered: 5000, feePercentage: 10, feesDue: 1500, feesPaid: 500, status: 'Em curso' }
  ]);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'cases' | 'executions' | 'financial' | 'docs' | 'alerts' | 'intel'>('overview');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [clientFiles, setClientFiles] = useState<StoredFile[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // States for Onboarding Modal
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [isConfirmingOnboarding, setIsConfirmingOnboarding] = useState(false);
  const [onboardingFile, setOnboardingFile] = useState<any>(null);
  
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  useEffect(() => {
    if (selectedContactId) {
      fileStorage.getClientFiles(selectedContactId).then(setClientFiles);
    }
  }, [selectedContactId]);

  const handleSmartIngest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAI(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Full = reader.result as string;
        const base64Data = base64Full.split(',')[1];
        
        const result = await legalAssistantService.extractClientOnboardingData(base64Data, file.type);
        
        // Logic to check if client already exists
        const existingClient = contacts.find(c => 
          c.name.toLowerCase().includes(result.clientName?.toLowerCase() || '') ||
          (result.document && c.document.replace(/\D/g, '') === result.document.replace(/\D/g, ''))
        );

        setOnboardingData({ ...result, existingClient });
        setOnboardingFile({ name: file.name, data: base64Full, type: file.type, size: file.size });
        setIsConfirmingOnboarding(true);
        setIsProcessingAI(false);
      };
    } catch (err) {
      alert("Erro na ingestão inteligente LexAI.");
      setIsProcessingAI(false);
    }
  };

  const confirmOnboarding = async () => {
    if (!onboardingData) return;

    let targetClientId = '';

    if (onboardingData.existingClient) {
      targetClientId = onboardingData.existingClient.id;
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      const newContact: Contact = {
        id: newId,
        name: onboardingData.clientName,
        document: onboardingData.document || 'Pendente',
        email: onboardingData.email || '',
        phone: onboardingData.phone || '',
        type: onboardingData.document?.length > 14 ? 'Empresa' : 'Individual',
        totalMatters: 1,
        folderId: `folder_${newId}`,
        category: 'Novo (IA)',
        financialStatus: 'Em dia',
        lastMovement: `Cliente cadastrado via LexAI a partir de: ${onboardingData.documentType || 'Documento'}`
      };
      updateContacts([newContact, ...contacts]);
      targetClientId = newId;
    }

    // Save File
    if (onboardingFile) {
      await fileStorage.saveFile({
        id: Math.random().toString(36).substr(2, 9),
        clientId: targetClientId,
        name: `ONBOARDING - ${onboardingFile.name}`,
        type: onboardingFile.type,
        size: onboardingFile.size,
        data: onboardingFile.data,
        date: new Date().toLocaleDateString('pt-BR')
      });
    }

    setIsConfirmingOnboarding(false);
    setSelectedContactId(targetClientId);
    setActiveTab('docs');
    setOnboardingData(null);
  };

  const handleSmartUploadInside = async (e: React.ChangeEvent<HTMLInputElement>, submodule: 'contract' | 'case' | 'execution' | 'doc') => {
    const file = e.target.files?.[0];
    if (!file || !selectedContactId) return;

    setIsProcessingAI(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Full = reader.result as string;
        const base64Data = base64Full.split(',')[1];
        
        let extractionResult: any = null;

        if (submodule === 'contract') {
          extractionResult = await legalAssistantService.extractContractData(base64Data, file.type);
          const newContract: Contract = {
            id: Math.random().toString(36).substr(2, 9),
            clientId: selectedContactId,
            type: extractionResult.type as any || 'Híbrido',
            monthlyValue: extractionResult.monthlyValue,
            successPercentage: extractionResult.successPercentage,
            validity: extractionResult.validity || 'Indeterminada',
            status: 'Ativo',
            adjustments: extractionResult.adjustments || 'Nenhum',
            specialConditions: extractionResult.specialConditions || 'Nenhuma'
          };
          setContracts(prev => [...prev, newContract]);
        } else if (submodule === 'case') {
          extractionResult = await legalAssistantService.extractProcessDataFromDoc(base64Data, file.type);
          const newCase: Case = {
            id: Math.random().toString(36).substr(2, 9),
            number: extractionResult.number || '0000000-00.0000.0.00.0000',
            title: extractionResult.title || 'Novo Processo',
            client: selectedContact?.name || '',
            status: 'Aberto',
            type: extractionResult.type as any || 'Conhecimento',
            responsible: 'Dr. Ronald Serra',
            openDate: new Date().toLocaleDateString('pt-BR'),
            billableHours: 0,
            currentSituation: 'Novo caso criado via upload'
          };
          setCases(prev => [...prev, newCase]);
        } else if (submodule === 'execution') {
          extractionResult = await legalAssistantService.extractExecutionData(base64Data, file.type);
          const newExecution: LegalExecution = {
            id: Math.random().toString(36).substr(2, 9),
            clientId: selectedContactId,
            matterId: 'ca-manual',
            contractId: 'c-manual',
            defendant: extractionResult.defendant || 'Réu Desconhecido',
            origin: extractionResult.origin as any || 'Acordo',
            valueExecuted: extractionResult.valueExecuted || 0,
            valueRecovered: 0,
            feePercentage: extractionResult.feePercentage || 20,
            feesDue: (extractionResult.valueExecuted || 0) * ((extractionResult.feePercentage || 20) / 100),
            feesPaid: 0,
            status: 'Em curso'
          };
          setExecutions(prev => [...prev, newExecution]);
        }

        await fileStorage.saveFile({
          id: Math.random().toString(36).substr(2, 9),
          clientId: selectedContactId,
          name: `${submodule.toUpperCase()} - ${file.name}`,
          type: file.type,
          size: file.size,
          data: base64Full,
          date: new Date().toLocaleDateString('pt-BR')
        });

        const updated = await fileStorage.getClientFiles(selectedContactId);
        setClientFiles(updated);
        setIsProcessingAI(false);
      };
    } catch (err) {
      alert("Erro no processamento LexAI.");
      setIsProcessingAI(false);
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview': return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn text-left">
          <div className="md:col-span-2 space-y-6">
            <div className="graphite-light p-8 rounded-3xl border border-gray-800 shadow-xl">
              <h3 className="text-lg font-black mb-6 gold-text uppercase tracking-tighter">Painel do Cliente</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-800/50">
                  <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Processos</p>
                  <p className="text-2xl font-black">{cases.filter(c => c.client === selectedContact?.name).length}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-800/50">
                  <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Execuções</p>
                  <p className="text-2xl font-black">{executions.filter(e => e.clientId === selectedContactId).length}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-800/50">
                  <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Receita Fixa</p>
                  <p className="text-xl font-black text-green-400">R$ {contracts.find(c => c.clientId === selectedContactId)?.monthlyValue || 0}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-800/50">
                  <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Saúde Fin.</p>
                  <p className="text-xs font-black text-green-500 uppercase">{selectedContact?.financialStatus}</p>
                </div>
              </div>
            </div>
            <div className="graphite-light p-8 rounded-3xl border border-gray-800 shadow-xl">
              <h3 className="text-lg font-black mb-4 uppercase tracking-tighter">Linha do Tempo</h3>
              <p className="text-sm text-gray-400 italic">"{selectedContact?.lastMovement || 'Nenhuma alteração recente registrada.'}"</p>
            </div>
          </div>
          <div className="graphite-light p-8 rounded-3xl border border-gray-800 shadow-xl text-center flex flex-col justify-center">
            <h3 className="text-lg font-black mb-4 uppercase tracking-tighter">Contrato Principal</h3>
            <div className="bg-black/20 p-6 rounded-[2rem] border border-gray-800/50">
               <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Status Contratual</p>
               <p className="text-xl font-black text-[#D4AF37] uppercase">{contracts.find(c => c.clientId === selectedContactId)?.status || 'Sem Contrato'}</p>
               <p className="text-[10px] text-gray-500 mt-2">Vigência: {contracts.find(c => c.clientId === selectedContactId)?.validity}</p>
            </div>
          </div>
        </div>
      );
      case 'contracts': return (
        <div className="space-y-6 animate-fadeIn">
          <header className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
            <div className="text-left">
              <h3 className="text-xl font-black uppercase tracking-tighter">Contratos de Honorários</h3>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Gestão de receita fixa e cláusulas de êxito.</p>
            </div>
            <label className="gold-gradient px-6 py-2 rounded-xl text-[10px] font-black text-white cursor-pointer shadow-lg active:scale-95 transition-all flex items-center gap-2">
              {isProcessingAI && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              <span>{isProcessingAI ? 'ANALISANDO...' : '➕ UPLOAD CONTRATO'}</span>
              <input type="file" className="hidden" onChange={(e) => handleSmartUploadInside(e, 'contract')} disabled={isProcessingAI} />
            </label>
          </header>
          <div className="grid grid-cols-1 gap-4">
            {contracts.filter(c => c.clientId === selectedContactId).map(c => (
              <div key={c.id} className="graphite-light p-8 rounded-[2rem] border border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-6 hover:border-[#D4AF37] transition-all text-left">
                <div><p className="text-[10px] text-gray-500 uppercase font-black mb-1">Tipo</p><p className="text-sm font-black text-[#D4AF37]">{c.type}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-black mb-1">Mensalidade</p><p className="text-sm font-black text-white">R$ {c.monthlyValue || 0}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-black mb-1">Êxito</p><p className="text-sm font-black text-white">{c.successPercentage}%</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-black mb-1">Status</p><p className={`text-sm font-black uppercase ${c.status === 'Ativo' ? 'text-green-400' : 'text-red-400'}`}>{c.status}</p></div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'cases': return (
        <div className="space-y-6 animate-fadeIn">
          <header className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
            <div className="text-left">
              <h3 className="text-xl font-black uppercase tracking-tighter">Processos (Casos)</h3>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Unidades jurídicas autônomas.</p>
            </div>
            <label className="gold-gradient px-6 py-2 rounded-xl text-[10px] font-black text-white cursor-pointer shadow-lg active:scale-95 transition-all flex items-center gap-2">
              {isProcessingAI && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              <span>{isProcessingAI ? 'LENDO CNJ...' : '➕ UPLOAD PROCESSO'}</span>
              <input type="file" className="hidden" onChange={(e) => handleSmartUploadInside(e, 'case')} disabled={isProcessingAI} />
            </label>
          </header>
          <div className="grid grid-cols-1 gap-4">
            {cases.filter(c => c.client === selectedContact?.name).map(c => (
              <div key={c.id} className="graphite-light p-8 rounded-[2rem] border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#D4AF37] transition-all group active:scale-[0.99] text-left">
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#D4AF37]">{c.number}</p>
                  <p className="text-lg font-black text-white group-hover:text-[#D4AF37] transition-colors">{c.title}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{c.type} • Início: {c.openDate}</p>
                </div>
                <div className="text-left md:text-right border-t md:border-t-0 border-gray-800 pt-4 md:pt-0 w-full md:w-auto">
                  <p className="text-xs text-gray-300 font-bold">{c.currentSituation}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Responsável: {c.responsible}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'executions': return (
        <div className="space-y-6 animate-fadeIn">
          <header className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
            <div className="text-left">
              <h3 className="text-xl font-black uppercase tracking-tighter">Submódulo Execuções</h3>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Objetos de recuperação vinculados ao contrato.</p>
            </div>
            <label className="gold-gradient px-6 py-2 rounded-xl text-[10px] font-black text-white cursor-pointer shadow-lg active:scale-95 transition-all flex items-center gap-2">
              {isProcessingAI && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              <span>{isProcessingAI ? 'CALCULANDO...' : '➕ UPLOAD EXECUÇÃO'}</span>
              <input type="file" className="hidden" onChange={(e) => handleSmartUploadInside(e, 'execution')} disabled={isProcessingAI} />
            </label>
          </header>
          <div className="overflow-x-auto graphite-light rounded-[2.5rem] border border-gray-800 shadow-xl overflow-hidden">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-[#121212] text-[9px] uppercase text-gray-500 font-black">
                <tr><th className="p-6">Réu</th><th className="p-6">Origem</th><th className="p-6 text-right">V. Executado</th><th className="p-6 text-right">V. Recuperado</th><th className="p-6 text-right">Honorários</th><th className="p-6 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {executions.filter(e => e.clientId === selectedContactId).map(e => (
                  <tr key={e.id} className="hover:bg-black/20 transition-colors">
                    <td className="p-6 font-black text-white">{e.defendant}</td>
                    <td className="p-6 text-[10px] uppercase font-bold text-gray-400">{e.origin}</td>
                    <td className="p-6 text-xs text-right font-bold text-white">R$ {e.valueExecuted.toLocaleString()}</td>
                    <td className="p-6 text-xs text-right text-green-400 font-black">R$ {e.valueRecovered.toLocaleString()}</td>
                    <td className="p-6 text-xs text-right font-black text-[#D4AF37]">R$ {e.feesDue.toLocaleString()}</td>
                    <td className="p-6 text-center"><span className="px-3 py-1 rounded-full text-[8px] font-black uppercase bg-blue-900/20 text-blue-400">{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      case 'financial': return (
        <div className="space-y-8 animate-fadeIn text-left">
          <header className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Histórico Financeiro & Ciclos</h3>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Faturas enviadas, pagas e apurações de êxito.</p>
            </div>
            <button className="gold-gradient px-6 py-2 rounded-xl text-[10px] font-black text-white shadow-lg active:scale-95 transition-all">
              VISUALIZAR INVOICES
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="graphite-light p-8 rounded-[2rem] border border-gray-800 shadow-xl">
               <h4 className="text-sm font-black gold-text uppercase mb-6 tracking-widest">Últimos Ciclos de Faturamento</h4>
               <div className="space-y-4">
                 {billingCycles.filter(cy => cy.clientId === selectedContactId).map(cy => (
                   <div key={cy.id} className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-gray-800/50 hover:border-[#D4AF37] transition-all cursor-pointer">
                      <div>
                        <p className="text-xs font-black text-white uppercase">{cy.period}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase">{cy.status} • Venceu em {cy.dueDate.split('-').reverse().join('/')}</p>
                      </div>
                      <p className="text-lg font-black text-green-400">R$ {cy.totalValue.toLocaleString()}</p>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      );
      case 'docs': return (
        <div className="space-y-6 animate-fadeIn text-left">
          <header className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
            <div><h3 className="text-xl font-black uppercase tracking-tighter">Gestão Documental (IA)</h3><p className="text-[10px] text-gray-500 uppercase font-bold">Classificação e extração automática de dados.</p></div>
            <label className="gold-gradient px-6 py-2 rounded-xl text-[10px] font-black text-white cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              {isProcessingAI && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              <span>{isProcessingAI ? 'PROCESSANDO...' : '➕ UPLOAD INTELIGENTE'}</span>
              <input type="file" className="hidden" onChange={(e) => handleSmartUploadInside(e, 'doc')} disabled={isProcessingAI} />
            </label>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {clientFiles.map(f => (
              <div key={f.id} className="bg-black/20 border border-gray-800 p-5 rounded-3xl flex items-center gap-4 hover:border-[#D4AF37] transition-all group cursor-pointer active:scale-95">
                <div className="text-3xl opacity-40 group-hover:opacity-100 transition-opacity">📄</div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] font-black truncate text-white uppercase tracking-tighter">{f.name}</p>
                  <p className="text-[9px] text-gray-500 font-bold">{f.date} • {Math.round(f.size/1024)}kb</p>
                </div>
              </div>
            ))}
            {clientFiles.length === 0 && <div className="col-span-full py-20 text-center text-gray-600 italic font-medium">Nenhum documento processado via IA.</div>}
          </div>
        </div>
      );
      case 'intel': return (
        <div className="space-y-8 animate-fadeIn text-left">
          <h3 className="text-2xl font-black gold-text uppercase tracking-tighter">Inteligência Estratégica LexAI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="graphite-light p-10 rounded-[3rem] border border-gray-800 text-center shadow-xl hover:scale-105 transition-all cursor-default">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-[0.2em]">Rentabilidade Líquida</p>
              <div className="text-6xl font-black text-green-400 tracking-tighter">85%</div>
              <p className="text-[11px] text-gray-400 mt-6 leading-relaxed uppercase font-bold">Alta eficiência operacional detectada pela IA.</p>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  if (selectedContactId && selectedContact) {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-[#1C1C1C] p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-800 shadow-2xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <button onClick={() => setSelectedContactId(null)} className="p-4 bg-black/40 hover:bg-[#D4AF37] hover:text-black rounded-2xl text-[#D4AF37] transition-all shadow-lg active:scale-90">←</button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
               <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">{selectedContact.name}</h2>
               <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full font-black uppercase tracking-[0.2em]">{selectedContact.category}</span>
            </div>
            <p className="text-gray-500 text-xs font-mono mt-2 opacity-60 tracking-[0.1em]">{selectedContact.document} • {selectedContact.email}</p>
          </div>
          <div className="flex gap-3 sm:gap-4 w-full sm:w-auto mt-4 sm:mt-0">
            <button className="flex-1 sm:flex-none p-4 sm:p-5 bg-green-900/20 text-green-400 rounded-2xl hover:bg-green-500 hover:text-black transition-all shadow-xl active:scale-90 flex items-center justify-center">📱</button>
            <button className="flex-1 sm:flex-none p-4 sm:p-5 bg-blue-900/20 text-blue-400 rounded-2xl hover:bg-blue-500 hover:text-black transition-all shadow-xl active:scale-90 flex items-center justify-center">📧</button>
          </div>
        </header>

        <nav className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide no-scrollbar border-b border-gray-800">
          {[
            { id: 'overview', label: 'Painel', icon: '🏠' },
            { id: 'contracts', label: 'Contratos', icon: '📜' },
            { id: 'cases', label: 'Processos', icon: '📁' },
            { id: 'executions', label: 'Execuções', icon: '🔨' },
            { id: 'financial', label: 'Financeiro', icon: '💰' },
            { id: 'docs', label: 'Docs IA', icon: '📄' },
            { id: 'intel', label: 'Estratégico', icon: '🧠' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-10 py-5 rounded-[2rem] transition-all whitespace-nowrap text-[11px] font-black uppercase tracking-widest active:scale-95 ${
                activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-[0_15px_30px_rgba(212,175,55,0.2)]' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[500px] py-8 relative">
          {isProcessingAI && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px] z-[60] flex items-center justify-center rounded-[3rem]">
              <div className="text-center bg-[#1C1C1C] p-10 rounded-[2.5rem] border border-[#D4AF37]/30 shadow-2xl">
                <div className="w-16 h-16 border-4 border-[#D4AF37]/10 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-sm font-black gold-text animate-pulse uppercase tracking-[0.2em]"><span className="normal-case">LexAI</span> está analisando a documentação...</p>
              </div>
            </div>
          )}
          {renderTabContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-24 text-left">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
        <div className="space-y-2">
          <h2 className="text-4xl lg:text-5xl font-black gold-text tracking-tighter uppercase">Gestão de Clientes</h2>
          <p className="text-gray-500 text-sm lg:text-base font-bold uppercase tracking-widest opacity-60">Ecossistema Jurídico Integrado</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <label className="flex-1 sm:flex-none gold-gradient px-12 py-5 rounded-[2.5rem] font-black text-white shadow-2xl text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all ring-8 ring-[#D4AF37]/5 cursor-pointer flex items-center justify-center gap-2">
            {isProcessingAI && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
            <span>{isProcessingAI ? 'ANALISANDO DOC...' : '➕ CADASTRAR CLIENTE'}</span>
            <input type="file" className="hidden" onChange={handleSmartIngest} disabled={isProcessingAI} />
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {contacts.map((contact) => (
          <div 
            key={contact.id} 
            onClick={() => { setSelectedContactId(contact.id); setActiveTab('overview'); }} 
            className="graphite-light p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl hover:border-[#D4AF37] transition-all cursor-pointer group flex flex-col relative overflow-hidden active:scale-95"
          >
            <div className="absolute top-0 right-0 p-8">
              <span className={`w-4 h-4 rounded-full inline-block ${contact.financialStatus === 'Em dia' ? 'bg-green-500' : 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`} />
            </div>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-24 h-24 rounded-[2rem] gold-gradient flex items-center justify-center text-4xl font-black text-white shadow-2xl group-hover:rotate-6 transition-all">
                {contact.name[0]}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 tracking-tight uppercase">{contact.name}</h3>
                <p className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase opacity-60 mt-1">{contact.document}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-10">
              <div className="bg-black/30 p-5 rounded-[2rem] border border-gray-800/50 text-center">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Processos</p>
                <p className="text-2xl font-black text-[#D4AF37]">{contact.totalMatters}</p>
              </div>
              <div className="bg-black/30 p-5 rounded-[2rem] border border-gray-800/50 text-center">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Perfil</p>
                <p className="text-[10px] font-black text-gray-300 uppercase leading-tight line-clamp-1">{contact.category}</p>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800 flex justify-between items-center mt-auto">
              <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] group-hover:translate-x-4 transition-all duration-500">ABRIR PASTA ➔</span>
            </div>
          </div>
        ))}
      </div>

      {/* Onboarding AI Modal */}
      {isConfirmingOnboarding && onboardingData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fadeIn">
          <div className="graphite-dark border-2 border-[#D4AF37]/40 rounded-[4rem] w-full max-w-2xl shadow-[0_0_100px_rgba(212,175,55,0.2)] p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <div className="relative z-10 text-center space-y-8">
              <div className="w-20 h-20 gold-gradient rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-2xl">✨</div>
              
              <div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2"><span className="normal-case">LexAI</span> Onboarding</h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Inteligência de Triagem de Partes</p>
              </div>

              {onboardingData.existingClient ? (
                <div className="bg-blue-900/10 border border-blue-500/30 p-10 rounded-[2.5rem] space-y-4">
                  <p className="text-lg font-black text-blue-400 uppercase tracking-tight">Vínculo Detectado</p>
                  <p className="text-sm text-gray-300 font-medium leading-relaxed">
                    Identificamos que este documento pertence ao cliente <span className="text-white font-black">{onboardingData.existingClient.name}</span>. 
                    <br/><br/>
                    Deseja anexar automaticamente este arquivo na pasta <strong>{onboardingData.existingClient.folderId}</strong> deste cliente?
                  </p>
                </div>
              ) : (
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-10 rounded-[2.5rem] space-y-6">
                  <p className="text-lg font-black gold-text uppercase tracking-tight">Novo Cliente Detectado</p>
                  <div className="space-y-4">
                    <div className="text-left bg-black/20 p-4 rounded-2xl border border-gray-800">
                       <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Cliente a Cadastrar</p>
                       <p className="text-xl font-black text-white">{onboardingData.clientName}</p>
                    </div>
                    {onboardingData.opposingParty && (
                      <div className="text-left bg-black/20 p-4 rounded-2xl border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Parte Contrária (Oponente/Sócio)</p>
                        <p className="text-sm font-black text-red-400 uppercase">{onboardingData.opposingParty}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase pt-4 border-t border-[#D4AF37]/20">Deseja cadastrar este novo cliente agora e iniciar a gestão da pasta?</p>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => { setIsConfirmingOnboarding(false); setOnboardingData(null); }}
                  className="flex-1 py-5 border border-gray-800 rounded-2xl font-black text-[10px] uppercase text-gray-500 hover:bg-white/5 transition-all"
                >
                  Descartar
                </button>
                <button 
                  onClick={confirmOnboarding}
                  className="flex-1 py-5 gold-gradient rounded-2xl font-black text-[10px] uppercase text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  {onboardingData.existingClient ? 'Confirmar Anexo' : 'Confirmar Cadastro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;

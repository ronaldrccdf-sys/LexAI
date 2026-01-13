
import React, { useState, useMemo } from 'react';
import { BillingCycle, Contract, BillingStatus, Contact } from '../types';
import { legalAssistantService } from '../services/gemini';

const Billing: React.FC = () => {
  // Mock de contatos integrados
  const [clients] = useState<Contact[]>([
    { id: '1', name: 'Maria Souza', document: '123.456.789-00', email: 'maria@email.com', phone: '(11) 99999-9999', type: 'Individual', totalMatters: 2, folderId: 'folder_1', category: 'Recorrente', financialStatus: 'Em dia' },
    { id: '2', name: 'Empresa XPTO', document: '12.345.678/0001-99', email: 'contato@xpto.com', phone: '(11) 3333-3333', type: 'Empresa', totalMatters: 1, folderId: 'folder_2', category: 'Contencioso em massa', financialStatus: 'Acordos em curso' }
  ]);

  const [contracts] = useState<Contract[]>([
    { id: 'ct1', clientId: '1', type: 'Híbrido', monthlyValue: 2500, successPercentage: 20, validity: '2025-12-31', status: 'Ativo', adjustments: 'IGP-M', specialConditions: 'Exige Certidões Federais' },
    { id: 'ct2', clientId: '2', type: 'Mensalidade fixa', monthlyValue: 5000, validity: '2024-06-30', status: 'Ativo', adjustments: 'IPCA', specialConditions: 'Relatório Mensal obrigatório' }
  ]);

  const [cycles, setCycles] = useState<BillingCycle[]>([
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
    },
    {
      id: 'cy2',
      clientId: '2',
      clientName: 'Empresa XPTO',
      period: 'Novembro 2023',
      type: 'Mensalidade fixa',
      baseValue: 5000,
      successFeeValue: 0,
      totalValue: 5000,
      status: 'Em preparação',
      requirements: { nf: false, certidaoFederal: true, certidaoEstadual: false, certidaoMunicipal: false, certidaoFGTS: true, certidaoTrabalhista: false, activityReport: false },
      dueDate: '2023-11-20'
    }
  ]);

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isProcessingMass, setIsProcessingMass] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const clientBillingList = useMemo(() => {
    return clients.map(client => {
      const contract = contracts.find(c => c.clientId === client.id);
      const cycle = cycles.find(cy => cy.clientId === client.id);
      return {
        ...client,
        contract,
        currentCycle: cycle
      };
    });
  }, [clients, contracts, cycles]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  const handleGenerateReport = async () => {
    if (!selectedCycle) return;
    setIsGeneratingReport(true);
    try {
      const mockEvents = [
        { type: 'Audiência', date: '2023-11-05', title: 'Instrução Inventário' },
        { type: 'Movimentação', date: '2023-11-02', title: 'Petição de Manifestação Protocolada' }
      ];
      const report = await legalAssistantService.generateBillingActivityReport(selectedCycle.clientName, selectedCycle.period, mockEvents);
      alert("Relatório de Atividades Gerado via LexAI:\n\n" + report);
      setCycles(prev => prev.map(c => c.id === selectedCycle.id ? { ...c, requirements: { ...c.requirements, activityReport: true } } : c));
    } catch (err) {
      alert("Erro ao gerar relatório.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleMassBilling = async () => {
    setIsProcessingMass(true);
    setTimeout(() => {
      alert("LexAI processou todos os contratos integrados. Ciclos de faturamento atualizados.");
      setIsProcessingMass(false);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20 px-2 sm:px-0 text-left">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-black gold-text tracking-tighter uppercase leading-none mb-2">Financeiro Integrado</h2>
          <p className="text-gray-500 text-xs sm:text-sm font-medium">Controle de faturamento em tempo real integrado à carteira de clientes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <button 
            onClick={handleMassBilling}
            disabled={isProcessingMass}
            className={`flex items-center justify-center gap-2 bg-[#1C1C1C] border border-gray-800 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 active:scale-95 transition-all ${isProcessingMass ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#D4AF37] hover:text-white'}`}
          >
            {isProcessingMass ? '⚙️ PROCESSANDO...' : 'Sincronizar Todos Clientes'}
          </button>
          <button className="gold-gradient px-8 py-4 rounded-2xl font-black text-white shadow-2xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
            + NOVO CICLO MANUAL
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tabela de Clientes e Pagamentos */}
        <div className="lg:col-span-8 space-y-4">
          <div className="graphite-light p-6 rounded-[2.5rem] border border-gray-800 shadow-xl overflow-hidden">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Status de Faturamento por Cliente</h3>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-[#121212] text-[9px] uppercase text-gray-500 font-black tracking-widest">
                  <tr>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Tipo Contrato</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4">Valor Mensal</th>
                    <th className="p-4">Status Pagto</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {clientBillingList.map(item => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-black/20 transition-all cursor-pointer ${selectedCycleId === item.currentCycle?.id ? 'bg-[#D4AF37]/5 border-l-4 border-[#D4AF37]' : ''}`} 
                      onClick={() => item.currentCycle && setSelectedCycleId(item.currentCycle.id)}
                    >
                      <td className="p-4">
                        <p className="font-black text-white text-sm">{item.name}</p>
                        <p className="text-[9px] text-gray-500 uppercase">{item.category}</p>
                      </td>
                      <td className="p-4 text-[10px] font-bold text-gray-400 uppercase">
                        {item.contract?.type || 'Sem Contrato'}
                      </td>
                      <td className="p-4 text-[10px] font-mono whitespace-nowrap">
                        {item.currentCycle?.dueDate.split('-').reverse().join('/') || '--/--/----'}
                      </td>
                      <td className="p-4 font-black text-[#D4AF37] whitespace-nowrap">
                        R$ {item.contract?.monthlyValue?.toLocaleString() || '0,00'}
                      </td>
                      <td className="p-4">
                        {item.currentCycle ? (
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase whitespace-nowrap ${
                            item.currentCycle.status === 'Pago' ? 'bg-green-100 text-green-700' : 
                            item.currentCycle.status === 'Em atraso' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {item.currentCycle.status}
                          </span>
                        ) : (
                          <span className="text-[8px] text-gray-600 font-black uppercase">Pendente</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-[10px] font-black uppercase text-[#D4AF37] hover:underline">Gerir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Painel de Detalhes da IA */}
        <div className="lg:col-span-4 space-y-6">
          {selectedCycle ? (
            <div className="graphite-light p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl space-y-8 animate-fadeIn">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total deste Ciclo</p>
                <h3 className="text-4xl font-black text-[#D4AF37] tracking-tighter">R$ {selectedCycle.totalValue.toLocaleString()}</h3>
                <p className="text-xs text-gray-400 mt-2">{selectedCycle.period}</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] text-gray-500 uppercase font-black border-b border-gray-800 pb-2">Checklist de Conformidade</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'nf', label: 'Nota Fiscal Emitida' },
                    { key: 'activityReport', label: 'Relatório Mensal IA' }
                  ].map(req => (
                    <div key={req.key} className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800/50">
                      <span className="text-[10px] text-gray-300 font-bold uppercase">{req.label}</span>
                      <span className={selectedCycle.requirements[req.key as keyof typeof selectedCycle.requirements] ? 'text-green-400 font-black text-[10px]' : 'text-red-400 font-black text-[10px]'}>
                        {selectedCycle.requirements[req.key as keyof typeof selectedCycle.requirements] ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                 <button 
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="w-full py-4 bg-blue-900/20 text-blue-400 border border-blue-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                 >
                   {isGeneratingReport ? 'COMPILANDO...' : '✨ RELATÓRIO MENSAL IA'}
                 </button>
                 <button 
                  className="w-full py-4 gold-gradient rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                 >
                   ENVIAR COBRANÇA
                 </button>
              </div>
            </div>
          ) : (
            <div className="graphite-light p-12 rounded-[2.5rem] border border-gray-800 shadow-2xl text-center opacity-30 italic flex flex-col items-center justify-center min-h-[400px]">
              <span className="text-5xl mb-4">💰</span>
              <p className="text-xs uppercase font-black tracking-widest">Selecione um cliente para detalhar faturamento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;

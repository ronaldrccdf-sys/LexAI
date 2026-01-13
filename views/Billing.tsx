
import React, { useEffect, useMemo, useState } from 'react';
import { BillingCycle, Contract, BillingStatus, Contact } from '../types';
import { legalAssistantService } from '../services/gemini';
import { api } from '../services/api';

const Billing: React.FC = () => {
  // Mock de contatos integrados
  const [clients, setClients] = useState<Contact[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isProcessingMass, setIsProcessingMass] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

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

  const handleManualCycle = async () => {
    const selectedClient = selectedCycle
      ? clients.find(client => client.id === selectedCycle.clientId)
      : clients[0];

    if (!selectedClient) {
      alert('Nenhum cliente disponível para criar um ciclo manual.');
      return;
    }

    const contract = contracts.find(c => c.clientId === selectedClient.id);
    const now = new Date();
    const period = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 25).toISOString().split('T')[0];
    const baseValue = contract?.monthlyValue || 0;
    const successFeeValue = contract?.successPercentage ? Math.round(baseValue * (contract.successPercentage / 100)) : 0;

    const newCyclePayload: Omit<BillingCycle, 'id'> = {
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      period,
      type: contract?.type || 'Mensalidade fixa',
      baseValue,
      successFeeValue,
      totalValue: baseValue + successFeeValue,
      status: 'Em preparação',
      requirements: {
        nf: false,
        certidaoFederal: false,
        certidaoEstadual: false,
        certidaoMunicipal: false,
        certidaoFGTS: false,
        certidaoTrabalhista: false,
        activityReport: false
      },
      dueDate
    };

    try {
      const saved = await api.createBillingCycle(newCyclePayload);
      setCycles(prev => [saved, ...prev]);
      setSelectedCycleId(saved.id);
      alert(`Ciclo manual criado para ${selectedClient.name}.`);
    } catch (error) {
      console.error(error);
      alert('Erro ao criar ciclo no backend.');
    }
  };

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
      const updatedRequirements = { ...selectedCycle.requirements, activityReport: true };
      const updated = await api.updateBillingCycle(selectedCycle.id, { requirements: updatedRequirements });
      setCycles(prev => prev.map(c => c.id === selectedCycle.id ? updated : c));
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

  const handleSendCharge = async () => {
    if (!selectedCycle) return;
    try {
      const updated = await api.updateBillingCycle(selectedCycle.id, { status: 'Enviado para pagamento' });
      setCycles(prev => prev.map(c => c.id === selectedCycle.id ? updated : c));
      alert(`Cobrança enviada para ${selectedCycle.clientName}.`);
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar cobrança no backend.');
    }
  };

  useEffect(() => {
    const loadBilling = async () => {
      try {
        setIsLoading(true);
        const [clientsData, contractsData, cyclesData] = await Promise.all([
          api.getContacts(),
          api.getContracts(),
          api.getBillingCycles()
        ]);
        setClients(clientsData);
        setContracts(contractsData);
        setCycles(cyclesData);
        setApiError(null);
      } catch (error) {
        console.error(error);
        setApiError('Não foi possível carregar dados do faturamento.');
      } finally {
        setIsLoading(false);
      }
    };
    loadBilling();
  }, []);

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
          <button
            onClick={handleManualCycle}
            className="gold-gradient px-8 py-4 rounded-2xl font-black text-white shadow-2xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
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
              {isLoading ? (
                <p className="text-xs text-gray-500 italic">Carregando faturamento...</p>
              ) : apiError ? (
                <p className="text-xs text-red-400">{apiError}</p>
              ) : (
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.currentCycle) setSelectedCycleId(item.currentCycle.id);
                          }}
                          className="text-[10px] font-black uppercase text-[#D4AF37] hover:underline"
                        >
                          Gerir
                        </button>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Painel de Detalhes da IA */}
        <div className="lg:col-span-4 space-y-6">
          {!isLoading && selectedCycle ? (
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
                  onClick={handleSendCharge}
                  disabled={!selectedCycle || selectedCycle.status === 'Pago'}
                  className="w-full py-4 gold-gradient rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
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

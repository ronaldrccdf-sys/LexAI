
import React, { useState, useRef } from 'react';
import { Case, CaseUpdate } from '../types';
import { legalAssistantService } from '../services/gemini';
import { datajudService } from '../services/escavador';

interface MattersProps {
  matters: Case[];
  setMatters: React.Dispatch<React.SetStateAction<Case[]>>;
  onGenerateAI: (context: string) => void;
}

const Matters: React.FC<MattersProps> = ({ matters, setMatters, onGenerateAI }) => {
  const [searchCNJ, setSearchCNJ] = useState('');
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedCaseUpdates, setSelectedCaseUpdates] = useState<{caseId: string, updates: any[]} | null>(null);

  const handleRemoteSearch = async () => {
    if (!searchCNJ) return;
    setIsSearchingRemote(true);
    try {
      const result = await datajudService.getProcessByCNJ(searchCNJ);
      if (result) {
        const lastMovement = result.movimentacoes?.[0]?.conteudo || "Ajuizamento detectado";
        const interpretation = await legalAssistantService.interpretMovement(lastMovement);

        const newCase: Case = {
          id: result.id,
          number: result.numero_cnj,
          title: result.classe || 'Ação Judicial',
          client: 'Consultar PJe (Sigilo)',
          opposingParty: result.orgao_julgador || 'Órgão Competente',
          status: 'Aberto',
          type: 'Conhecimento',
          responsible: 'Dr. Ronald Serra',
          openDate: result.data_ajuizamento ? new Date(result.data_ajuizamento).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          billableHours: 0,
          currentSituation: lastMovement,
          lastMovementSummary: interpretation,
          updates: result.movimentacoes?.map(m => ({
            id: String(m.id),
            date: new Date(m.data).toLocaleDateString('pt-BR'),
            content: m.conteudo,
            source: 'DATAJUD (CNJ)',
            type: 'Movimentação'
          }))
        };
        setMatters(prev => [newCase, ...prev]);
        setSearchCNJ('');
      } else {
        alert("Processo não localizado na base do CNJ.");
      }
    } catch (err) {
      alert("Falha ao comunicar com o Radar DATAJUD.");
    } finally {
      setIsSearchingRemote(false);
    }
  };

  const handleSyncDatajud = async (m: Case) => {
    setSyncingId(m.id);
    try {
      const result = await datajudService.getProcessByCNJ(m.number);
      if (result) {
        const latestRaw = result.movimentacoes[0]?.conteudo || "Sem movimentos";
        const lastSummary = await legalAssistantService.interpretMovement(latestRaw);

        const newUpdates = result.movimentacoes.slice(0, 10).map(mv => ({
          id: `dj-${mv.id}`,
          date: new Date(mv.data).toLocaleDateString('pt-BR'),
          content: mv.conteudo,
          source: 'DATAJUD',
          type: 'Movimentação'
        }));

        setMatters(prev => prev.map(item => 
          item.id === m.id ? { ...item, updates: newUpdates, lastMovementSummary: lastSummary } : item
        ));
        setSelectedCaseUpdates({ caseId: m.id, updates: newUpdates });
      }
    } catch (err) {
      alert("Erro na sincronização.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20 text-left relative">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
          <h2 className="text-4xl lg:text-5xl font-black gold-text tracking-tighter uppercase leading-none">Radar DATAJUD</h2>
          <div className="flex items-center gap-2 mt-2">
             <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-75"></span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-150"></span>
             </div>
             <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em]">
               Conexão Criptografada CNJ • API 2.0
             </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          <div className="flex-1 md:w-96 bg-[#1C1C1C] border border-[#D4AF37]/20 p-2 rounded-2xl flex gap-2">
            <input 
              type="text" 
              value={searchCNJ}
              onChange={(e) => setSearchCNJ(e.target.value)}
              placeholder="Nº PROCESSO (CNJ)"
              className="flex-1 bg-transparent text-[10px] font-bold text-white uppercase outline-none px-3"
              onKeyPress={(e) => e.key === 'Enter' && handleRemoteSearch()}
            />
            <button 
              onClick={handleRemoteSearch}
              disabled={isSearchingRemote}
              className="gold-gradient px-6 py-2 rounded-xl text-[10px] font-black text-white uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSearchingRemote ? 'CONECTANDO...' : 'IMPORTAR'}
            </button>
          </div>
        </div>
      </header>

      <div className="graphite-light border border-gray-800 rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm min-w-[1200px]">
            <thead className="bg-[#1C1C1C] text-[9px] uppercase text-gray-500 font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-8">Processo / Tribunal</th>
                <th className="px-8 py-8">Classe / Vara</th>
                <th className="px-8 py-8 max-w-[400px]">Análise Preditiva LexAI</th>
                <th className="px-8 py-8">Última Mov.</th>
                <th className="px-8 py-8 text-right">Ações Oficiais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {matters.map((m) => (
                <tr key={m.id} className="hover:bg-black/20 transition-all group">
                  <td className="px-8 py-8">
                    <p className="font-black text-white text-base group-hover:text-[#D4AF37] transition-colors">{m.number}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">CLIENTE: {m.client}</p>
                  </td>
                  <td className="px-8 py-8">
                    <div className="space-y-1">
                       <p className="text-xs font-black text-gray-200 uppercase truncate max-w-[200px]">{m.title}</p>
                       <p className="text-[9px] text-gray-500 font-bold uppercase">{m.opposingParty}</p>
                    </div>
                  </td>
                  <td className="px-8 py-8 max-w-[400px]">
                    <div className="bg-black/30 p-5 rounded-2xl border border-gray-800/50 group-hover:border-[#D4AF37]/30 transition-all">
                       <p className="text-[10px] text-gray-300 font-serif italic leading-relaxed text-justify">
                         {m.lastMovementSummary || 'Aguardando varredura do Radar LexAI...'}
                       </p>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <p className="text-[10px] text-gray-400 font-black uppercase">{m.updates?.[0]?.date || m.openDate}</p>
                    <div className="flex items-center gap-1 mt-1">
                       <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                       <span className="text-[8px] text-blue-400 font-black uppercase">DATAJUD</span>
                    </div>
                  </td>
                  <td className="px-8 py-8 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => handleSyncDatajud(m)}
                        disabled={syncingId === m.id}
                        className="bg-blue-900/10 text-blue-400 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                      >
                        {syncingId === m.id ? 'Sincronizando...' : 'Atualizar'}
                      </button>
                      <button 
                        onClick={() => onGenerateAI(`PROCESSO: ${m.number}\nRESUMO: ${m.lastMovementSummary}`)}
                        className="bg-[#D4AF37]/10 text-[#D4AF37] px-5 py-2.5 rounded-xl text-[9px] font-black uppercase border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black transition-all"
                      >
                        Gerar Peça
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCaseUpdates && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
           <div className="graphite-dark border-2 border-gray-800 rounded-[3rem] w-full max-w-2xl shadow-2xl p-10 max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h3 className="text-2xl font-black gold-text uppercase tracking-tighter">Eventos Sincronizados</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Base de Dados: CNJ - Tribunal Superior</p>
                 </div>
                 <button onClick={() => setSelectedCaseUpdates(null)} className="p-4 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-2xl transition-all">✕</button>
              </div>

              <div className="space-y-6">
                 {selectedCaseUpdates.updates.map((up, idx) => (
                   <div key={idx} className="bg-black/20 p-8 rounded-3xl border border-gray-800 relative group hover:border-[#D4AF37]/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{up.date}</span>
                         <span className="text-[8px] font-black text-gray-700 uppercase">Verificado LexAI</span>
                      </div>
                      <p className="text-gray-300 font-serif leading-relaxed italic border-l-2 border-[#D4AF37] pl-6 text-sm">
                        {up.content}
                      </p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Matters;

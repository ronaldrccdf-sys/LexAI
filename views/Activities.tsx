
import React, { useState } from 'react';
import { legalAssistantService } from '../services/gemini';

const Activities: React.FC = () => {
  const [description, setDescription] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);

  const handleAIFormat = async () => {
    if (!description) return;
    setIsFormatting(true);
    try {
      const formatted = await legalAssistantService.smartTimeEntry(description);
      setDescription(formatted || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold gold-text">Atividades</h2>
          <p className="text-gray-500">Lançamento de horas e gestão de produtividade.</p>
        </div>
        <button className="gold-gradient px-6 py-2 rounded-lg font-bold text-white shadow-lg">
          + NOVO LANÇAMENTO
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="graphite-light p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Registro Rápido</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Processo</label>
                  <select className="w-full bg-[#1C1C1C] border border-gray-700 p-2 rounded text-sm outline-none">
                    <option>Selecione um processo...</option>
                    <option>2023.0001.S - Inventário Souza</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Duração (h)</label>
                  <input type="number" placeholder="0.0" className="w-full bg-[#1C1C1C] border border-gray-700 p-2 rounded text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1 flex justify-between">
                  Descrição do Serviço
                  <button onClick={handleAIFormat} className="text-[#D4AF37] hover:underline" disabled={isFormatting}>
                    {isFormatting ? 'Formatando...' : '✨ Formatação Profissional IA'}
                  </button>
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Reunião com cliente e análise de documentos."
                  className="w-full bg-[#1C1C1C] border border-gray-700 p-3 rounded text-sm h-24 outline-none resize-none"
                />
              </div>
              <button className="w-full py-3 gold-gradient rounded-xl font-bold uppercase tracking-widest text-sm">Salvar Registro</button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="graphite-light p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Lançamentos Recentes</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-start border-b border-gray-800 pb-3 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-[#D4AF37]">#2023.0001.S</p>
                    <p className="text-xs text-gray-400">Revisão de documentos judiciais...</p>
                  </div>
                  <p className="text-sm font-mono font-bold">1.5h</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activities;

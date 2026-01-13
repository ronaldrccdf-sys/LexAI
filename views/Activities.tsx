
import React, { useEffect, useRef, useState } from 'react';
import { legalAssistantService } from '../services/gemini';

const Activities: React.FC = () => {
  const STORAGE_KEY = 'lexai_activities_state_v1';
  const BACKUP_KEY = 'lexai_activities_backup_v1';

  const loadStoredState = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Falha ao carregar atividades salvas:', error);
      return null;
    }
  };

  const storedState = loadStoredState();

  const [description, setDescription] = useState(storedState?.description || '');
  const [selectedMatter, setSelectedMatter] = useState(storedState?.selectedMatter || '2023.0001.S - Inventário Souza');
  const [duration, setDuration] = useState(storedState?.duration || '');
  const [entries, setEntries] = useState(storedState?.entries || [
    { id: '1', matter: '2023.0001.S - Inventário Souza', description: 'Revisão de documentos judiciais...', duration: '1.5' },
    { id: '2', matter: '2023.0492.E - Recurso Trabalhista', description: 'Reunião com cliente e estratégia.', duration: '2.0' },
    { id: '3', matter: '2023.0015.A - Ação de Cobrança', description: 'Elaboração de minuta processual.', duration: '1.0' }
  ]);
  const [isFormatting, setIsFormatting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

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

  const handleNewEntry = () => {
    setDescription('');
    setDuration('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveEntry = () => {
    if (!description.trim()) {
      alert('Descreva o serviço para registrar a atividade.');
      return;
    }
    const newEntry = {
      id: Math.random().toString(36).slice(2, 9),
      matter: selectedMatter,
      description: description.trim(),
      duration: duration || '1.0'
    };
    setEntries(prev => [newEntry, ...prev]);
    setDescription('');
    setDuration('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = { description, selectedMatter, duration, entries };
    const handler = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: payload }));
      } catch (error) {
        console.warn('Falha ao salvar backup de atividades:', error);
      }
    }, 300);
    return () => window.clearTimeout(handler);
  }, [description, selectedMatter, duration, entries]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold gold-text">Atividades</h2>
          <p className="text-gray-500">Lançamento de horas e gestão de produtividade.</p>
        </div>
        <button onClick={handleNewEntry} className="w-full sm:w-auto gold-gradient px-6 py-2 rounded-lg font-bold text-white shadow-lg">
          + NOVO LANÇAMENTO
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div ref={formRef} className="graphite-light p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Registro Rápido</h3>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Processo</label>
                  <select
                    value={selectedMatter}
                    onChange={(e) => setSelectedMatter(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-gray-700 p-2 rounded text-sm outline-none"
                  >
                    <option>2023.0001.S - Inventário Souza</option>
                    <option>2023.0492.E - Recurso Trabalhista</option>
                    <option>2023.0015.A - Ação de Cobrança</option>
                  </select>
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Duração (h)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-[#1C1C1C] border border-gray-700 p-2 rounded text-sm outline-none"
                  />
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
              <button onClick={handleSaveEntry} className="w-full py-3 gold-gradient rounded-xl font-bold uppercase tracking-widest text-sm">Salvar Registro</button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="graphite-light p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Lançamentos Recentes</h3>
            <div className="space-y-4">
              {entries.length > 0 ? entries.map(entry => (
                <div key={entry.id} className="flex justify-between items-start border-b border-gray-800 pb-3 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-[#D4AF37]">#{entry.matter}</p>
                    <p className="text-xs text-gray-400">{entry.description}</p>
                  </div>
                  <p className="text-sm font-mono font-bold">{entry.duration}h</p>
                </div>
              )) : (
                <p className="text-xs text-gray-500 italic">Nenhum lançamento recente.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Activities;

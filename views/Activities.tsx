
import React, { useEffect, useRef, useState } from 'react';
import { legalAssistantService } from '../services/gemini';
import { api } from '../services/api';

const Activities: React.FC = () => {
  const [description, setDescription] = useState('');
  const [selectedMatter, setSelectedMatter] = useState('');
  const [duration, setDuration] = useState('');
  const [entries, setEntries] = useState<
    { id: string; matter: string; description: string; duration: string; createdAt?: string }[]
  >([]);
  const [matters, setMatters] = useState<{ id: string; number: string; title: string }[]>([]);
  const [isFormatting, setIsFormatting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
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

  const handleSaveEntry = async () => {
    if (!selectedMatter) {
      alert('Selecione um processo para registrar a atividade.');
      return;
    }
    if (!description.trim()) {
      alert('Descreva o serviço para registrar a atividade.');
      return;
    }
    try {
      const newEntry = await api.createActivity({
        matter: selectedMatter,
        description: description.trim(),
        duration: duration || '1.0'
      });
      setEntries(prev => [newEntry, ...prev]);
      setDescription('');
      setDuration('');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar atividade no backend.');
    }
  };

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setIsLoading(true);
        const [data, mattersData] = await Promise.all([
          api.getActivities(),
          api.getMatters()
        ]);
        if (data.length > 0) {
          setEntries(data);
        }
        if (mattersData.length > 0) {
          const mapped = mattersData.map(m => ({ id: m.id, number: m.number, title: m.title }));
          setMatters(mapped);
          if (!selectedMatter) {
            setSelectedMatter(`${mapped[0].number} - ${mapped[0].title}`);
          }
        }
        setApiError(null);
      } catch (error) {
        console.error(error);
        setApiError('Não foi possível carregar atividades.');
      } finally {
        setIsLoading(false);
      }
    };
    loadActivities();
  }, []);

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
                    {matters.length === 0 ? (
                      <option value="">Nenhum processo disponível</option>
                    ) : (
                      matters.map(matter => (
                        <option key={matter.id} value={`${matter.number} - ${matter.title}`}>
                          {matter.number} - {matter.title}
                        </option>
                      ))
                    )}
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
              {isLoading ? (
                <p className="text-xs text-gray-500 italic">Carregando atividades...</p>
              ) : apiError ? (
                <p className="text-xs text-red-400">{apiError}</p>
              ) : entries.length > 0 ? entries.map(entry => (
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

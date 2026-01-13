
import React, { useState, useMemo } from 'react';
import { AgendaEvent } from '../types';
import { legalAssistantService } from '../services/gemini';

interface AgendaProps {
  events: AgendaEvent[];
  setEvents: React.Dispatch<React.SetStateAction<AgendaEvent[]>>;
}

const Agenda: React.FC<AgendaProps> = ({ events, setEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappSummary, setWhatsappSummary] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<AgendaEvent>>({
    type: 'Compromisso',
    title: '',
    timeStart: '',
    timeEnd: '',
    responsible: 'Dr. Ronald Serra'
  });

  const selectedDateStr = currentDate.toISOString().split('T')[0];

  const filteredEvents = useMemo(() => {
    return events.filter(e => e.date === selectedDateStr).sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [events, selectedDateStr]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleSendWhatsApp = async () => {
    if (filteredEvents.length === 0) {
      alert("Nenhum evento para hoje.");
      return;
    }
    setIsSendingWhatsApp(true);
    setWhatsappSummary(null);
    try {
      const summary = await legalAssistantService.generateDailySummaryWhatsApp(filteredEvents);
      setWhatsappSummary(summary || null);
    } catch (err) {
      alert("Erro ao disparar alerta.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleAddActivity = () => {
    const newEvent: AgendaEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: form.type as any,
      title: form.title || 'Nova Atividade',
      timeStart: form.timeStart || '09:00',
      timeEnd: form.timeEnd || '10:00',
      date: selectedDateStr,
      responsible: form.responsible || '',
      sourceId: 'manual'
    };
    setEvents(prev => [newEvent, ...prev]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black gold-text tracking-tighter uppercase">Agenda Jurídica</h2>
          <p className="text-gray-500 text-sm font-medium">Cronograma sincronizado com Intimações e Prazos.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleSendWhatsApp}
            disabled={isSendingWhatsApp}
            className={`flex-1 sm:flex-none bg-[#25D366] text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#128C7E] transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2`}
          >
            {isSendingWhatsApp ? 'GERANDO...' : '📱 RESUMO WHATSAPP'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none gold-gradient px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            + ATIVIDADE MANUAL
          </button>
        </div>
      </header>

      {/* Exibição do Resumo WhatsApp solicitado */}
      {whatsappSummary && (
        <section className="bg-[#25D366] p-8 rounded-[2.5rem] shadow-2xl animate-slideDown relative">
           <button onClick={() => setWhatsappSummary(null)} className="absolute top-6 right-6 text-black/50 hover:text-black font-black">✕</button>
           <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xs font-black text-black uppercase tracking-widest">Resumo Estratégico para WhatsApp</h3>
           </div>
           <div className="text-black font-medium text-sm leading-relaxed whitespace-pre-line italic">
              {whatsappSummary}
           </div>
           <button 
              onClick={() => { navigator.clipboard.writeText(whatsappSummary); alert('Copiado para o WhatsApp!'); }}
              className="mt-6 bg-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
           >
              Copiar para WhatsApp
           </button>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendário Visual */}
        <div className="lg:col-span-4 graphite-light p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl h-fit">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase gold-text tracking-widest">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">←</button>
              <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">→</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
              <span key={d} className="text-[9px] font-black text-gray-600">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const isSelected = day.toISOString().split('T')[0] === selectedDateStr;
              const hasEvents = events.some(e => e.date === day.toISOString().split('T')[0]);
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentDate(day)}
                  className={`
                    h-10 w-full flex flex-col items-center justify-center rounded-xl text-[10px] font-black transition-all relative group
                    ${isSelected ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-400 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  {day.getDate()}
                  {hasEvents && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-[#D4AF37] rounded-full"></div>}
                  
                  {/* Tooltip Simulado via hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-black text-[8px] text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-gray-800 shadow-2xl">
                    {day.toLocaleDateString('pt-BR')} {hasEvents ? '(Compromissos)' : '(Livre)'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Eventos do Dia */}
        <div className="lg:col-span-8 space-y-4">
          <div className="graphite-light p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <button onClick={handlePrevDay} className="p-4 bg-black/20 rounded-2xl hover:bg-[#D4AF37] hover:text-black transition-all">←</button>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.3em] mt-1">Eventos do Período</p>
              </div>
              <button onClick={handleNextDay} className="p-4 bg-black/20 rounded-2xl hover:bg-[#D4AF37] hover:text-black transition-all">→</button>
            </div>

            <div className="space-y-4">
              {filteredEvents.length > 0 ? (
                filteredEvents.map(e => (
                  <div key={e.id} className="bg-black/20 p-6 rounded-3xl border border-gray-800 shadow-xl flex gap-8 items-center hover:border-[#D4AF37] transition-all group cursor-pointer relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D4AF37] opacity-40 group-hover:opacity-100 transition-opacity"></div>
                    <div className="text-center min-w-[80px] border-r border-gray-800 pr-8">
                      <p className="text-2xl font-black text-white">{e.timeStart}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{e.timeEnd}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                          e.type === 'Audiência' ? 'bg-blue-900/10 text-blue-400 border-blue-500/20' : 
                          e.type === 'Prazo' ? 'bg-red-900/10 text-red-400 border-red-500/20' : 
                          'bg-gray-800 text-gray-400 border-gray-700'
                        }`}>
                          {e.type}
                        </span>
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{e.responsible}</span>
                      </div>
                      <h4 className="text-lg font-black text-white group-hover:text-[#D4AF37] transition-colors">{e.title}</h4>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center opacity-30 italic">
                  Nenhum evento registrado para este dia.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="graphite-dark border-2 border-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10">
              <h3 className="text-2xl font-black gold-text uppercase tracking-tighter mb-6">Novo Registro</h3>
              <div className="space-y-4">
                <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Título do Evento" className="w-full bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" value={form.timeStart} onChange={(e) => setForm({...form, timeStart: e.target.value})} className="bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm" />
                  <input type="time" value={form.timeEnd} onChange={(e) => setForm({...form, timeEnd: e.target.value})} className="bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm" />
                </div>
                <div className="pt-6 flex gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border border-gray-800 rounded-2xl font-black text-xs uppercase text-gray-500">Cancelar</button>
                  <button onClick={handleAddActivity} className="flex-1 py-4 gold-gradient rounded-2xl font-black text-xs uppercase text-white shadow-xl">Registrar</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;

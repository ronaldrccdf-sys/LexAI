
import React, { useState } from 'react';
import { Hearing } from '../types';
import { legalAssistantService } from '../services/gemini';

interface AudienciasProps {
  hearings: Hearing[];
  setHearings: React.Dispatch<React.SetStateAction<Hearing[]>>;
}

const Audiencias: React.FC<AudienciasProps> = ({ hearings, setHearings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [form, setForm] = useState<Partial<Hearing>>({
    matterNumber: '',
    clientName: '',
    type: 'Conciliação',
    date: '',
    time: '',
    court: '',
    modality: 'Telepresencial',
    responsible: 'Dr. Ronald Serra'
  });

  const handleRegisterResult = (id: string, result: any) => {
    setHearings(prev => prev.map(h => h.id === id ? { ...h, result } : h));
    alert(`Resultado "${result}" registrado.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await legalAssistantService.extractHearingData(base64, file.type);
        setForm(prev => ({
          ...prev,
          matterNumber: data.matterNumber || prev.matterNumber,
          date: data.date || prev.date,
          time: data.time || prev.time,
          court: data.court || prev.court,
          modality: (data.modality as any) || prev.modality,
          type: (data.type as any) || prev.type
        }));
        setIsExtracting(false);
      };
    } catch (err) {
      alert("Erro ao extrair dados do documento.");
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    const newHearing: Hearing = {
      id: Math.random().toString(36).substr(2, 9),
      matterId: 'manual',
      matterNumber: form.matterNumber || '',
      clientId: 'manual',
      clientName: form.clientName || 'Cliente Identificado',
      type: form.type as any,
      date: form.date || '',
      time: form.time || '',
      court: form.court || '',
      modality: form.modality as any,
      responsible: form.responsible || '',
      settlementProbability: 50,
      valueInvolved: 0
    };
    setHearings(prev => [newHearing, ...prev]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {isExtracting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-[#1C1C1C] p-10 rounded-[2.5rem] border border-[#D4AF37]/30 shadow-2xl text-center">
            <div className="w-16 h-16 border-4 border-[#D4AF37]/10 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-sm font-black gold-text uppercase tracking-widest animate-pulse">Lendo Pauta...</p>
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black gold-text tracking-tighter uppercase">Audiências</h2>
          <p className="text-gray-500 text-sm font-medium">Gestão centralizada (Sincronizada com Intimações).</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto gold-gradient px-8 py-4 rounded-2xl font-black text-white shadow-2xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
        >
          Agendar Audiência
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {hearings.length > 0 ? (
          hearings.map(h => (
            <div key={h.id} className="graphite-light p-8 rounded-3xl border border-gray-800 shadow-2xl flex flex-col lg:flex-row gap-8 items-start lg:items-center group hover:border-[#D4AF37] transition-all">
              <div className="flex-1 space-y-4 w-full text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-[#D4AF37]/20 mb-2 inline-block">
                      {h.type} {h.id.startsWith('auto-') ? '• SINC IA' : ''}
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight">{h.matterNumber}</h3>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-tighter">Cliente: {h.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{h.time}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{h.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-800">
                  <div><p className="text-[9px] text-gray-500 uppercase font-black">Órgão</p><p className="text-xs font-bold text-gray-300">{h.court}</p></div>
                  <div><p className="text-[9px] text-gray-500 uppercase font-black">Modalidade</p><p className="text-xs font-bold text-[#D4AF37]">{h.modality}</p></div>
                  <div><p className="text-[9px] text-gray-500 uppercase font-black">Resp.</p><p className="text-xs font-bold text-gray-300">{h.responsible}</p></div>
                  <div><p className="text-[9px] text-gray-500 uppercase font-black">Status</p><p className="text-xs font-black text-green-400">AGENDADA</p></div>
                </div>
              </div>
              <div className="w-full lg:w-64 space-y-3 pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-800 lg:pl-8">
                {h.result ? (
                  <div className="p-4 bg-green-900/10 border border-green-500/30 rounded-2xl text-center">
                    <p className="text-xs font-black text-green-400 uppercase tracking-widest">{h.result}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleRegisterResult(h.id, 'Acordo firmado')} className="text-[9px] font-black uppercase bg-green-600/10 text-green-400 p-2 rounded-xl hover:bg-green-600 hover:text-white transition-all">Acordo</button>
                    <button onClick={() => handleRegisterResult(h.id, 'Sem acordo')} className="text-[9px] font-black uppercase bg-red-600/10 text-red-400 p-2 rounded-xl hover:bg-red-600 hover:text-white transition-all">S/ Acordo</button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center opacity-30 italic">Nenhuma audiência detectada ou agendada.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="graphite-dark border-2 border-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black gold-text uppercase tracking-tighter">Agendar Audiência</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="space-y-6">
                <div className="relative border-2 border-dashed border-gray-700 rounded-3xl p-6 text-center group hover:border-[#D4AF37] transition-all bg-black/20">
                  <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📄</span>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {isExtracting ? 'LEXAI ANALISANDO...' : 'UPLOAD DE INTIMAÇÃO'}
                  </p>
                </div>
                <div className="space-y-4">
                  <input type="text" value={form.matterNumber} onChange={(e) => setForm({...form, matterNumber: e.target.value})} placeholder="Processo (CNJ)" className="w-full bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm focus:border-[#D4AF37]" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm" />
                    <input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} className="bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm" />
                  </div>
                  <input type="text" value={form.court} onChange={(e) => setForm({...form, court: e.target.value})} placeholder="Vara / Órgão" className="w-full bg-[#121212] border border-gray-700 p-4 rounded-2xl outline-none text-white text-sm" />
                </div>
                <div className="pt-6 flex gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border border-gray-800 rounded-2xl font-black text-xs uppercase text-gray-500">Cancelar</button>
                  <button onClick={handleSave} className="flex-1 py-4 gold-gradient rounded-2xl font-black text-xs uppercase text-white shadow-xl">Salvar</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Audiencias;

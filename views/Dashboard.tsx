
import React, { useState, useEffect, useMemo } from 'react';
import { legalAssistantService } from '../services/gemini';

interface DashboardProps {
  userName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userName }) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const stats = useMemo(() => ({
    intervencoes: [
      { id: 1, type: 'FIN', label: 'Financeiro', desc: 'Fatura Maria Souza pendente há 5 dias.', action: 'Cobrar' },
      { id: 2, type: 'JUR', label: 'Prazo Fatal', desc: 'Contestação Proc. 1000234 vence amanhã.', action: 'Redigir' },
    ],
    financeiro: { apurado: 15420, inadimplencia: 2 },
    prazos: 8,
    audiencias: 3,
    eficienciaIA: {
      horasSalvas: 24.5,
      pecasGeradas: 12,
      impactoProdutividade: 35
    }
  }), []);

  useEffect(() => {
    const fetchBriefing = async () => {
      setLoadingBriefing(true);
      try {
        const text = await legalAssistantService.generateDailyBriefing(stats, userName);
        setBriefing(text || 'Nenhum insight disponível no momento.');
      } catch (err) {
        console.error("Erro na carga do briefing:", err);
        setBriefing(`Bom dia, ${userName}.\n\n8 prazos fatais detectados.\nR$ 15.420,00 prontos para faturamento.`);
      } finally {
        setLoadingBriefing(false);
      }
    };
    fetchBriefing();
  }, [stats, userName]);

  return (
    <div className="space-y-12 animate-fadeIn pb-24 text-left max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-gray-800/50 pb-8">
        <div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3 opacity-70">
            LexAI - Inteligência Jurídica
          </p>
          <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-[0.85] flex flex-col transition-all duration-300">
            <span className="gold-text">Visão do</span>
            <span>Sócio</span>
          </h2>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="bg-black/40 px-6 py-4 rounded-3xl border border-gray-800 shadow-xl flex flex-col items-end">
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Status LexAI</p>
            <p className="text-[11px] font-black text-green-400 flex items-center gap-2 uppercase tracking-tight">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span> 
              Sistema Online
            </p>
          </div>
        </div>
      </header>

      <section className="briefing-card bg-gradient-to-br from-[#1c1c1c] to-[#121212] p-12 lg:p-16 rounded-[4rem] border border-[#D4AF37]/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-[#D4AF37]/10 transition-all duration-1000"></div>
        <div className="relative z-10">
          <h3 className="text-[11px] font-black gold-text uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
            <span className="text-2xl">✨</span> Briefing Estratégico do Dia
          </h3>
          {loadingBriefing ? (
            <div className="space-y-8 animate-pulse">
              <div className="h-4 bg-gray-800/50 rounded-full w-3/4"></div>
              <div className="h-4 bg-gray-800/50 rounded-full w-1/2"></div>
            </div>
          ) : (
            <div className="briefing-content text-gray-300 font-serif text-xl lg:text-2xl leading-[1.8] whitespace-pre-line italic opacity-90 text-justify">
              <div className="space-y-4 briefing-content">
                {briefing.split('\n').map((line, idx) => (
                  <p key={idx} className="briefing-content">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Valores a Faturar', val: `R$ ${stats.financeiro.apurado.toLocaleString()}`, sub: '5 ciclos aguardando emissão', color: 'gold-text', icon: '✨' },
          { label: 'Prazos (7 dias)', val: stats.prazos, sub: '2 urgências detectadas hoje', color: 'text-white', icon: '⚖️' },
          { label: 'Eficiência IA', val: `${stats.eficienciaIA.horasSalvas}h`, sub: 'Tempo economizado/semana', color: 'gold-text', icon: '⚡' },
          { label: 'Audiências', val: stats.audiencias, sub: 'Logística de pauta validada', color: 'text-white', icon: '📅' }
        ].map((s, i) => (
          <div key={i} className="graphite-light p-10 rounded-[3.5rem] border border-gray-800/50 shadow-2xl hover:border-[#D4AF37]/40 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-4xl opacity-5 group-hover:scale-110 transition-transform grayscale">{s.icon}</div>
            <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-[0.3em] opacity-80">{s.label}</p>
            <p className={`text-4xl font-black ${s.color} tracking-tighter mb-4 leading-none`}>{s.val}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{s.sub}</p>
          </div>
        ))}
      </section>

      <section className="bg-black/20 p-12 rounded-[4rem] border border-gray-800/50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex-1 space-y-4">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Impacto LexAI na Operação</h3>
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            Sua produtividade aumentou <span className="text-green-400 font-black">{stats.eficienciaIA.impactoProdutividade}%</span> esta semana através da automação de redação e triagem inteligente de documentos.
          </p>
        </div>
        <div className="flex gap-10">
           <div className="text-center">
              <p className="text-4xl font-black text-white tracking-tighter">{stats.eficienciaIA.pecasGeradas}</p>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">Peças por IA</p>
           </div>
           <div className="text-center">
              <p className="text-4xl font-black gold-text tracking-tighter">~3d</p>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">Ganhos em Duração</p>
           </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

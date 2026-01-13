
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { legalAssistantService } from '../services/gemini';

const COLORS = ['#D4AF37', '#1F2937', '#4B5563', '#9CA3AF'];

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financeiro' | 'contratos' | 'clientes' | 'performance' | 'risco'>('financeiro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  // Mock de dados consolidados (simulando agregação de todos os módulos)
  const firmData = useMemo(() => ({
    financeiro: {
      receitaMensal: 68500,
      receitaFixa: 32000,
      receitaVariavel: 36500,
      pendenteCobranca: 12400,
      previsao60dias: 145000,
      historico: [
        { mes: 'Jul', fixa: 28000, variavel: 12000 },
        { mes: 'Ago', fixa: 29500, variavel: 18000 },
        { mes: 'Set', fixa: 31000, variavel: 22000 },
        { mes: 'Out', fixa: 32000, variavel: 36500 },
      ]
    },
    contratos: {
      ativos: 48,
      vencendo30dias: 5,
      inadimplentes: 3,
      distribuicao: [
        { name: 'Mensalidade', value: 22 },
        { name: 'Êxito', value: 18 },
        { name: 'Híbrido', value: 8 },
      ]
    },
    clientes: {
      total: 156,
      topRentaveis: ['Maria Souza', 'Empresa XPTO', 'Construtora Alfa'],
      dependenciaFinanceira: "Alta (Top 3 clientes geram 65% da receita)",
      esforçoOperacional: "Médio"
    },
    performance: {
      taxaSucessoAcordos: "72%",
      tempoMedioRecebimento: "4.5 meses",
      execucoesAjuizadasMes: 12
    }
  }), []);

  const handleGenerateDiagnostico = async () => {
    setIsGenerating(true);
    try {
      const result = await legalAssistantService.generateManagementAnalysis(firmData);
      setAiAnalysis(result || '');
    } catch (err) {
      alert("Erro ao gerar análise LexAI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAskLexAI = async () => {
    if (!userQuery) return;
    setIsAnswering(true);
    try {
      const result = await legalAssistantService.answerManagementQuery(userQuery, firmData);
      setQueryResult(result || '');
    } catch (err) {
      alert("Erro na consulta consultiva.");
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-24 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="text-left w-full">
          <h2 className="text-4xl lg:text-5xl font-black gold-text tracking-tighter uppercase leading-none mb-3">Relatórios de Gestão</h2>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] opacity-60">Painel Executivo e Diagnóstico de Saúde do Negócio</p>
        </div>
        <button 
          onClick={handleGenerateDiagnostico}
          disabled={isGenerating}
          className="w-full md:w-auto gold-gradient px-10 py-5 rounded-[2.5rem] font-black text-white shadow-2xl text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
        >
          {isGenerating ? 'ANALISANDO DADOS...' : <>✨ GERAR DIAGNÓSTICO LexAI</>}
        </button>
      </header>

      {/* Alertas Gerenciais Automáticos */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="text-3xl text-red-500">⚠️</div>
          <div className="text-left">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Concentração de Receita</p>
            <p className="text-xs text-gray-300 font-bold">65% do faturamento depende de apenas 3 clientes. Alto risco operacional.</p>
          </div>
        </div>
        <div className="bg-blue-900/10 border border-blue-500/30 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="text-3xl text-blue-400">📈</div>
          <div className="text-left">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Oportunidade de Êxito</p>
            <p className="text-xs text-gray-300 font-bold">R$ 15.4k em honorários apurados prontos para faturamento imediato.</p>
          </div>
        </div>
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="text-3xl">🧠</div>
          <div className="text-left">
            <p className="text-[10px] font-black gold-text uppercase tracking-widest mb-1">Insights LexAI</p>
            <p className="text-xs text-gray-300 font-bold">Taxa de sucesso em acordos subiu 12% após revisão de teses em Outubro.</p>
          </div>
        </div>
      </section>

      {/* Diagnóstico Gerado pela IA */}
      {aiAnalysis && (
        <section className="bg-white text-gray-900 p-10 rounded-[3rem] shadow-2xl font-serif animate-slideUp border-t-8 border-[#D4AF37] text-left">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-black">Relatório Estratégico Mensal</h3>
            <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-black">✕</button>
          </div>
          <div className="prose prose-sm max-w-none text-base leading-relaxed whitespace-pre-wrap">
            {aiAnalysis}
          </div>
        </section>
      )}

      {/* Tabs de Categorias de Gestão */}
      <nav className="flex overflow-x-auto gap-3 pb-2 no-scrollbar border-b border-gray-800">
        {[
          { id: 'financeiro', label: 'Financeiro Executivo', icon: '💰' },
          { id: 'contratos', label: 'Gestão de Contratos', icon: '📜' },
          { id: 'clientes', label: 'Análise de Carteira', icon: '👥' },
          { id: 'performance', label: 'Performance Jurídica', icon: '⚡' },
          { id: 'risco', label: 'Risco e Alertas', icon: '🛡️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-5 rounded-[2rem] transition-all whitespace-nowrap text-[10px] font-black uppercase tracking-widest active:scale-95 ${
              activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-xl' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </nav>

      {/* Conteúdo Dinâmico por Tab */}
      <main className="min-h-[500px]">
        {activeTab === 'financeiro' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fadeIn text-left">
            <div className="graphite-light p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Receita Consolidada: Fixa vs Variável</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={firmData.financeiro.historico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="mes" stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1C1C1C', border: '1px solid #D4AF37', borderRadius: '15px', color: '#fff', fontSize: '10px' }}
                    />
                    <Bar dataKey="fixa" fill="#D4AF37" radius={[5, 5, 0, 0]} barSize={20} />
                    <Bar dataKey="variavel" fill="#1F2937" radius={[5, 5, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-800">
                  <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Receita Realizada (Mês)</p>
                  <p className="text-2xl font-black text-[#D4AF37]">R$ {firmData.financeiro.receitaMensal.toLocaleString()}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-gray-800">
                  <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Previsão Fluxo (60d)</p>
                  <p className="text-2xl font-black text-green-400">R$ {firmData.financeiro.previsao60dias.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="graphite-light p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl flex-1 flex flex-col justify-center text-left">
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-4">Saúde do Caixa</p>
                 <div className="text-6xl font-black text-white tracking-tighter">EXCELENTE</div>
                 <p className="text-[11px] text-gray-400 mt-6 leading-relaxed uppercase font-bold px-10">Escritório possui liquidez para sustentar 12 meses de custos fixos sem novas receitas.</p>
              </div>
              <div className="graphite-light p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl text-left">
                 <h4 className="text-sm font-black gold-text uppercase mb-6 tracking-widest">Ações Financeiras Prioritárias</h4>
                 <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-[#D4AF37] rounded-full"></span>
                      Cobrar 5 faturas vencidas (R$ 12.4k)
                    </li>
                    <li className="flex items-center gap-3 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-[#D4AF37] rounded-full"></span>
                      Antecipar honorários contratuais de Dezembro
                    </li>
                 </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contratos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fadeIn text-left">
             <div className="lg:col-span-1 graphite-light p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Perfil de Contratos</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={firmData.contratos.distribuicao}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {firmData.contratos.distribuicao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-start gap-4 text-[9px] font-black uppercase text-gray-500">
                   {firmData.contratos.distribuicao.map((d, i) => (
                     <div key={i} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></span> {d.name}
                     </div>
                   ))}
                </div>
             </div>
             <div className="lg:col-span-2 space-y-6">
                {[
                  { label: 'Contratos Ativos', value: firmData.contratos.ativos, sub: `Monitorados via LexAI` },
                  { label: 'Risco de Vencimento', value: firmData.contratos.vencendo30dias, sub: 'Ação comercial necessária' },
                  { label: 'Inadimplência Crítica', value: firmData.contratos.inadimplentes, sub: 'Suspensão de serviços sugerida' },
                ].map((item, i) => (
                  <div key={i} className="graphite-light p-8 rounded-[2.5rem] border border-gray-800 shadow-xl flex justify-between items-center hover:border-[#D4AF37] transition-all">
                    <div className="text-left">
                      <p className="text-[10px] text-gray-500 font-black uppercase mb-1">{item.label}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase">{item.sub}</p>
                    </div>
                    <div className="text-4xl font-black text-white">{item.value}</div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="space-y-10 animate-fadeIn text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="graphite-light p-10 rounded-[3rem] border border-gray-800 text-left shadow-xl">
                  <p className="text-[9px] text-gray-500 font-black uppercase mb-3">Base de Clientes</p>
                  <p className="text-4xl font-black text-white">{firmData.clientes.total}</p>
               </div>
               <div className="graphite-light p-10 rounded-[3rem] border border-gray-800 text-left shadow-xl">
                  <p className="text-[9px] text-gray-500 font-black uppercase mb-3">Esforço Operacional</p>
                  <p className="text-2xl font-black gold-text uppercase">{firmData.clientes.esforçoOperacional}</p>
               </div>
               <div className="md:col-span-2 graphite-light p-10 rounded-[3rem] border border-gray-800 shadow-xl flex items-center justify-between">
                  <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">ALERTA DE DEPENDÊNCIA:</p>
                  <p className="text-xs text-gray-400 font-bold uppercase text-right">{firmData.clientes.dependenciaFinanceira}</p>
               </div>
            </div>
            <div className="graphite-light p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl">
               <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Top Clientes em Rentabilidade Líquida</h3>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {firmData.clientes.topRentaveis.map((name, i) => (
                    <div key={i} className="bg-black/20 p-8 rounded-[2.5rem] border border-gray-800 text-left hover:scale-105 transition-all">
                       <span className="text-3xl mb-4 block">🏆</span>
                       <p className="text-sm font-black text-white uppercase tracking-tight">{name}</p>
                       <p className="text-[9px] text-[#D4AF37] font-black uppercase tracking-widest mt-2">Rank #{i+1}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {(activeTab === 'performance' || activeTab === 'risco') && (
          <div className="graphite-light p-20 rounded-[4rem] border border-gray-800 text-center opacity-40 animate-fadeIn">
            <div className="text-6xl mb-6">⚙️</div>
            <p className="text-sm font-black text-white uppercase tracking-[0.4em]">Módulo em Sincronização Analítica</p>
            <p className="text-xs text-gray-500 mt-4 font-bold">LexAI está processando os últimos desfechos processuais para apurar taxas reais.</p>
          </div>
        )}
      </main>

      {/* Consultor Executivo LexAI - Chat de Gestão */}
      <section className="bg-black/40 p-10 rounded-[4rem] border border-gray-800 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 space-y-8">
           <div className="flex items-center gap-4">
              <span className="w-12 h-12 gold-gradient rounded-2xl flex items-center justify-center text-xl shadow-xl">💬</span>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Consultor Executivo LexAI</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Respostas baseadas em inteligência financeira real</p>
              </div>
           </div>

           {queryResult && (
             <div className="bg-[#1C1C1C] p-8 rounded-[2.5rem] border-l-8 border-[#D4AF37] animate-slideUp">
               <p className="text-sm text-gray-300 leading-relaxed font-serif whitespace-pre-wrap">{queryResult}</p>
               <button onClick={() => setQueryResult(null)} className="text-[9px] font-black gold-text uppercase mt-4 hover:underline">Limpar Consulta</button>
             </div>
           )}

           <div className="flex gap-4">
              <input 
                type="text" 
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ex: 'Onde estamos perdendo dinheiro?' ou 'Resuma o mês'..."
                className="flex-1 bg-black/60 border border-gray-700 p-5 rounded-3xl outline-none text-white font-bold text-sm focus:border-[#D4AF37] transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleAskLexAI()}
              />
              <button 
                onClick={handleAskLexAI}
                disabled={isAnswering || !userQuery}
                className="gold-gradient px-10 rounded-3xl font-black text-white text-[11px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
              >
                {isAnswering ? '...' : 'PERGUNTAR'}
              </button>
           </div>
        </div>
      </section>

      <style>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default Reports;

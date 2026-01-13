
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import Dashboard from './views/Dashboard';
import Matters from './views/Matters';
import AIStudio from './views/AIStudio';
import Contacts from './views/Contacts';
import Audiencias from './views/Audiencias';
import Agenda from './views/Agenda';
import Billing from './views/Billing';
import Reports from './views/Reports';
import { View, Case, Hearing, AgendaEvent, Contact } from './types';
import { legalAssistantService } from './services/gemini';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [aiContext, setAiContext] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean | null>(null);
  const [userName] = useState('Dr. Ronald Serra');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Application States
  const [contacts, setContacts] = useState<Contact[]>([
    { id: '1', name: 'Maria Souza', document: '123.456.789-00', email: 'maria@email.com', phone: '(11) 99999-9999', type: 'Individual', totalMatters: 2, folderId: 'folder_1', category: 'Recorrente', financialStatus: 'Em dia' }
  ]);
  const [matters, setMatters] = useState<Case[]>([
    { 
      id: '1', 
      number: '1000234-12.2023.8.26.0100', 
      title: 'Inventário Família Souza', 
      client: 'Maria Souza', 
      opposingParty: 'Fazenda Pública Estadual',
      status: 'Aberto', 
      type: 'Cível', 
      responsible: 'Dr. Ronald Serra', 
      openDate: '12/01/2023', 
      billableHours: 42.5,
      lastMovementSummary: 'O juiz determinou a juntada de novas certidões negativas de débito para prosseguimento da partilha.'
    }
  ]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);

  // Action Bridge for AI
  const handleAIAction = async (name: string, args: any) => {
    switch (name) {
      case 'register_client':
        const newClient: Contact = {
          id: Math.random().toString(36).substr(2, 9),
          name: args.name,
          document: args.document,
          email: args.email || '',
          phone: args.phone || '',
          type: args.document.length > 14 ? 'Empresa' : 'Individual',
          totalMatters: 0,
          folderId: `folder_${Date.now()}`,
          category: args.category || 'Novo (IA)',
          financialStatus: 'Em dia'
        };
        setContacts(prev => [newClient, ...prev]);
        return `Cliente ${args.name} cadastrado com sucesso na base de dados.`;

      case 'navigate_to_view':
        setCurrentView(args.view);
        return `Navegando para a seção de ${args.view}...`;

      case 'generate_management_report':
        setCurrentView('relatorios');
        return `Preparei o relatório sobre ${args.topic}. Você já pode visualizá-lo na tela de Relatórios.`;

      case 'create_legal_case':
        const newCase: Case = {
          id: Math.random().toString(36).substr(2, 9),
          number: args.number,
          title: args.title || 'Novo Caso Judicial',
          client: args.clientName,
          opposingParty: 'A definir',
          status: 'Aberto',
          type: args.type || 'Cível',
          responsible: userName,
          openDate: new Date().toLocaleDateString('pt-BR'),
          billableHours: 0
        };
        setMatters(prev => [newCase, ...prev]);
        return `Processo ${args.number} criado e vinculado a ${args.clientName}.`;

      default:
        console.warn("Ação não reconhecida:", name);
    }
  };

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    setIsApiKeySelected(true); 
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard userName={userName} />;
      case 'processos': return <Matters matters={matters} setMatters={setMatters} onGenerateAI={(ctx) => { setAiContext(ctx); setCurrentView('estudio-ia'); }} />;
      case 'contatos': return <Contacts externalContacts={contacts} setExternalContacts={setContacts} />;
      case 'audiencias': return <Audiencias hearings={hearings} setHearings={setHearings} />;
      case 'agenda': return <Agenda events={agendaEvents} setEvents={setAgendaEvents} />;
      case 'faturamento': return <Billing />;
      case 'relatorios': return <Reports />;
      case 'estudio-ia': return <AIStudio initialContext={aiContext} userName={userName} />;
      default: return <Dashboard userName={userName} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-primary transition-colors duration-300">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 graphite-dark border-b border-gray-800/50 flex items-center justify-between px-10 shrink-0 z-30">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-400 p-2 hover:bg-white/5 rounded-xl">☰</button>
            <h2 className="text-[10px] font-black gold-text uppercase tracking-[0.5em] opacity-80">{currentView}</h2>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={toggleTheme} className="p-3 bg-white/5 rounded-2xl border border-gray-800 text-lg">
               {theme === 'dark' ? '☀️' : '🌙'}
             </button>
             <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center text-xs font-black text-white shadow-2xl">{userName.split(' ').map(n => n[0]).join('').substring(0,2)}</div>
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-14 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto h-full">{renderView()}</div>
        </main>
      </div>
      
      <AIAssistant 
        onAction={handleAIAction} 
        appContext={{ contacts, matters, agendaEvents, hearings }} 
      />
    </div>
  );
};

export default App;

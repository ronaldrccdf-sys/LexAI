
import React, { useState, useEffect } from 'react';
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
import { api } from './services/api';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [aiContext, setAiContext] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean | null>(null);
  const [userName] = useState('Dr. Ronald Serra');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Application States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [matters, setMatters] = useState<Case[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

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
        try {
          const saved = await api.createContact(newClient);
          setContacts(prev => [saved, ...prev]);
          return `Cliente ${args.name} cadastrado com sucesso na base de dados.`;
        } catch (error) {
          console.error(error);
          return 'Não foi possível salvar o cliente no backend.';
        }

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
        try {
          const saved = await api.createMatter(newCase);
          setMatters(prev => [saved, ...prev]);
          return `Processo ${args.number} criado e vinculado a ${args.clientName}.`;
        } catch (error) {
          console.error(error);
          return 'Não foi possível salvar o processo no backend.';
        }

      default:
        console.warn("Ação não reconhecida:", name);
    }
  };

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');
  }, [theme]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await api.health();
        const [contactsData, mattersData, hearingsData, agendaData] = await Promise.all([
          api.getContacts(),
          api.getMatters(),
          api.getHearings(),
          api.getAgenda()
        ]);
        setContacts(contactsData);
        setMatters(mattersData);
        setHearings(hearingsData);
        setAgendaEvents(agendaData);
        setApiError(null);
      } catch (error) {
        console.error(error);
        setApiError('Backend indisponível. Inicie o servidor para acessar o LexAI.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-gray-400 text-sm">
        Conectando ao backend...
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-center gap-4 text-gray-400 text-sm px-6">
        <p className="text-lg font-black gold-text">Backend obrigatório</p>
        <p>{apiError}</p>
        <p className="text-[10px] uppercase tracking-widest">Execute: cd backend && npm install && npm run dev</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-primary transition-colors duration-300">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 sm:h-20 graphite-dark border-b border-gray-800/50 flex items-center justify-between px-4 sm:px-6 lg:px-10 shrink-0 z-30">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-400 p-2 hover:bg-white/5 rounded-xl">☰</button>
            <h2 className="text-[10px] font-black gold-text uppercase tracking-[0.5em] opacity-80">{currentView}</h2>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
             <button onClick={toggleTheme} className="p-3 bg-white/5 rounded-2xl border border-gray-800 text-lg">
               {theme === 'dark' ? '☀️' : '🌙'}
             </button>
             <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center text-xs font-black text-white shadow-2xl">{userName.split(' ').map(n => n[0]).join('').substring(0,2)}</div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-14 overflow-y-auto no-scrollbar">
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

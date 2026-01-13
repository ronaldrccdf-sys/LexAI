
import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'processos', label: 'Processos', icon: '📁' },
    { id: 'contatos', label: 'Clientes', icon: '👥' },
    { id: 'audiencias', label: 'Audiências', icon: '⚖️' },
    { id: 'agenda', label: 'Agenda', icon: '📅' },
    { id: 'faturamento', label: 'Financeiro', icon: '💰' },
    { id: 'estudio-ia', label: 'LexAI Studio', icon: '✨' },
    { id: 'relatorios', label: 'Relatórios', icon: '📊' },
  ];

  const handleNav = (view: View) => {
    onViewChange(view);
    if (window.innerWidth < 1024) onClose();
  };

  const logoUrl = "https://lh3.googleusercontent.com/d/1gfZj1_zgtC6UnRqJDk_D1Z9ZIIdAG5Yy"; 

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}
      
      <div className={`
        fixed lg:sticky top-0 left-0 z-50
        w-64 h-screen graphite-dark border-r border-gray-800 
        flex flex-col transition-transform duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 flex flex-col gap-2 text-left">
          <div className="flex items-center gap-2">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="Logo LexAI" 
                className="w-full h-full object-contain logo-img"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black gold-text tracking-tighter leading-none">
                LexAI
              </h1>
              <span className="text-[8px] tracking-[0.4em] opacity-40 uppercase font-black dark:text-white text-black">PRO EDITION</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar pb-10">
          <p className="px-4 text-[8px] font-black text-gray-600 uppercase tracking-widest mb-4">Módulos de Gestão</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id as View)}
              className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all group ${
                currentView === item.id 
                ? 'bg-[#D4AF37] text-black shadow-[0_10px_20px_rgba(212,175,55,0.2)]' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`text-lg transition-transform group-hover:scale-125 ${currentView === item.id ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-8 border-t border-gray-800">
          <div className="bg-black/40 p-4 rounded-2xl border border-gray-800">
             <p className="text-[9px] text-gray-500 font-black uppercase mb-2 tracking-widest"><span className="normal-case">LexAI</span> v3.1</p>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] text-white font-bold">IA Ativa</p>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

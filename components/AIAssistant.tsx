
import React, { useState, useRef } from 'react';
import { legalAssistantService, UploadedFile } from '../services/gemini';

interface AIAssistantProps {
  onAction: (actionName: string, args: any) => Promise<string | void>;
  appContext: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onAction, appContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, type?: 'text' | 'action'}[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const logoUrl = "https://lh3.googleusercontent.com/d/1gfZj1_zgtC6UnRqJDk_D1Z9ZIIdAG5Yy"; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          data: (reader.result as string).split(',')[1],
          type: file.type,
          role: 'source'
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!query && attachedFiles.length === 0) return;
    
    const userMsg = query || `[Envio de ${attachedFiles.length} arquivo(s)]`;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const result = await legalAssistantService.unifiedActionHandler(query, attachedFiles, appContext);
      
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const call of result.toolCalls) {
          setMessages(prev => [...prev, { role: 'ai', content: `Executando: ${call.name.replace(/_/g, ' ')}...`, type: 'action' }]);
          const actionResult = await onAction(call.name, call.args);
          if (actionResult) {
            setMessages(prev => [...prev, { role: 'ai', content: actionResult }]);
          }
        }
      }

      if (result.text) {
        setMessages(prev => [...prev, { role: 'ai', content: result.text }]);
      }

      setAttachedFiles([]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Desculpe, tive um problema ao processar esse comando.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <div className="w-80 sm:w-96 graphite-light border border-[#D4AF37]/30 rounded-[2.5rem] shadow-2xl flex flex-col h-[600px] animate-slideUp overflow-hidden">
          <div className="p-6 gold-gradient flex justify-between items-center text-white shadow-lg">
            <h3 className="font-black flex items-center gap-3 text-sm uppercase tracking-widest">
              <div className="bg-white p-1.5 rounded-xl shadow-inner flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt="LexAI" 
                  className="w-7 h-7 object-contain"
                />
              </div>
              <span>Cérebro <span className="normal-case">LexAI</span></span>
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform bg-black/20 p-2 rounded-full">✕</button>
          </div>
          
          <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto bg-black/40 space-y-4 no-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                <span className="text-5xl">⚡</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Peça para cadastrar clientes, gerar relatórios ou redigir peças.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-xs font-medium leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#D4AF37] text-black rounded-tr-none' 
                    : msg.type === 'action' 
                      ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/10'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-4 rounded-3xl animate-pulse flex gap-2">
                  <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-black/20 border-t border-gray-800 space-y-3">
            {attachedFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {attachedFiles.map(f => (
                  <div key={f.id} className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-3 py-1 rounded-full flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black text-[#D4AF37] uppercase truncate max-w-[80px]">{f.name}</span>
                    <button onClick={() => setAttachedFiles(p => p.filter(x => x.id !== f.id))} className="text-red-400 text-[10px]">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-800 rounded-2xl text-xl hover:bg-gray-700 transition-colors">📎</button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Comande a LexAI..."
                className="flex-1 bg-black border border-gray-800 p-4 rounded-2xl text-xs text-white outline-none focus:border-[#D4AF37]"
              />
              <button onClick={handleSend} className="gold-gradient px-5 rounded-2xl text-white font-black">➔</button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-[1.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-center animate-bounce border-2 border-[#D4AF37]/50 group"
        >
          <img 
            src={logoUrl} 
            alt="LexAI" 
            className="w-10 h-10 object-contain"
          />
        </button>
      )}
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default AIAssistant;

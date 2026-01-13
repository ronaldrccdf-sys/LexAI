
import React, { useState, useRef, useEffect } from 'react';
import { legalAssistantService, JurisprudenceItem, DoctrineItem, UploadedFile, JurisprudenceFilters, convertWordToHtml } from '../services/gemini';

interface LegalTemplate {
  id: string;
  label: string;
}

const LEGAL_TEMPLATES: LegalTemplate[] = [
  { id: 'inicial', label: 'Petição Inicial' },
  { id: 'execucao', label: 'Execução' },
  { id: 'cumprimento', label: 'Cumprimento de Sentença' },
  { id: 'contestacao', label: 'Contestação' },
  { id: 'hc', label: 'Habeas Corpus' },
  { id: 'ms', label: 'Mandado de Segurança' },
  { id: 'apelacao', label: 'Recurso de Apelação' },
  { id: 'agravo', label: 'Agravo de Instrumento' },
  { id: 'resp', label: 'Recurso Especial' },
  { id: 'rext', label: 'Recurso Extraordinário' },
  { id: 'notificacao', label: 'Notificação Extrajudicial' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'outro', label: 'Outro' },
];

const AIStudio: React.FC<{ initialContext?: string, userName: string }> = ({ initialContext, userName }) => {
  const [prompt, setPrompt] = useState(initialContext || '');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [foundJurisprudence, setFoundJurisprudence] = useState<JurisprudenceItem[]>([]);
  const [foundDoctrines, setFoundDoctrines] = useState<DoctrineItem[]>([]);
  const [selectedJurisIds, setSelectedJurisIds] = useState<Set<string>>(new Set());
  const [selectedDoctrineIds, setSelectedDoctrineIds] = useState<Set<string>>(new Set());
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [latency, setLatency] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('inicial');
  const [generatedHtml, setGeneratedHtml] = useState('');
  
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState<'files' | 'radar' | 'doutrina' | 'templates' | 'branding'>('files');

  const [wordTemplateFile, setWordTemplateFile] = useState<{name: string, data: string} | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const latencyTimerRef = useRef<any>(null);

  useEffect(() => {
    if (isGenerating || isSearching) {
      const start = Date.now();
      latencyTimerRef.current = setInterval(() => setLatency(Date.now() - start), 10);
    } else {
      clearInterval(latencyTimerRef.current);
    }
    return () => clearInterval(latencyTimerRef.current);
  }, [isGenerating, isSearching]);

  const handleGenerate = async () => {
    if (!prompt && uploadedFiles.length === 0) {
      alert("Descreva o caso para iniciar a redação.");
      return;
    }
    
    setGeneratedHtml('');
    setIsGenerating(true);
    setIsToolboxOpen(false);
    setGenerationStatus('LexAI redigindo fundamentação jurídica...');

    try {
      const selectedJuris = foundJurisprudence.filter(j => selectedJurisIds.has(j.id));
      const selectedDocs = foundDoctrines.filter(d => selectedDoctrineIds.has(d.id));
      const templateLabel = LEGAL_TEMPLATES.find(t => t.id === selectedTemplate)?.label || 'Peça Profissional';
      
      const result = await legalAssistantService.advancedLegalDrafting({
        prompt: `PEÇA: ${templateLabel}. DIRETRIZES: ${prompt}`,
        files: uploadedFiles,
        jurisprudence: selectedJuris,
        doctrines: selectedDocs
      });
      
      if (result && result.html) {
        const today = new Date().toLocaleDateString('pt-BR');
        const signature = `
          <div style="margin-top: 100px; text-align: center; font-family: 'Times New Roman', serif; color: black;">
            <p>Brasília, ${today}.</p>
            <br/><br/>
            <p style="font-weight: bold; margin: 0;">${userName}</p>
            <p style="margin: 0;">Advogado</p>
          </div>
        `;
        setGeneratedHtml(result.html + signature);
      } else {
        throw new Error("Erro no motor de redação.");
      }
    } catch (e: any) {
      alert('Erro inesperado no LexAI Studio.');
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleSearchRadar = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      if (activeToolTab === 'radar') {
        const results = await legalAssistantService.searchJurisprudence(searchQuery, {});
        setFoundJurisprudence(results);
      } else {
        const results = await legalAssistantService.searchDoctrines(searchQuery);
        setFoundDoctrines(results);
      }
    } catch (e) {
      alert('Erro ao buscar fontes no Radar LexAI.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleShareSource = async (title: string, uri: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Fonte LexAI: ${title}`,
          url: uri
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Erro ao compartilhar:", err);
          try {
            await navigator.clipboard.writeText(uri);
            alert("Link copiado para a área de transferência.");
          } catch (clipErr) {
            console.error("Erro ao copiar:", clipErr);
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(uri);
        alert("Link copiado com sucesso!");
      } catch (err) {
        alert("Não foi possível copiar o link.");
      }
    }
  };

  const handleBrandingWordUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setWordTemplateFile({ name: file.name, data: (reader.result as string).split(',')[1] });
    reader.readAsDataURL(file);
  };

  const handleDownloadDoc = async () => {
    if (!generatedHtml) return;
    setIsDownloading(true);

    let contentToSave = generatedHtml;

    if (wordTemplateFile) {
      const templateHtml = await convertWordToHtml(wordTemplateFile.data);
      if (templateHtml) {
        if (templateHtml.includes('{{CONTEUDO}}')) {
          contentToSave = templateHtml.replace('{{CONTEUDO}}', generatedHtml);
        } else {
          contentToSave = templateHtml + '<br clear="all" style="page-break-before:always" />' + generatedHtml;
        }
      }
    }

    const fullDocHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page { size: 21cm 29.7cm; margin: 2.5cm 2.5cm 2.5cm 2.5cm; }
          body { font-family: 'Times New Roman', serif; line-height: 1.5; color: black; background: white; text-align: justify; }
          p { margin: 0 0 12pt; font-size: 12pt; }
          h1, h2, h3 { color: black; text-align: center; font-size: 14pt; margin-bottom: 20pt; font-weight: bold; }
          b, strong { font-weight: bold; }
        </style>
      </head>
      <body>
        ${contentToSave}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', fullDocHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LexAI_Peca_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloading(false);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-6 animate-fadeIn text-left">
      
      <section className="sticky top-0 z-50 pt-2 pb-4 bg-primary">
        <div className="graphite-light p-4 rounded-[2.5rem] shadow-2xl border border-gray-800 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsToolboxOpen(!isToolboxOpen)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all border ${
                isToolboxOpen 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                  : 'bg-white text-black border-gray-200 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {isToolboxOpen ? '✕' : '+'}
            </button>

            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Instruções para a redação da peça..."
              className="flex-1 bg-transparent border-none outline-none text-white text-base font-medium placeholder:text-gray-600 resize-none h-12 py-3 px-2 no-scrollbar"
              onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            />

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || isSearching}
              className="gold-gradient w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all disabled:opacity-30 text-white"
            >
              {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '➔'}
            </button>
          </div>

          <div className="flex gap-2 px-2 overflow-x-auto no-scrollbar">
            {selectedTemplate && <span className="bg-blue-900/20 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{LEGAL_TEMPLATES.find(t => t.id === selectedTemplate)?.label}</span>}
            {wordTemplateFile && <span className="bg-green-900/20 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">TIMBRADO ATIVO</span>}
            {(selectedJurisIds.size > 0 || selectedDoctrineIds.size > 0) && <span className="bg-purple-900/20 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{selectedJurisIds.size + selectedDoctrineIds.size} FONTES</span>}
          </div>
        </div>

        {isToolboxOpen && (
          <div className="absolute top-full mt-4 left-0 right-0 graphite-light rounded-[2.5rem] shadow-2xl border border-gray-800 p-6 animate-slideDown z-40">
            <nav className="flex gap-4 mb-6 border-b border-gray-800 pb-4 overflow-x-auto no-scrollbar">
              <button onClick={() => setActiveToolTab('files')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeToolTab === 'files' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>📁 Arquivos</button>
              <button onClick={() => setActiveToolTab('radar')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeToolTab === 'radar' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>⚖️ Juris</button>
              <button onClick={() => setActiveToolTab('doutrina')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeToolTab === 'doutrina' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>📚 Doutrina</button>
              <button onClick={() => setActiveToolTab('templates')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeToolTab === 'templates' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>🏛️ Modelos</button>
              <button onClick={() => setActiveToolTab('branding')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeToolTab === 'branding' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>🏢 Timbrado</button>
            </nav>

            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
              {activeToolTab === 'files' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <button onClick={() => fileInputRef.current?.click()} className="p-4 border border-dashed border-gray-700 rounded-2xl text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">+ Adicionar Insumo</button>
                   <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      files.forEach(f => {
                        const reader = new FileReader();
                        reader.onload = () => setUploadedFiles(prev => [...prev, { id: Math.random().toString(), name: f.name, data: (reader.result as string).split(',')[1], type: f.type, role: 'source' }]);
                        reader.readAsDataURL(f);
                      });
                   }} />
                   {uploadedFiles.map(f => <div key={f.id} className="bg-black/40 p-3 rounded-2xl border border-gray-800 flex justify-between items-center"><span className="text-[10px] font-bold text-gray-300 truncate">{f.name}</span><button onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))} className="text-red-500 text-xs px-2">✕</button></div>)}
                </div>
              )}

              {(activeToolTab === 'radar' || activeToolTab === 'doutrina') && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={activeToolTab === 'radar' ? "Pesquisar Jurisprudência..." : "Pesquisar Artigos no Google Scholar..."} className="flex-1 bg-black/60 border border-gray-800 p-4 rounded-xl text-xs text-white outline-none focus:border-[#D4AF37] font-bold uppercase" onKeyPress={(e) => e.key === 'Enter' && handleSearchRadar()} />
                    <button onClick={handleSearchRadar} disabled={isSearching} className="gold-gradient px-6 rounded-xl text-white font-black text-[10px] uppercase flex items-center justify-center min-w-[100px]">
                      {isSearching ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'BUSCAR'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {isSearching ? (
                      <div className="py-12 text-center flex flex-col items-center justify-center animate-fadeIn">
                         <div className="w-10 h-10 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4"></div>
                         <p className="text-[9px] font-black gold-text uppercase tracking-[0.3em] animate-pulse">Consultando Radar LexAI...</p>
                         <p className="text-[8px] text-gray-600 font-bold uppercase mt-2">Isto pode levar alguns segundos para garantir precisão técnica.</p>
                      </div>
                    ) : (
                      activeToolTab === 'radar' ? foundJurisprudence.map(j => (
                        <div key={j.id} className={`p-4 rounded-2xl border transition-all ${selectedJurisIds.has(j.id) ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-black/30 border-gray-800'}`}>
                          <div className="flex justify-between items-start mb-2" onClick={() => {
                            const next = new Set(selectedJurisIds);
                            if(next.has(j.id)) next.delete(j.id); else next.add(j.id);
                            setSelectedJurisIds(next);
                          }}>
                            <p className="text-[11px] font-black text-white uppercase flex-1 cursor-pointer">⚖️ {j.title}</p>
                            <div className={`w-4 h-4 rounded-full border ${selectedJurisIds.has(j.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-600'}`}></div>
                          </div>
                          <div className="flex gap-3 mt-3 border-t border-gray-800/50 pt-3">
                             <button onClick={(e) => { e.stopPropagation(); window.open(j.uri, '_blank'); }} className="text-[9px] font-black text-gray-400 hover:text-[#D4AF37] uppercase tracking-widest flex items-center gap-1">🔗 Abrir Link</button>
                             <button onClick={(e) => { e.stopPropagation(); handleShareSource(j.title, j.uri); }} className="text-[9px] font-black text-gray-400 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1">📤 Compartilhar</button>
                          </div>
                        </div>
                      )) : foundDoctrines.map(d => (
                        <div key={d.id} className={`p-4 rounded-2xl border transition-all ${selectedDoctrineIds.has(d.id) ? 'bg-blue-900/10 border-blue-500' : 'bg-black/30 border-gray-800'}`}>
                          <div className="flex justify-between items-start mb-2" onClick={() => {
                            const next = new Set(selectedDoctrineIds);
                            if(next.has(d.id)) next.delete(d.id); else next.add(d.id);
                            setSelectedDoctrineIds(next);
                          }}>
                            <p className="text-[11px] font-black text-white uppercase flex-1 cursor-pointer">📚 {d.title}</p>
                            <div className={`w-4 h-4 rounded-full border ${selectedDoctrineIds.has(d.id) ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-600'}`}></div>
                          </div>
                          <div className="flex gap-3 mt-3 border-t border-gray-800/50 pt-3">
                             <button onClick={(e) => { e.stopPropagation(); window.open(d.uri, '_blank'); }} className="text-[9px] font-black text-gray-400 hover:text-[#D4AF37] uppercase tracking-widest flex items-center gap-1">🔗 Abrir Fonte</button>
                             <button onClick={(e) => { e.stopPropagation(); handleShareSource(d.title, d.uri); }} className="text-[9px] font-black text-gray-400 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1">📤 Compartilhar</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeToolTab === 'templates' && (
                <div className="flex flex-wrap gap-2">
                  {LEGAL_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => setSelectedTemplate(tpl.id)} className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedTemplate === tpl.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-black/30 text-gray-400 border-gray-800 hover:border-gray-600'}`}>{tpl.label}</button>
                  ))}
                </div>
              )}

              {activeToolTab === 'branding' && (
                <div className="space-y-4">
                  <div className="bg-black/20 border-2 border-dashed border-gray-800 rounded-3xl p-8 text-center relative group hover:border-[#D4AF37] transition-all">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".docx" onChange={handleBrandingWordUpload} />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{wordTemplateFile ? wordTemplateFile.name : 'Upload Papel Timbrado (.docx)'}</p>
                    <p className="text-[9px] text-gray-600 mt-2">Dica: Use a tag {"{{CONTEUDO}}"} no seu arquivo para definir onde o texto será inserido.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="flex-1 flex flex-col items-center">
        {isGenerating ? (
          <div className="py-40 text-center space-y-6">
            <div className="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-black gold-text uppercase tracking-widest">{generationStatus}</p>
            <p className="text-[10px] text-gray-500 uppercase">Tempo: {(latency/1000).toFixed(1)}s</p>
          </div>
        ) : generatedHtml ? (
          <div className="w-full max-w-[21cm] bg-white shadow-2xl p-20 animate-fadeIn border border-gray-100 mb-12 min-h-[29.7cm] relative text-black">
            <div className="flex justify-between items-center mb-10 border-b border-gray-50 pb-4 no-print">
               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Visualização ABNT LexAI</span>
               <div className="flex gap-3">
                 <button onClick={() => { navigator.clipboard.writeText(generatedHtml.replace(/<[^>]*>/g, '')); alert('Texto puro copiado!'); }} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-[10px] font-black uppercase hover:bg-gray-200 transition-all">Copiar Texto</button>
                 <button onClick={handleDownloadDoc} disabled={isDownloading} className="bg-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase hover:scale-105 transition-all">
                   {isDownloading ? 'Gerando .DOC...' : 'Baixar .DOC Timbrado'}
                 </button>
               </div>
            </div>
            <div className="font-serif text-justify leading-relaxed" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
          </div>
        ) : (
          <div className="py-40 opacity-10 text-center select-none pointer-events-none">
            <span className="text-[10rem]">⚖️</span>
            <p className="text-xl font-black uppercase tracking-[1em]">LexAI Studio</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AIStudio;


import React from 'react';
import { Case } from '../types';

// Updated mock data to match the Case interface and fix status type errors
const mockCases: Case[] = [
  // Fix: status changed from 'Open' to 'Aberto' to match Case interface
  { id: '1', number: '2023.0001.S', title: 'Inventário - Família Souza', client: 'Maria Souza', status: 'Aberto', type: 'Cível', responsible: 'Ricardo Silva', openDate: '2023-01-01', billableHours: 0, nextDeadline: '15/10/2023' },
  // Fix: status changed from 'Pending' to 'Pendente' to match Case interface
  { id: '2', number: '2023.0492.E', title: 'Recurso Trabalhista', client: 'Empresa XPTO', status: 'Pendente', type: 'Trabalhista', responsible: 'Julia Mendes', openDate: '2023-03-05', billableHours: 0, nextDeadline: '20/10/2023' },
  // Fix: status changed from 'Open' to 'Aberto' to match Case interface
  { id: '3', number: '2023.0015.A', title: 'Ação de Cobrança', client: 'José Pereira', status: 'Aberto', type: 'Cível', responsible: 'Ricardo Silva', openDate: '2023-03-22', billableHours: 0, nextDeadline: '12/11/2023' },
  // Fix: status changed from 'Open' to 'Aberto' to match Case interface
  { id: '4', number: '2023.0881.C', title: 'Habeas Corpus', client: 'Anonimizados', status: 'Aberto', type: 'Criminal', responsible: 'Ricardo Silva', openDate: '2023-06-10', billableHours: 0, nextDeadline: '05/10/2023' },
];

const Cases: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold gold-text">Meus Processos</h2>
          <p className="text-gray-500">Gerencie sua carteira de clientes e prazos.</p>
        </div>
        <button className="gold-gradient px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:scale-105 transition-all">
          + NOVO PROCESSO
        </button>
      </header>

      <div className="flex gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Buscar por cliente, nº do processo ou palavra-chave..."
          className="flex-1 bg-graphite-light border border-gray-800 p-3 rounded-lg text-white focus:border-gold outline-none"
        />
        <select className="bg-graphite-light border border-gray-800 p-3 rounded-lg text-white outline-none">
          <option>Todos Status</option>
          <option>Ativos</option>
          <option>Pausados</option>
        </select>
      </div>

      <div className="graphite-light border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#1C1C1C] text-xs uppercase text-gray-500 tracking-wider">
            <tr>
              <th className="px-6 py-4">Processo</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Próx. Prazo</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {mockCases.map((c) => (
              <tr key={c.id} className="hover:bg-[#333] transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-semibold text-white">{c.title}</p>
                  <p className="text-xs text-gray-500">#{c.id}0239482</p>
                </td>
                <td className="px-6 py-4 text-gray-300">{c.client}</td>
                <td className="px-6 py-4 text-gray-300">{c.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    // Fixed: Changed comparison from 'Open' to 'Aberto' to match Case status type
                    c.status === 'Aberto' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300 font-mono">{c.nextDeadline}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-gray-800 rounded hover:text-gold-text">👁️</button>
                    <button className="p-2 bg-gray-800 rounded hover:text-gold-text">✨</button>
                    <button className="p-2 bg-gray-800 rounded hover:text-red-500">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Cases;

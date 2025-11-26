import React from 'react';
import { GoalSettings } from '../types';
import { X } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: GoalSettings;
  setGoals: (goals: GoalSettings) => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, goals, setGoals }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl scale-100 transition-transform">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h3 className="text-lg font-bold text-slate-100">Configurar Metas</h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                <X size={20} />
            </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Meta Trabalhados (Ciclo)</label>
            <input 
                type="number" 
                value={goals.trabalhados} 
                onChange={(e) => setGoals({...goals, trabalhados: Number(e.target.value)})} 
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-500" 
            />
          </div>
          <div className="flex gap-3">
            <div className="w-1/2">
                <label className="block text-sm font-semibold text-slate-300 mb-1">Mín Diária</label>
                <input 
                    type="number" 
                    value={goals.diariaMin} 
                    onChange={(e) => setGoals({...goals, diariaMin: Number(e.target.value)})} 
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
            </div>
            <div className="w-1/2">
                <label className="block text-sm font-semibold text-slate-300 mb-1">Máx Diária</label>
                <input 
                    type="number" 
                    value={goals.diariaMax} 
                    onChange={(e) => setGoals({...goals, diariaMax: Number(e.target.value)})} 
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Eficiência Mínima (%)</label>
            <input 
                type="number" 
                value={goals.eficienciaMin} 
                onChange={(e) => setGoals({...goals, eficienciaMin: Number(e.target.value)})} 
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg font-medium transition-colors">Cancelar</button>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-all">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
};
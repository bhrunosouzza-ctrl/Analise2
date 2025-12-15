
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { X, Briefcase, CheckCircle, XCircle, AlertCircle, Droplet, Home, Calendar, TrendingUp } from 'lucide-react';
import { ProductionData } from '../types';
import { COLORS } from '../utils';

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  data: ProductionData[]; // This should be data filtered by Year, but containing all Cycles/Months
}

export const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({ isOpen, onClose, agentName, data }) => {
  if (!isOpen) return null;

  // Aggregate data for the agent
  const analytics = useMemo(() => {
    const agg = {
      supervisor: data[0]?.Supervisor || 'N/A',
      totalTrabalhados: 0,
      totalFechados: 0,
      totalRecusas: 0,
      totalResgates: 0,
      totalImTrat: 0,
      totalLarvicida: 0,
      uniqueDays: new Set<string>(),
      imoveis: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 } as Record<string, number>,
      byCycle: {} as Record<string, any>
    };

    data.forEach(d => {
      agg.totalTrabalhados += d.Total_T;
      agg.totalFechados += d.Fechado;
      agg.totalRecusas += d.Recusa;
      agg.totalResgates += d.Resgate;
      agg.totalImTrat += d.Im_Trat;
      agg.totalLarvicida += d.Larvicida;
      
      // Count day globally if production > 0
      if (d.Total_T > 0) {
        agg.uniqueDays.add(d.DataISO);
      }
      
      agg.imoveis.R += d.R || 0;
      agg.imoveis.Comercio += d.Comercio || 0;
      agg.imoveis.Tb += d.Tb || 0;
      agg.imoveis.PE += d.PE || 0;
      agg.imoveis.O += d.O || 0;

      if (!agg.byCycle[d.Ciclo]) {
        agg.byCycle[d.Ciclo] = { 
            name: d.Ciclo, 
            Trabalhados: 0, 
            Fechados: 0, 
            Recusas: 0, 
            Resgates: 0,
            Larvicida: 0,
            uniqueDays: new Set<string>()
        };
      }
      agg.byCycle[d.Ciclo].Trabalhados += d.Total_T;
      agg.byCycle[d.Ciclo].Fechados += d.Fechado;
      agg.byCycle[d.Ciclo].Recusas += d.Recusa;
      agg.byCycle[d.Ciclo].Resgates += d.Resgate;
      agg.byCycle[d.Ciclo].Larvicida += d.Larvicida;
      
      // Count day per cycle if production > 0
      if (d.Total_T > 0) {
        agg.byCycle[d.Ciclo].uniqueDays.add(d.DataISO);
      }
    });

    return agg;
  }, [data]);

  // Transform cycle data for charts and table
  const chartData = Object.values(analytics.byCycle)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((cycle: any) => ({
        ...cycle,
        diasCount: cycle.uniqueDays.size,
        mediaDiaria: cycle.uniqueDays.size > 0 
            ? (cycle.Trabalhados / cycle.uniqueDays.size).toFixed(1) 
            : '0.0'
    }));
  
  const pieData = Object.entries(analytics.imoveis).map(([key, value]) => ({
    name: key, value
  })).filter(d => d.value > 0);

  const efficiency = analytics.totalTrabalhados > 0 
    ? ((analytics.totalTrabalhados / (analytics.totalTrabalhados + analytics.totalFechados + analytics.totalRecusas)) * 100).toFixed(1)
    : '0';

  const totalDays = analytics.uniqueDays.size;
  const globalAverage = totalDays > 0 
    ? (analytics.totalTrabalhados / totalDays).toFixed(1) 
    : '0';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-6xl max-h-[90vh] shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {agentName}
              <span className="text-sm font-normal text-slate-400 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                Sup: {analytics.supervisor}
              </span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">Relatório Detalhado de Performance</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <Briefcase size={14} /> Total Visitas
                </div>
                <div className="text-2xl font-bold text-blue-400">{analytics.totalTrabalhados.toLocaleString()}</div>
             </div>
             
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <Calendar size={14} /> Dias Trabalhados
                </div>
                <div className="text-2xl font-bold text-slate-200">{totalDays}</div>
             </div>

             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <TrendingUp size={14} /> Média Diária
                </div>
                <div className="text-2xl font-bold text-slate-200">{globalAverage}</div>
             </div>

             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <CheckCircle size={14} /> Eficiência
                </div>
                <div className="text-2xl font-bold text-green-400">{efficiency}%</div>
             </div>
             
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <Home size={14} /> Fechados
                </div>
                <div className="text-2xl font-bold text-yellow-400">{analytics.totalFechados.toLocaleString()}</div>
             </div>
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <XCircle size={14} /> Recusas
                </div>
                <div className="text-2xl font-bold text-red-400">{analytics.totalRecusas.toLocaleString()}</div>
             </div>
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <AlertCircle size={14} /> Resgates
                </div>
                <div className="text-2xl font-bold text-orange-400">{analytics.totalResgates.toLocaleString()}</div>
             </div>
             <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <Droplet size={14} /> Larvicida (g)
                </div>
                <div className="text-2xl font-bold text-purple-400">{analytics.totalLarvicida.toFixed(1)}</div>
             </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evolution Chart */}
            <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6 h-[400px]">
                <h3 className="font-bold text-slate-200 mb-6">Evolução por Ciclo</h3>
                <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chartData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9'}} 
                            cursor={{fill: '#1e293b'}} 
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}} />
                        <Bar dataKey="Trabalhados" fill={COLORS.blue} name="Trabalhados" stackId="a" />
                        <Bar dataKey="Fechados" fill={COLORS.yellow} name="Fechados" stackId="a" />
                        <Bar dataKey="Recusas" fill={COLORS.red} name="Recusas" stackId="a" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Property Types */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 h-[400px] flex flex-col">
                <h3 className="font-bold text-slate-200 mb-2">Tipos de Imóveis</h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={pieData} 
                                cx="50%" cy="50%" 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={5} 
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9'}} />
                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-700 font-bold text-slate-200">
                Detalhamento por Ciclo
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-400">
                    <thead className="bg-slate-900/50 text-slate-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Ciclo</th>
                            <th className="px-6 py-3 text-right">Trabalhados</th>
                            <th className="px-6 py-3 text-right">Dias</th>
                            <th className="px-6 py-3 text-right">Média/Dia</th>
                            <th className="px-6 py-3 text-right">Fechados</th>
                            <th className="px-6 py-3 text-right">Recusas</th>
                            <th className="px-6 py-3 text-right">Resgates</th>
                            <th className="px-6 py-3 text-right">Larvicida (g)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {chartData.map((row: any) => (
                            <tr key={row.name} className="hover:bg-slate-700/30">
                                <td className="px-6 py-3 font-medium text-slate-200">{row.name}</td>
                                <td className="px-6 py-3 text-right text-blue-400">{row.Trabalhados}</td>
                                <td className="px-6 py-3 text-right text-slate-300">{row.diasCount}</td>
                                <td className="px-6 py-3 text-right text-slate-300 font-bold">{row.mediaDiaria}</td>
                                <td className="px-6 py-3 text-right text-yellow-400">{row.Fechados}</td>
                                <td className="px-6 py-3 text-right text-red-400">{row.Recusas}</td>
                                <td className="px-6 py-3 text-right text-orange-400">{row.Resgates}</td>
                                <td className="px-6 py-3 text-right text-purple-400">{row.Larvicida.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

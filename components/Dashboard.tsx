
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  UploadCloud, BarChart2, Target, Briefcase, Droplet, 
  TrendingUp, Home, Users, AlertTriangle, ClipboardList, PieChart as PieIcon, MapPin, FileText 
} from 'lucide-react';
import { ProductionData, FilterState, GoalSettings } from '../types';
import { processDataFile, calculateAnalytics, COLORS } from '../utils';
import { KpiCard } from './KpiCard';
import { GoalModal } from './GoalModal';
import { generatePDFReport } from './ReportGenerator';

// --- Custom Tooltip Components ---

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Attempt to find extra data in the payload (like Supervisor for agents)
        const data = payload[0].payload;
        const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-4 rounded-xl shadow-2xl z-50 min-w-[200px]">
                <div className="border-b border-slate-700 pb-2 mb-2">
                    <p className="font-bold text-slate-100 text-base">{label}</p>
                    {data.Supervisor && (
                        <p className="text-xs text-slate-400">Sup: {data.Supervisor}</p>
                    )}
                    {data.Agentes && (
                        <p className="text-xs text-slate-400">Agentes Ativos: {data.Agentes.size || data.Agentes.length}</p>
                    )}
                </div>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm gap-4">
                            <span className="flex items-center gap-2 text-slate-300">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                {entry.name}:
                            </span>
                            <span className="font-mono font-bold text-slate-100">
                                {entry.value?.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    {payload.length > 1 && (
                        <div className="border-t border-slate-700 mt-2 pt-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-400">Total Visitas:</span>
                            <span className="font-mono font-bold text-white">{total.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        const percent = (data.payload as any).percent || 0;

        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-4 rounded-xl shadow-2xl z-50">
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }}></span>
                    <p className="font-bold text-slate-100 text-base">
                        {{ 'R': 'Residencial', 'Tb': 'Terreno Baldio', 'PE': 'Ponto Estratégico', 'O': 'Outros' }[data.name || ''] || data.name}
                    </p>
                </div>
                <div className="space-y-1 text-sm text-slate-300">
                    <div className="flex justify-between gap-6">
                        <span>Quantidade:</span>
                        <span className="font-mono font-bold text-white">{data.value?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span>Percentual:</span>
                        <span className="font-mono font-bold text-blue-400">{(percent * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const Dashboard: React.FC = () => {
    const [rawData, setRawData] = useState<ProductionData[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'property' | 'teams' | 'issues' | 'neighborhoods'>('overview');
    const [showGoalModal, setShowGoalModal] = useState(false);

    const [goals, setGoals] = useState<GoalSettings>({
        trabalhados: 1000,
        diariaMin: 20,
        diariaMax: 25,
        eficienciaMin: 80
    });

    const [filters, setFilters] = useState<FilterState>({
        supervisor: 'Todos',
        agente: 'Todos',
        ciclo: 'Todos',
        mes: 'Todos',
        ano: 'Todos'
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const data = await processDataFile(file);
            setRawData(data);
        } catch (error) {
            console.error("Error processing file", error);
            alert("Error processing file. Please ensure it is a valid Excel/CSV file.");
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        return rawData.filter(item => {
            return (filters.supervisor === 'Todos' || item.Supervisor === filters.supervisor) &&
                   (filters.agente === 'Todos' || item.Agente === filters.agente) &&
                   (filters.ciclo === 'Todos' || item.Ciclo === filters.ciclo) &&
                   (filters.mes === 'Todos' || item.Mes === filters.mes) &&
                   (filters.ano === 'Todos' || item.DataISO.startsWith(filters.ano));
        });
    }, [rawData, filters]);

    const analytics = useMemo(() => calculateAnalytics(filteredData, goals), [filteredData, goals]);

    const options = useMemo(() => {
        const getUnique = (key: string) => [...new Set(rawData.map(item => item[key]).filter(Boolean))];
        const years = [...new Set(rawData.map(d => d.DataISO.split('-')[0]))].sort().reverse();
        
        const monthOrder = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        return {
            supervisores: getUnique('Supervisor').sort(),
            agentes: getUnique('Agente').sort(),
            ciclos: getUnique('Ciclo').sort(),
            meses: getUnique('Mes').sort((a: any, b: any) => {
                const idxA = monthOrder.indexOf(a);
                const idxB = monthOrder.indexOf(b);
                const weightA = idxA === -1 ? 999 : idxA;
                const weightB = idxB === -1 ? 999 : idxB;
                return weightA - weightB;
            }),
            anos: years
        };
    }, [rawData]);

    const pendenciasList = useMemo(() => {
        return filteredData.filter(d => 
            d.Pendencias && 
            !d.Pendencias.toLowerCase().includes('não houve') && 
            !d.Pendencias.toLowerCase().includes('sem pendência') &&
            d.Pendencias !== '0'
        );
    }, [filteredData]);

    const handleExportPDF = () => {
        generatePDFReport(analytics, pendenciasList, filters, filteredData);
    };

    if (rawData.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 text-center">
                    <div className="mx-auto h-20 w-20 bg-slate-800 text-blue-500 rounded-full flex items-center justify-center mb-6 ring-1 ring-slate-700">
                        <UploadCloud size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Dashboard Produção</h2>
                    <p className="text-slate-400 mb-8">Carregue o arquivo de dados (CSV/Excel) para gerar a análise completa.</p>
                    <label className="block w-full cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/50 hover:shadow-blue-900/30 transform hover:-translate-y-0.5">
                        <span className="flex items-center justify-center gap-2">
                            <UploadCloud size={20} />
                            Selecionar Arquivo
                        </span>
                        <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                    </label>
                    {loading && <div className="mt-6 flex justify-center"><div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
                </div>
            </div>
        );
    }

    const CHART_GRID_COLOR = "#334155";
    const CHART_TEXT_COLOR = "#94a3b8";

    const getCoverageColor = (percent: number) => {
        if (percent >= 80) return 'bg-green-500';
        if (percent >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            {/* Header */}
            <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 px-6 py-4 shadow-lg backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-900/50">
                            <BarChart2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">ProdAnalytics</h1>
                            <div className="flex gap-4 text-xs text-slate-400 font-medium mt-0.5">
                                <span className="flex items-center gap-1.5"><Target size={14} className="text-blue-400"/> Meta: {goals.trabalhados}</span>
                                <span className="flex items-center gap-1.5"><TrendingUp size={14} className="text-green-400"/> Diária: {goals.diariaMin}-{goals.diariaMax}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center justify-end">
                        <button 
                            onClick={handleExportPDF}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-lg border border-slate-700 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <FileText size={16} /> Relatório PDF
                        </button>

                        {['Ano', 'Supervisor', 'Agente', 'Ciclo', 'Mes'].map(filterKey => (
                            <div key={filterKey} className="relative">
                                <select 
                                    className="appearance-none bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-2.5 shadow-sm outline-none transition-all cursor-pointer hover:bg-slate-700"
                                    value={(filters as any)[filterKey.toLowerCase()]}
                                    onChange={(e) => setFilters({...filters, [filterKey.toLowerCase()]: e.target.value})}
                                >
                                    <option value="Todos">{filterKey}: Todos</option>
                                    {(options as any)[filterKey.toLowerCase() === 'supervisor' ? 'supervisores' : filterKey.toLowerCase() === 'mes' ? 'meses' : filterKey.toLowerCase() === 'ano' ? 'anos' : filterKey.toLowerCase() + 's']?.map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                        <button 
                            onClick={() => setShowGoalModal(true)} 
                            className="p-2.5 text-slate-400 hover:bg-slate-800 hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-slate-700" 
                        >
                            <Target size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-slate-900 border-b border-slate-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {[
                            { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
                            { id: 'quality', label: 'Qualidade', icon: Droplet },
                            { id: 'property', label: 'Imóveis', icon: Home },
                            { id: 'neighborhoods', label: 'Bairros', icon: MapPin },
                            { id: 'teams', label: 'Equipes', icon: Users },
                            { id: 'issues', label: 'Pendências', icon: AlertTriangle, count: pendenciasList.length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                    ${activeTab === tab.id 
                                        ? 'border-blue-500 text-blue-400' 
                                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'}
                                `}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className="ml-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-800">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Tab Content: Overview */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <KpiCard title="Trabalhados" value={analytics.totalTrabalhados.toLocaleString()} sub={`Meta: ${(analytics.rankingAgentes.length * goals.trabalhados).toLocaleString()}`} icon={Briefcase} color="blue" />
                            <KpiCard title="Média Diária" value={analytics.mediaDiaria} sub={`Alvo: ${goals.diariaMin}-${goals.diariaMax}`} icon={TrendingUp} color={parseFloat(analytics.mediaDiaria) >= goals.diariaMin ? 'green' : 'red'} />
                            <KpiCard title="Eficiência" value={`${analytics.percTrabalhados.toFixed(1)}%`} sub={`Perda: ${analytics.percPerda.toFixed(1)}%`} icon={PieIcon} color={analytics.percTrabalhados >= goals.eficienciaMin ? 'green' : 'orange'} />
                            <KpiCard title="Imóveis Fechados" value={analytics.totalFechados.toLocaleString()} sub={`Recusas: ${analytics.totalRecusas.toLocaleString()}`} icon={Home} color="slate" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col overflow-hidden h-full">
                                <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center backdrop-blur-sm">
                                    <h3 className="font-bold text-slate-100">Ranking Produtividade</h3>
                                    <span className="text-xs font-medium px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600">Top Agentes</span>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                    {analytics.rankingAgentes.map((agent, idx) => (
                                        <div key={idx} className="group flex flex-col p-3 hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${idx < 3 ? 'bg-yellow-900/30 text-yellow-500 ring-1 ring-yellow-700' : 'bg-slate-800 text-slate-500 ring-1 ring-slate-700'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-200 truncate max-w-[120px]" title={agent.name}>{agent.name}</span>
                                                </div>
                                                <span className={`text-sm font-bold font-mono ${agent.StatusMeta ? 'text-green-400' : 'text-slate-500'}`}>{agent.Trabalhados}</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-700/50">
                                                <div className={`h-full rounded-full transition-all duration-500 ${agent.StatusMeta ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, (agent.Trabalhados / goals.trabalhados) * 100)}%`}}></div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium px-1">
                                                <span>Média: {agent.MediaDiaria}/dia</span>
                                                <span>Resg: {agent.Resgates}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-6 lg:col-span-2 flex flex-col h-full">
                                <h3 className="font-bold text-slate-100 text-lg mb-6">Análise de Perda</h3>
                                <div className="flex-1 w-full min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.rankingAgentes.slice(0, 20)} margin={{top: 10, right: 10, left: 0, bottom: 60}} barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                            <XAxis dataKey="name" tick={{fontSize: 11, fill: CHART_TEXT_COLOR}} interval={0} angle={-45} textAnchor="end" height={60} />
                                            <YAxis tick={{fontSize: 11, fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                            <Tooltip content={<CustomBarTooltip />} cursor={{fill: '#1e293b'}} />
                                            <Bar dataKey="Trabalhados" stackId="a" fill={COLORS.blue} radius={[0, 0, 4, 4]} />
                                            <Bar dataKey="Fechados" stackId="a" fill={COLORS.yellow} />
                                            <Bar dataKey="Recusas" stackId="a" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Content: Quality */}
                {activeTab === 'quality' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <KpiCard title="Imóveis Tratados" value={analytics.totalImTrat.toLocaleString()} sub="Ação Corretiva" icon={Droplet} color="teal" />
                            <KpiCard title="Depósitos Eliminados" value={analytics.totalDepElim.toLocaleString()} sub="Controle Mecânico" icon={Target} color="red" />
                            <KpiCard title="Uso Larvicida (g)" value={analytics.totalLarvicida.toFixed(1)} sub="Controle Químico" icon={ClipboardList} color="purple" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-6 h-96">
                                <h3 className="font-bold text-slate-100 text-lg mb-6">Tipos de Depósitos (A1 - E)</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.chartDepositos}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                        <XAxis dataKey="name" tick={{fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                        <YAxis tick={{fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: '#1e293b'}} content={<CustomBarTooltip />} />
                                        <Bar dataKey="value" fill={COLORS.orange} radius={[4,4,0,0]} name="Qtd" barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-6 h-96">
                                <h3 className="font-bold text-slate-100 text-lg mb-6">Top Agentes - Tratamento Focal</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[...analytics.rankingAgentes].sort((a,b)=>b.Im_Trat - a.Im_Trat).slice(0, 10)} layout="vertical" margin={{left: 20}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_COLOR} />
                                        <XAxis type="number" tick={{fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize:11, fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: '#1e293b'}} content={<CustomBarTooltip />} />
                                        <Bar dataKey="Im_Trat" fill={COLORS.teal} radius={[0,4,4,0]} name="Imóveis Tratados" barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Content: Neighborhoods (NEW) */}
                {activeTab === 'neighborhoods' && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 items-center justify-end text-sm text-slate-400">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span> Cobertura ≥ 80%
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span> 60% a 79.9%
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span> &lt; 60%
                            </span>
                        </div>

                        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                                <h3 className="font-bold text-teal-400 flex items-center gap-2">
                                    <MapPin size={20} />
                                    Cobertura por Bairro
                                </h3>
                                <span className="text-xs text-slate-500">
                                    Baseado na meta de imóveis por ciclo
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-800/50 border-b border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold w-1/4">Bairro</th>
                                            <th className="px-6 py-4 font-semibold text-center">Visitados / Meta</th>
                                            <th className="px-6 py-4 font-semibold w-1/4">Progresso Cobertura</th>
                                            <th className="px-6 py-4 font-semibold text-center">Res</th>
                                            <th className="px-6 py-4 font-semibold text-center">TB</th>
                                            <th className="px-6 py-4 font-semibold text-center">Com</th>
                                            <th className="px-6 py-4 font-semibold text-center">Outros</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {analytics.neighborhoods.map((b, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-200">{b.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-slate-200 font-bold">{b.visited}</span> 
                                                    <span className="text-slate-600 mx-1">/</span> 
                                                    <span className="text-slate-500">{b.target > 0 ? b.target : '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-700 ${getCoverageColor(b.coverage)}`} 
                                                                style={{width: `${Math.min(100, b.coverage)}%`}}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold min-w-[3rem] text-right">{b.coverage.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-400">{b.propertyTypes.R}</td>
                                                <td className="px-6 py-4 text-center text-slate-400">{b.propertyTypes.Tb}</td>
                                                <td className="px-6 py-4 text-center text-slate-400">{b.propertyTypes.Comercio}</td>
                                                <td className="px-6 py-4 text-center text-slate-400">{b.propertyTypes.O}</td>
                                            </tr>
                                        ))}
                                        {analytics.neighborhoods.length === 0 && (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Nenhum dado de bairro encontrado. Verifique a coluna "Bairro" no arquivo.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Content: Property */}
                {activeTab === 'property' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        <div className="lg:col-span-2 bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-8 h-[500px] flex flex-col">
                            <h3 className="font-bold text-slate-100 text-lg mb-2">Distribuição por Tipo de Imóvel</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={analytics.chartImoveis} cx="50%" cy="50%" innerRadius={80} outerRadius={140} paddingAngle={4} dataKey="value" stroke="none">
                                            {analytics.chartImoveis.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-6">
                            <h3 className="font-bold text-slate-100 text-lg mb-6">Detalhes</h3>
                            <div className="space-y-4">
                                {analytics.chartImoveis.map((item, idx) => (
                                    <div key={item.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: Object.values(COLORS)[idx % Object.values(COLORS).length]}}></div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-200">{{ 'R': 'Residencial', 'Tb': 'Terreno Baldio', 'PE': 'Ponto Estratégico', 'O': 'Outros' }[item.name] || item.name}</span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded text-sm border border-slate-700">{item.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Content: Teams */}
                {activeTab === 'teams' && (
                    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-8 animate-in fade-in duration-500">
                        <h3 className="font-bold text-slate-100 text-lg mb-8">Comparativo de Produtividade: Supervisores</h3>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.rankingSupervisores} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                    <XAxis dataKey="name" tick={{fill: CHART_TEXT_COLOR, fontSize: 12}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: CHART_TEXT_COLOR}} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#1e293b'}} content={<CustomBarTooltip />} />
                                    <Bar dataKey="MediaPorAgente" radius={[6,6,0,0]} barSize={60}>
                                        {analytics.rankingSupervisores.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === filters.supervisor ? COLORS.orange : COLORS.purple} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Tab Content: Issues */}
                {activeTab === 'issues' && (
                    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 overflow-hidden animate-in fade-in duration-500">
                        <div className="px-6 py-5 border-b border-red-900/30 bg-red-900/10 flex justify-between items-center">
                            <h3 className="font-bold text-red-400 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                Ocorrências e Pendências
                            </h3>
                            <span className="bg-slate-900 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-900/50">{pendenciasList.length} Registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-400">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-800/50 border-b border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Data</th>
                                        <th className="px-6 py-4 font-semibold">Agente</th>
                                        <th className="px-6 py-4 font-semibold">Supervisor</th>
                                        <th className="px-6 py-4 font-semibold">Tipo</th>
                                        <th className="px-6 py-4 font-semibold">Observação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {pendenciasList.map((row, index) => (
                                        <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-300">{row.DataISO.split('-').reverse().join('/')}</td>
                                            <td className="px-6 py-4 font-medium text-slate-200">{row.Agente}</td>
                                            <td className="px-6 py-4">{row.Supervisor}</td>
                                            <td className="px-6 py-4"><span className="bg-red-900/30 text-red-400 border border-red-900/50 px-2.5 py-1 rounded-md text-xs font-bold inline-block">{row.Pendencias}</span></td>
                                            <td className="px-6 py-4 italic text-slate-500 whitespace-normal break-words min-w-[300px]" title={row.Observacao}>"{row.Observacao}"</td>
                                        </tr>
                                    ))}
                                    {pendenciasList.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Nenhuma pendência encontrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            <GoalModal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} goals={goals} setGoals={setGoals} />
        </div>
    );
};
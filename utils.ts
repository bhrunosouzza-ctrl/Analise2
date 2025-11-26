import { ProductionData, DashboardAnalytics, GoalSettings } from './types';
import * as XLSX from 'xlsx';

export const COLORS = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  teal: '#14b8a6',
  yellow: '#eab308',
  slate: '#64748b'
};

export const parseExcelDate = (serial: number | string): { mes: string; dataFormatada: string } => {
  let mes = 'Indefinido';
  let dataFormatada = '';

  if (typeof serial === 'number') {
    // Excel date serial conversion
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    mes = date.toLocaleString('pt-BR', { month: 'long' });
    dataFormatada = date.toISOString().split('T')[0];
  } else {
    try {
      const date = new Date(serial);
      if (!isNaN(date.getTime())) {
        mes = date.toLocaleString('pt-BR', { month: 'long' });
        dataFormatada = date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn("Date parse error", e);
    }
  }

  return { 
    mes: mes.charAt(0).toUpperCase() + mes.slice(1), 
    dataFormatada 
  };
};

export const processDataFile = (file: File): Promise<ProductionData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return reject("No data read");
        
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        const processed = data.map((row: any) => {
            const { mes, dataFormatada } = parseExcelDate(row.Data);
            const n = (val: any) => Number(val) || 0;

            return {
                ...row,
                Supervisor: row.Supervisor || 'N/A',
                Agente: row.Agente || 'N/A',
                Ciclo: row.Ciclo || 'N/A',
                Mes: mes,
                DataISO: dataFormatada,
                Total_T: n(row.Total_T),
                Fechado: n(row.Fechado),
                Recusa: n(row.Recusa),
                Resgate: n(row.Resgate),
                Im_Trat: n(row.Im_Trat),
                Dep_Elim: n(row.Dep_Elim),
                Larvicida: n(row.Larvicida),
                A1: n(row.A1), A2: n(row.A2), B: n(row.B), C: n(row.C), D1: n(row.D1), D2: n(row.D2), E: n(row.E),
                R: n(row.R), Comercio: n(row.Comercio), Tb: n(row.Tb), PE: n(row.PE), O: n(row.O),
                Pendencias: row.Pendencias || 'Sem Pendência',
                Observacao: row.Observacao || ''
            } as ProductionData;
        });
        resolve(processed);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const calculateAnalytics = (data: ProductionData[], goals: GoalSettings): DashboardAnalytics => {
  const metrics: DashboardAnalytics = {
    totalTrabalhados: 0, totalFechados: 0, totalRecusas: 0, totalResgates: 0,
    totalImTrat: 0, totalDepElim: 0, totalLarvicida: 0,
    depositos: { A1: 0, A2: 0, B: 0, C: 0, D1: 0, D2: 0, E: 0 },
    imoveis: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 },
    mediaDiaria: "0",
    percTrabalhados: 0,
    percPerda: 0,
    rankingAgentes: [],
    rankingSupervisores: [],
    chartDepositos: [],
    chartImoveis: []
  };

  const agents: Record<string, any> = {};
  const supervisors: Record<string, any> = {};
  const uniqueDays = new Set<string>();

  data.forEach(d => {
    uniqueDays.add(d.DataISO + d.Agente);

    metrics.totalTrabalhados += d.Total_T;
    metrics.totalFechados += d.Fechado;
    metrics.totalRecusas += d.Recusa;
    metrics.totalResgates += d.Resgate;
    metrics.totalImTrat += d.Im_Trat;
    metrics.totalDepElim += d.Dep_Elim;
    metrics.totalLarvicida += d.Larvicida;

    ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E'].forEach(k => metrics.depositos[k] = (metrics.depositos[k] || 0) + (d[k] || 0));
    ['R', 'Comercio', 'Tb', 'PE', 'O'].forEach(k => metrics.imoveis[k] = (metrics.imoveis[k] || 0) + (d[k] || 0));

    // Agent Aggregation
    if (!agents[d.Agente]) {
        agents[d.Agente] = {
            name: d.Agente, Supervisor: d.Supervisor,
            Trabalhados: 0, Fechados: 0, Recusas: 0, Im_Trat: 0, Dias: new Set()
        };
    }
    agents[d.Agente].Trabalhados += d.Total_T;
    agents[d.Agente].Fechados += d.Fechado;
    agents[d.Agente].Recusas += d.Recusa;
    agents[d.Agente].Im_Trat += d.Im_Trat;
    agents[d.Agente].Dias.add(d.DataISO);

    // Supervisor Aggregation
    if (!supervisors[d.Supervisor]) {
        supervisors[d.Supervisor] = { name: d.Supervisor, Trabalhados: 0, Agentes: new Set() };
    }
    supervisors[d.Supervisor].Trabalhados += d.Total_T;
    supervisors[d.Supervisor].Agentes.add(d.Agente);
  });

  const diasCount = uniqueDays.size || 1;
  metrics.mediaDiaria = (metrics.totalTrabalhados / diasCount).toFixed(1);

  const totalVisitas = metrics.totalTrabalhados + metrics.totalFechados + metrics.totalRecusas;
  metrics.percTrabalhados = totalVisitas > 0 ? (metrics.totalTrabalhados / totalVisitas * 100) : 0;
  metrics.percPerda = totalVisitas > 0 ? ((metrics.totalFechados + metrics.totalRecusas) / totalVisitas * 100) : 0;

  metrics.rankingAgentes = Object.values(agents).map((a: any) => ({
      ...a,
      MediaDiaria: (a.Trabalhados / (a.Dias.size || 1)).toFixed(1),
      StatusMeta: a.Trabalhados >= goals.trabalhados
  })).sort((a: any, b: any) => b.Trabalhados - a.Trabalhados);

  metrics.rankingSupervisores = Object.values(supervisors).map((s: any) => ({
      ...s,
      MediaPorAgente: (s.Trabalhados / (s.Agentes.size || 1)).toFixed(0)
  })).sort((a: any, b: any) => b.MediaPorAgente - a.MediaPorAgente);

  metrics.chartDepositos = Object.entries(metrics.depositos).map(([key, val]) => ({ name: key, value: val }));
  metrics.chartImoveis = Object.entries(metrics.imoveis).map(([key, val]) => ({ name: key, value: val }));

  return metrics;
};
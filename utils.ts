import { ProductionData, DashboardAnalytics, GoalSettings, NeighborhoodMetric } from './types';
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

// Dados baseados na imagem fornecida
export const NEIGHBORHOOD_TARGETS: Record<string, number> = {
    'Alegre': 1631,
    'Alphaville': 728,
    'Alvorada I': 606,
    'Alvorada II': 910,
    'Ana Malaquias': 595,
    'Ana Moura': 1657,
    'Ana Rita': 2080,
    'Arataquinha': 95,
    'Bairro dos Vieiras': 503,
    'Bandeirantes': 226,
    'Bela Vista': 759,
    'Bromélias': 1344,
    'Cachoeira Do Vale': 2267,
    'Centro Norte': 1793,
    'Centro Sul': 1158,
    'Coqueiro': 78,
    'Cruzeirinho': 557,
    'Distrito Industrial': 145,
    'Eldorado': 1174,
    'Esplanada': 164,
    'Fazenda Boa Vista': 203,
    'Ferroviarios': 84,
    'Funcionários': 853, // Fixed accent
    'Garapa': 170,
    'Jardim Primavera': 291,
    'Jardim Vitoria': 236,
    'Jhon Kennedy': 389,
    'João XXIII': 942,
    'Limoeiro': 966,
    'Macuco': 1466,
    'Nossa Senhora das Graças': 447,
    'Nova Esperança': 282,
    'Novo Horizonte': 862,
    'Novo Tempo': 1733,
    'Olaria': 852,
    'Parque Recanto': 96,
    'Petrópolis': 622, // Fixed accent
    'Primavera': 2167,
    'Quitandinha': 901,
    'Recanto do Sossego': 202,
    'Recanto Verde': 2770,
    'Santa Cecília': 662,
    'Santa Maria': 836,
    'Santa Rita': 94,
    'Santa Terezinha': 701,
    'São Cristóvão': 385,
    'São José': 850,
    'Serenata': 429,
    'Timirim': 1114,
    'Timotinho': 498,
    'Vale Verde': 280,
    'Vila dos Técnicos': 242
};

export const parseExcelDate = (serial: number | string): { mes: string; dataFormatada: string } => {
  let mes = 'Indefinido';
  let dataFormatada = '';

  if (typeof serial === 'number') {
    // Excel date serial conversion with buffer
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000) + 12 * 3600 * 1000);
    mes = date.toLocaleString('pt-BR', { month: 'long' });
    dataFormatada = date.toISOString().split('T')[0];
  } else if (typeof serial === 'string') {
    const ptDateRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/;
    const match = serial.match(ptDateRegex);

    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        mes = date.toLocaleString('pt-BR', { month: 'long' });
        dataFormatada = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
        try {
            let dateStr = serial;
            if (/^\d{4}-\d{2}-\d{2}$/.test(serial)) {
                dateStr += 'T12:00:00';
            }
            
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                mes = date.toLocaleString('pt-BR', { month: 'long' });
                dataFormatada = date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn("Date parse error", e);
        }
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
                Bairro: row.Bairro || 'N/A',
                Atividade: row.Atividade || 'N/A', // Read Atividade
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
    neighborhoods: [],
    chartDepositos: [],
    chartImoveis: []
  };

  const agents: Record<string, any> = {};
  const supervisors: Record<string, any> = {};
  const neighborhoodsData: Record<string, NeighborhoodMetric> = {};
  const uniqueDays = new Set<string>();

  // Initialize neighborhoods from constants
  Object.keys(NEIGHBORHOOD_TARGETS).forEach(name => {
      neighborhoodsData[name] = {
          name,
          target: NEIGHBORHOOD_TARGETS[name],
          visited: 0,
          coverage: 0,
          propertyTypes: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 }
      };
  });

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
            Trabalhados: 0, Fechados: 0, Recusas: 0, Resgates: 0, Im_Trat: 0, Dias: new Set()
        };
    }
    agents[d.Agente].Trabalhados += d.Total_T;
    agents[d.Agente].Fechados += d.Fechado;
    agents[d.Agente].Recusas += d.Recusa;
    agents[d.Agente].Resgates += d.Resgate; // Accumulate Resgates
    agents[d.Agente].Im_Trat += d.Im_Trat;
    agents[d.Agente].Dias.add(d.DataISO);

    // Supervisor Aggregation
    if (!supervisors[d.Supervisor]) {
        supervisors[d.Supervisor] = { name: d.Supervisor, Trabalhados: 0, Agentes: new Set() };
    }
    supervisors[d.Supervisor].Trabalhados += d.Total_T;
    supervisors[d.Supervisor].Agentes.add(d.Agente);

    // Neighborhood Aggregation
    // Exclude 'Levantamento de Índice' only for neighborhood stats
    if ((d.Atividade || '').toLowerCase() !== 'levantamento de índice') {
        let bName = d.Bairro;
        const targetKey = Object.keys(NEIGHBORHOOD_TARGETS).find(k => k.toLowerCase() === bName.toLowerCase());
        
        if (targetKey) {
            neighborhoodsData[targetKey].visited += d.Total_T;
            neighborhoodsData[targetKey].propertyTypes.R += d.R || 0;
            neighborhoodsData[targetKey].propertyTypes.Comercio += d.Comercio || 0;
            neighborhoodsData[targetKey].propertyTypes.Tb += d.Tb || 0;
            neighborhoodsData[targetKey].propertyTypes.PE += d.PE || 0;
            neighborhoodsData[targetKey].propertyTypes.O += d.O || 0;
        } else if (bName !== 'N/A') {
            if (!neighborhoodsData[bName]) {
                 neighborhoodsData[bName] = {
                    name: bName,
                    target: 0,
                    visited: 0,
                    coverage: 0,
                    propertyTypes: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 }
                };
            }
            neighborhoodsData[bName].visited += d.Total_T;
            neighborhoodsData[bName].propertyTypes.R += d.R || 0;
            neighborhoodsData[bName].propertyTypes.Comercio += d.Comercio || 0;
            neighborhoodsData[bName].propertyTypes.Tb += d.Tb || 0;
            neighborhoodsData[bName].propertyTypes.PE += d.PE || 0;
            neighborhoodsData[bName].propertyTypes.O += d.O || 0;
        }
    }
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

  // Process Neighborhoods
  metrics.neighborhoods = Object.values(neighborhoodsData)
    .map(n => ({
        ...n,
        coverage: n.target > 0 ? (n.visited / n.target) * 100 : 0
    }))
    .sort((a, b) => b.visited - a.visited);

  metrics.chartDepositos = Object.entries(metrics.depositos).map(([key, val]) => ({ name: key, value: val }));
  metrics.chartImoveis = Object.entries(metrics.imoveis).map(([key, val]) => ({ name: key, value: val }));

  return metrics;
};
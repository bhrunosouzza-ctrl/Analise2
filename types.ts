export interface GoalSettings {
    trabalhados: number;
    diariaMin: number;
    diariaMax: number;
    eficienciaMin: number;
  }
  
  export interface ProductionData {
    Supervisor: string;
    Agente: string;
    Ciclo: string;
    Mes: string;
    DataISO: string;
    Data: string | number; // Raw data
    Total_T: number;
    Fechado: number;
    Recusa: number;
    Resgate: number;
    Im_Trat: number;
    Dep_Elim: number;
    Larvicida: number;
    // Deposit Types
    A1: number; A2: number; B: number; C: number; D1: number; D2: number; E: number;
    // Property Types
    R: number; Comercio: number; Tb: number; PE: number; O: number;
    Pendencias: string;
    Observacao: string;
    [key: string]: any;
  }
  
  export interface FilterState {
    supervisor: string;
    agente: string;
    ciclo: string;
    mes: string;
  }
  
  export interface AgentMetric {
    name: string;
    Supervisor: string;
    Trabalhados: number;
    Fechados: number;
    Recusas: number;
    Im_Trat: number;
    Dias: Set<string>;
    MediaDiaria?: string;
    StatusMeta?: boolean;
  }
  
  export interface SupervisorMetric {
    name: string;
    Trabalhados: number;
    Agentes: Set<string>;
    MediaPorAgente?: string;
  }
  
  export interface DashboardAnalytics {
    totalTrabalhados: number;
    totalFechados: number;
    totalRecusas: number;
    totalResgates: number;
    totalImTrat: number;
    totalDepElim: number;
    totalLarvicida: number;
    depositos: Record<string, number>;
    imoveis: Record<string, number>;
    mediaDiaria: string;
    percTrabalhados: number;
    percPerda: number;
    rankingAgentes: AgentMetric[];
    rankingSupervisores: SupervisorMetric[];
    chartDepositos: { name: string; value: number }[];
    chartImoveis: { name: string; value: number }[];
  }
  
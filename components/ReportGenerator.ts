
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardAnalytics, ProductionData, FilterState } from '../types';
import { NEIGHBORHOOD_TARGETS } from '../utils';

export const generatePDFReport = (
    analytics: DashboardAnalytics, 
    pendenciasList: ProductionData[], 
    filters: FilterState,
    filteredData: ProductionData[]
) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    // --- Header ---
    doc.setFillColor(15, 23, 42); // slate-950
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Relatório de Produção', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Gerado em: ${today}`, 14, 28);
    
    // Filters Info
    doc.setFontSize(9);
    doc.text(`Filtros: Ano: ${filters.ano} | Ciclo: ${filters.ciclo} | Mês: ${filters.mes} | Sup: ${filters.supervisor}`, 14, 34);

    let currentY = 50;

    // --- Executive Summary ---
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo Executivo', 14, currentY);
    currentY += 8;

    const summaryData = [
        ['Trabalhados', analytics.totalTrabalhados.toLocaleString()],
        ['Média Diária', analytics.mediaDiaria],
        ['Imóveis Fechados', analytics.totalFechados.toLocaleString()],
        ['Recusas', analytics.totalRecusas.toLocaleString()],
        ['Resgates', analytics.totalResgates.toLocaleString()], // Added Resgates to summary
        ['Eficiência', `${analytics.percTrabalhados.toFixed(1)}%`],
        ['Perda', `${analytics.percPerda.toFixed(1)}%`],
        ['Imóveis Tratados', analytics.totalImTrat.toLocaleString()],
        ['Depósitos Eliminados', analytics.totalDepElim.toLocaleString()]
    ];

    autoTable(doc, {
        startY: currentY,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // blue-500
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Agent Ranking (Global) ---
    doc.setFontSize(14);
    doc.text('Ranking de Produtividade Global (Agentes)', 14, currentY);
    currentY += 6;

    const agentData = analytics.rankingAgentes.map((a, i) => [
        i + 1,
        a.name,
        a.Supervisor,
        a.Trabalhados,
        a.MediaDiaria,
        a.Fechados,
        a.Recusas,
        a.Resgates // Added Resgates
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Agente', 'Supervisor', 'Trabalhados', 'Média/Dia', 'Fechados', 'Recusas', 'Resg']],
        body: agentData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }, // slate-800
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 10 }, 1: { fontStyle: 'bold' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Detailed Agent Production by Cycle (NEW SECTION) ---
    
    // Determine cycles to process
    let cyclesToProcess: string[] = [];
    if (filters.ciclo === 'Todos') {
        cyclesToProcess = [...new Set(filteredData.map(d => d.Ciclo))].sort();
    } else {
        cyclesToProcess = [filters.ciclo];
    }

    if (cyclesToProcess.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.text('Produção Detalhada por Ciclo (Agentes)', 14, currentY);
        currentY += 6;

        cyclesToProcess.forEach(ciclo => {
             // Filter data for this cycle
            const cycleData = filteredData.filter(d => d.Ciclo === ciclo);
            if (cycleData.length === 0) return;

            // Aggregate by agent for this cycle
            const agentMetrics: Record<string, any> = {};
            cycleData.forEach(d => {
                if (!agentMetrics[d.Agente]) {
                    agentMetrics[d.Agente] = {
                        name: d.Agente,
                        Supervisor: d.Supervisor,
                        Trabalhados: 0,
                        Fechados: 0,
                        Recusas: 0,
                        Resgates: 0
                    };
                }
                agentMetrics[d.Agente].Trabalhados += d.Total_T;
                agentMetrics[d.Agente].Fechados += d.Fechado;
                agentMetrics[d.Agente].Recusas += d.Recusa;
                agentMetrics[d.Agente].Resgates += d.Resgate;
            });

            const tableData = Object.values(agentMetrics)
                .sort((a: any, b: any) => b.Trabalhados - a.Trabalhados)
                .map((a: any, i) => [
                    i + 1,
                    a.name,
                    a.Supervisor,
                    a.Trabalhados,
                    a.Fechados,
                    a.Recusas,
                    a.Resgates
                ]);

            if (currentY > 240) { doc.addPage(); currentY = 20; }
            doc.setFontSize(11);
            doc.setTextColor(51, 65, 85);
            doc.text(`Ciclo: ${ciclo}`, 14, currentY);
            currentY += 4;

            autoTable(doc, {
                startY: currentY,
                head: [['#', 'Agente', 'Supervisor', 'Trabalhados', 'Fechados', 'Recusas', 'Resg']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105] }, // slate-600
                styles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 10 }, 1: { fontStyle: 'bold' } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 12;
        });
    }

    // --- Supervisor Ranking ---
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Reset color
    doc.text('Produtividade por Equipe', 14, currentY);
    currentY += 6;

    const supData = analytics.rankingSupervisores.map(s => [
        s.name,
        s.Trabalhados,
        s.Agentes.size,
        s.MediaPorAgente
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Supervisor', 'Total Trabalhados', 'Qtd Agentes', 'Média por Agente']],
        body: supData,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] }, // purple-600
        styles: { fontSize: 9 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Neighborhoods (By Cycle) ---
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setFontSize(14);
    doc.text('Produção por Bairro', 14, currentY);
    currentY += 6;

    cyclesToProcess.forEach(ciclo => {
        const cycleData = filteredData.filter(d => 
            d.Ciclo === ciclo && 
            (d.Atividade || '').toLowerCase() !== 'levantamento de índice'
        );
        
        if (cycleData.length === 0) return;

        const neighborhoodMetrics: Record<string, any> = {};
        
        cycleData.forEach(d => {
            let bName = d.Bairro;
            const targetKey = Object.keys(NEIGHBORHOOD_TARGETS).find(k => k.toLowerCase() === bName.toLowerCase());
            const nameToUse = targetKey || bName;
             
            if (!neighborhoodMetrics[nameToUse]) {
                 neighborhoodMetrics[nameToUse] = {
                     name: nameToUse,
                     target: NEIGHBORHOOD_TARGETS[nameToUse] || 0,
                     visited: 0,
                     propertyTypes: { R: 0, Comercio: 0, Tb: 0, PE: 0, O: 0 }
                 };
            }
             
            neighborhoodMetrics[nameToUse].visited += d.Total_T;
            neighborhoodMetrics[nameToUse].propertyTypes.R += (d.R || 0);
            neighborhoodMetrics[nameToUse].propertyTypes.Comercio += (d.Comercio || 0);
            neighborhoodMetrics[nameToUse].propertyTypes.Tb += (d.Tb || 0);
            neighborhoodMetrics[nameToUse].propertyTypes.PE += (d.PE || 0);
            neighborhoodMetrics[nameToUse].propertyTypes.O += (d.O || 0);
        });

        const tableDataRaw = Object.values(neighborhoodMetrics)
            .filter((n: any) => n.visited > 0)
            .map((n: any) => {
                 const coverage = n.target > 0 ? (n.visited / n.target) * 100 : 0;
                 return {
                     ...n,
                     coverage
                 };
            })
            .sort((a: any, b: any) => b.visited - a.visited);

        if (tableDataRaw.length > 0) {
             if (currentY > 240) { doc.addPage(); currentY = 20; }
             
             doc.setFontSize(11);
             doc.setTextColor(51, 65, 85);
             doc.text(`Ciclo: ${ciclo} (${tableDataRaw.length} bairros trabalhados)`, 14, currentY);
             currentY += 4;

             const bodyData = tableDataRaw.map((n: any) => [
                n.name,
                n.target > 0 ? n.target : '-',
                n.visited,
                n.coverage > 0 ? `${n.coverage.toFixed(1)}%` : '-',
                n.propertyTypes.R,
                n.propertyTypes.Tb,
                n.propertyTypes.Comercio,
                n.propertyTypes.PE,
                n.propertyTypes.O
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Bairro', 'Meta', 'Visitados', 'Cobertura', 'Res', 'TB', 'Com', 'PE', 'Outros']],
                body: bodyData,
                theme: 'grid',
                headStyles: { fillColor: [20, 184, 166] }, // teal-500
                styles: { fontSize: 8 },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 3) {
                        const text = data.cell.raw as string; 
                        const val = parseFloat(text.replace('%', ''));
                        if (!isNaN(val)) {
                            if (val >= 80) {
                                data.cell.styles.fillColor = [34, 197, 94]; // green-500
                                data.cell.styles.textColor = [255, 255, 255];
                                data.cell.styles.fontStyle = 'bold';
                            } else if (val >= 60) {
                                data.cell.styles.fillColor = [234, 179, 8]; // yellow-500
                                data.cell.styles.textColor = [0, 0, 0];
                                data.cell.styles.fontStyle = 'bold';
                            } else {
                                data.cell.styles.fillColor = [239, 68, 68]; // red-500
                                data.cell.styles.textColor = [255, 255, 255];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                }
            });
            
            currentY = (doc as any).lastAutoTable.finalY + 12;
        }
    });

    // --- Issues / Pendências ---
    if (pendenciasList.length > 0) {
        doc.addPage();
        currentY = 20;

        doc.setFontSize(14);
        doc.setTextColor(185, 28, 28); // red-700
        doc.text(`Relatório de Ocorrências e Pendências (${pendenciasList.length})`, 14, currentY);
        currentY += 6;

        // Sort by Agente (Alphabetical) then Data (Chronological)
        const sortedIssues = [...pendenciasList].sort((a, b) => {
            const agentDiff = a.Agente.localeCompare(b.Agente);
            if (agentDiff !== 0) return agentDiff;
            return a.DataISO.localeCompare(b.DataISO);
        });

        // Insert empty rows for separation
        const issuesBody: any[] = [];
        let lastAgent = '';

        sortedIssues.forEach((p, index) => {
            if (index > 0 && p.Agente !== lastAgent) {
                // Insert blank row
                issuesBody.push(['', '', '', '', '']); 
            }
            issuesBody.push([
                p.DataISO.split('-').reverse().join('/'),
                p.Agente,
                p.Supervisor,
                p.Pendencias,
                p.Observacao
            ]);
            lastAgent = p.Agente;
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Data', 'Agente', 'Supervisor', 'Tipo', 'Observação']],
            body: issuesBody,
            theme: 'striped',
            headStyles: { fillColor: [185, 28, 28] }, // red-700
            styles: { fontSize: 8 },
            columnStyles: { 4: { cellWidth: 80 } }
        });
    }

    // Save
    doc.save(`Relatorio_Producao_${new Date().toISOString().split('T')[0]}.pdf`);
};
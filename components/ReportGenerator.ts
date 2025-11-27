
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardAnalytics, ProductionData, FilterState } from '../types';

export const generatePDFReport = (
    analytics: DashboardAnalytics, 
    pendenciasList: ProductionData[], 
    filters: FilterState
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
    doc.text(`Filtros: Ciclo: ${filters.ciclo} | Mês: ${filters.mes} | Sup: ${filters.supervisor}`, 14, 34);

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
        columnStyles: { 0: { fontStyle: 'bold', width: 100 } },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Agent Ranking ---
    doc.setFontSize(14);
    doc.text('Ranking de Produtividade (Agentes)', 14, currentY);
    currentY += 6;

    const agentData = analytics.rankingAgentes.map((a, i) => [
        i + 1,
        a.name,
        a.Supervisor,
        a.Trabalhados,
        a.MediaDiaria,
        a.Fechados,
        a.Recusas
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'Agente', 'Supervisor', 'Trabalhados', 'Média/Dia', 'Fechados', 'Recusas']],
        body: agentData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }, // slate-800
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 10 }, 1: { fontStyle: 'bold' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Supervisor Ranking ---
    // Check page break
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(14);
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

    // --- Neighborhoods ---
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(14);
    doc.text('Produção por Bairro', 14, currentY);
    currentY += 6;

    const bairroData = analytics.neighborhoods.map(n => [
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
        head: [['Bairro', 'Imóveis (Meta)', 'Visitados', 'Cobertura', 'Res', 'TB', 'Com', 'PE', 'Outros']],
        body: bairroData,
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
    
    // --- Issues / Pendências ---
    doc.addPage();
    currentY = 20;

    doc.setFontSize(14);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`Relatório de Ocorrências e Pendências (${pendenciasList.length})`, 14, currentY);
    currentY += 6;

    const issuesData = pendenciasList.map(p => [
        p.DataISO.split('-').reverse().join('/'),
        p.Agente,
        p.Supervisor,
        p.Pendencias,
        p.Observacao
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Data', 'Agente', 'Supervisor', 'Tipo', 'Observação']],
        body: issuesData,
        theme: 'striped',
        headStyles: { fillColor: [185, 28, 28] }, // red-700
        styles: { fontSize: 8 },
        columnStyles: { 4: { cellWidth: 80 } } // Wider observation column
    });

    // Save
    doc.save(`Relatorio_Producao_${new Date().toISOString().split('T')[0]}.pdf`);
};

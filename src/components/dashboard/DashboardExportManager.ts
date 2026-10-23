import { PerfilConsultor } from '../../types';
import { formatIsoDateToBr } from '../../utils/masks';

export interface DashboardExportOptions {
  viagensParaExportar: any[];
  user: any;
  consultores: PerfilConsultor[];
  locPagamentosMap: Map<string, any[]>;
  getTripFinancialTotals: (v: any) => { totalVenda: number; totalRentabilidade: number };
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export class DashboardExportManager {
  /**
   * Exporta a lista de viagens filtradas em formato CSV (compatível com Excel Brasil: delimitador ';' e BOM UTF-8)
   */
  public static exportarViagensCsv(options: DashboardExportOptions): void {
    const {
      viagensParaExportar,
      user,
      consultores,
      locPagamentosMap,
      getTripFinancialTotals,
      onSuccess,
      onError
    } = options;

    if (!viagensParaExportar || viagensParaExportar.length === 0) {
      if (onError) onError('Nenhuma viagem para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'ID Ref',
      'Cliente',
      'CPF/Doc',
      'Telefone',
      'Email',
      'Origem do Lead',
      'Qtd PAX',
      'Tags / Classificações',
      'Destino',
      'Data Financeiro',
      'Embarque (Ida)',
      'Retorno (Volta)',
      'Produtos / Serviços',
      'Fornecedores',
      'Localizadores',
      'Formas de Recebimento',
      'Valor Total Venda (R$)',
      'Rentabilidade (R$)',
      'Consultor Responsável',
      'Fase / Status',
      'Conf. Financeira',
      'Conf. Processo',
      'Voucher Geral Anexado'
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatMoedaCsv = (val?: number): string => {
      if (val === undefined || val === null || isNaN(val)) return '0,00';
      return val.toFixed(2).replace('.', ',');
    };

    const rows = viagensParaExportar.map(v => {
      const prods = Array.isArray(v.produtos) ? v.produtos : [];
      const prodNomes = prods.map((p: any) => `${p.tipo || 'Item'}: ${p.descricao || p.nome || ''}`.trim()).join(' | ');
      const fornecedores = Array.from(new Set(prods.map((p: any) => (p.fornecedor || '').trim()).filter(Boolean))).join(', ');
      const locs = Array.from(new Set(prods.map((p: any) => (p.codigo_reserva || '').trim()).filter(Boolean))).join(', ');
      const consultorNome = v.consultor_id === user?.id ? 'Você' : (consultores.find(c => c.id === v.consultor_id)?.nome || 'Consultor');

      const pags = locPagamentosMap.get(v.id) || [];
      const formasNomes = Array.from(new Set(pags.map((p: any) => (p.forma_nome || p.forma_recebimento_id || '').trim()).filter(Boolean))).join(', ');
      const origemLead = v.cliente?.lead_origin || v.lead_origin || '';
      const paxCount = Array.isArray(v.passageiros) && v.passageiros.length > 0 ? v.passageiros.length : (Number(v.pax_count) || 1);
      const tagsList = Array.from(new Set([...(v.cliente?.classificacoes || []), ...(v.tags || [])])).join(', ');

      const finTotals = getTripFinancialTotals(v);

      return [
        escapeCsv(v.codigo_ref || v.id?.substring(0, 8) || ''),
        escapeCsv(v.cliente?.nome || 'Cliente não identificado'),
        escapeCsv(v.cliente?.documento || ''),
        escapeCsv(v.cliente?.telefone || ''),
        escapeCsv(v.cliente?.email || ''),
        escapeCsv(origemLead),
        escapeCsv(paxCount),
        escapeCsv(tagsList),
        escapeCsv(v.destino || ''),
        escapeCsv(v.data_financeiro ? formatIsoDateToBr(v.data_financeiro) : ''),
        escapeCsv(v.data_ida ? formatIsoDateToBr(v.data_ida) : ''),
        escapeCsv(v.data_volta ? formatIsoDateToBr(v.data_volta) : ''),
        escapeCsv(prodNomes),
        escapeCsv(fornecedores),
        escapeCsv(locs),
        escapeCsv(formasNomes),
        escapeCsv(formatMoedaCsv(finTotals.totalVenda)),
        escapeCsv(formatMoedaCsv(finTotals.totalRentabilidade)),
        escapeCsv(consultorNome),
        escapeCsv(v.status || ''),
        escapeCsv(v.isFinanceiroConferido ? 'OK' : 'Pendente'),
        escapeCsv(v.isProcessoConferido ? 'OK' : 'Pendente'),
        escapeCsv(v.voucher_geral_anexado ? 'SIM' : 'NÃO')
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dataHora = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    link.setAttribute('download', `PaxFlow_Viagens_Export_${dataHora}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onSuccess) {
      onSuccess(`Planilha exportada com sucesso! (${viagensParaExportar.length} viagens)`);
    }
  }
}

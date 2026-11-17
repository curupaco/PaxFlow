/**
 * src/services/performanceComparativaService.ts
 *
 * Serviço de Inteligência Analítica e Comparativa de Performance de Loja & Pacing.
 * Fornece cálculos determinísticos de variação de vendas, margem, projeções (Run-Rate),
 * ritmo diário acumulado (Curva S) e rateio oficial de parcerias (viagens_divisoes).
 *
 * Governança Estrita:
 * - Vendas apuradas exclusivamente por data_financeiro (sem fallbacks mascarados).
 * - Orçamentos apurados por safra de criação (created_at).
 * - Rateio fiel com base nas proporções de viagens_divisoes.
 */

import { supabase } from './supabase';
import { PerfilConsultor } from '../types';

export type PresetPacingTipo = 
  | 'mom_same_period'    // Mês atual até hoje vs. Mês anterior no mesmo dia
  | 'yoy_same_period'    // Mês atual até hoje vs. Mesmo mês do ano passado
  | 'qtd_same_period'    // Trimestre atual até hoje vs. Trimestre anterior
  | 'customizado';       // Intervalo livre customizado

export interface IntervaloDatas {
  inicio: string; // YYYY-MM-DD
  fim: string;    // YYYY-MM-DD
  diasCorte: number;
  diasTotais: number;
  rotulo: string;
}

export interface FiltrosComparativosOptions {
  preset: PresetPacingTipo;
  dataAtualInicio?: string;
  dataAtualFim?: string;
  dataAnteriorInicio?: string;
  dataAnteriorFim?: string;
  consultorId?: string; // 'todos' ou ID específico
  tipoProduto?: string; // 'todos' ou tipo específico
  destino?: string;     // 'todos' ou termo de destino
  userPerfil?: PerfilConsultor | null;
}

export interface DeltaMetrica {
  atual: number;
  anterior: number;
  deltaNominal: number;
  deltaPercentual: number;
  direcao: 'up' | 'down' | 'equal';
}

export interface KpisComparativosResult {
  faturamento: DeltaMetrica;
  rentabilidade: DeltaMetrica;
  margemMedia: DeltaMetrica;
  quantidadeVendas: DeltaMetrica;
  ticketMedio: DeltaMetrica;
  orcamentosCriados: DeltaMetrica;
  taxaConversao: DeltaMetrica;
  tempoMedioFechamentoDias: DeltaMetrica;
  runRateFechamento: number; // Projeção de faturamento no fim do período
  ritmoEsperadoPercentual: number; // % do mês decorrido
}

export interface PontoCurvaS {
  dia: number;
  dataAtualStr: string;
  dataAnteriorStr: string;
  vendaDiaAtual: number;
  vendaAcumuladaAtual: number;
  vendaDiaAnterior: number;
  vendaAcumuladaAnterior: number;
  vendaProjetada?: number;
}

export interface CurvaSResult {
  pontos: PontoCurvaS[];
  totalAtualAteCorte: number;
  totalAnteriorAteCorte: number;
  benchmarkFechamentoAnterior: number;
  runRateFinal: number;
}

export interface LinhaConsultorComparativo {
  consultorId: string;
  nome: string;
  avatarUrl?: string;
  vendasAtualValor: number;
  vendasAtualQtd: number;
  vendasAnteriorValor: number;
  vendasAnteriorQtd: number;
  deltaValor: number;
  deltaPercentual: number;
  rentabilidadeAtualValor: number;
  margemAtualPercentual: number;
  orcamentosQtd: number;
  taxaConversaoPercentual: number;
  shareLojaPercentual: number;
}

export class PerformanceComparativaService {
  /**
   * Calcula a variação nominal e percentual entre dois números de forma segura
   */
  public static calcularDelta(atual: number, anterior: number): DeltaMetrica {
    const valAtual = Number(atual) || 0;
    const valAnterior = Number(anterior) || 0;
    const deltaNominal = valAtual - valAnterior;

    let deltaPercentual = 0;
    if (valAnterior > 0) {
      deltaPercentual = ((valAtual - valAnterior) / valAnterior) * 100;
    } else if (valAnterior === 0 && valAtual > 0) {
      deltaPercentual = 100;
    } else if (valAnterior === 0 && valAtual === 0) {
      deltaPercentual = 0;
    } else if (valAnterior < 0) {
      deltaPercentual = valAtual > valAnterior ? 100 : -100;
    }

    let direcao: 'up' | 'down' | 'equal' = 'equal';
    if (deltaNominal > 0.001) direcao = 'up';
    else if (deltaNominal < -0.001) direcao = 'down';

    return {
      atual: valAtual,
      anterior: valAnterior,
      deltaNominal,
      deltaPercentual,
      direcao
    };
  }

  /**
   * Resolve as datas de início e fim dos dois períodos com base no preset selecionado
   */
  public static resolverDatasPreset(
    preset: PresetPacingTipo,
    dataReferencia: Date = new Date(),
    customOpts?: { dataAtualInicio?: string; dataAtualFim?: string; dataAnteriorInicio?: string; dataAnteriorFim?: string }
  ): { atual: IntervaloDatas; anterior: IntervaloDatas } {
    const ref = new Date(dataReferencia);
    const anoAtual = ref.getFullYear();
    const mesAtual = ref.getMonth(); // 0-indexed
    const diaHoje = ref.getDate();

    // Dias totais no mês atual
    const ultimoDiaMesAtual = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const diasCorte = Math.min(diaHoje, ultimoDiaMesAtual);

    const formatarData = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'mom_same_period') {
      // Período Atual: Dia 01 ao dia corte do mês atual
      const dataInicioAtual = new Date(anoAtual, mesAtual, 1);
      const dataFimAtual = new Date(anoAtual, mesAtual, diasCorte);

      // Período Anterior: Mesmo dia corte do mês anterior
      const dataInicioAnt = new Date(anoAtual, mesAtual - 1, 1);
      const ultimoDiaMesAnt = new Date(anoAtual, mesAtual, 0).getDate();
      const diasCorteAnt = Math.min(diasCorte, ultimoDiaMesAnt);
      const dataFimAnt = new Date(anoAtual, mesAtual - 1, diasCorteAnt);

      const nomeMesAtual = ref.toLocaleDateString('pt-BR', { month: 'short' });
      const mesAntRef = new Date(anoAtual, mesAtual - 1, 1);
      const nomeMesAnt = mesAntRef.toLocaleDateString('pt-BR', { month: 'short' });

      return {
        atual: {
          inicio: formatarData(dataInicioAtual),
          fim: formatarData(dataFimAtual),
          diasCorte,
          diasTotais: ultimoDiaMesAtual,
          rotulo: `${nomeMesAtual} (1 a ${diasCorte})`
        },
        anterior: {
          inicio: formatarData(dataInicioAnt),
          fim: formatarData(dataFimAnt),
          diasCorte: diasCorteAnt,
          diasTotais: ultimoDiaMesAnt,
          rotulo: `${nomeMesAnt} (1 a ${diasCorteAnt})`
        }
      };
    }

    if (preset === 'yoy_same_period') {
      const dataInicioAtual = new Date(anoAtual, mesAtual, 1);
      const dataFimAtual = new Date(anoAtual, mesAtual, diasCorte);

      const dataInicioAnt = new Date(anoAtual - 1, mesAtual, 1);
      const ultimoDiaMesAnt = new Date(anoAtual - 1, mesAtual + 1, 0).getDate();
      const diasCorteAnt = Math.min(diasCorte, ultimoDiaMesAnt);
      const dataFimAnt = new Date(anoAtual - 1, mesAtual, diasCorteAnt);

      return {
        atual: {
          inicio: formatarData(dataInicioAtual),
          fim: formatarData(dataFimAtual),
          diasCorte,
          diasTotais: ultimoDiaMesAtual,
          rotulo: `${anoAtual} (1 a ${diasCorte})`
        },
        anterior: {
          inicio: formatarData(dataInicioAnt),
          fim: formatarData(dataFimAnt),
          diasCorte: diasCorteAnt,
          diasTotais: ultimoDiaMesAnt,
          rotulo: `${anoAtual - 1} (1 a ${diasCorteAnt})`
        }
      };
    }

    if (preset === 'qtd_same_period') {
      const trimAtual = Math.floor(mesAtual / 3);
      const mesInicioTrim = trimAtual * 3;
      const dataInicioAtual = new Date(anoAtual, mesInicioTrim, 1);
      const dataFimAtual = new Date(anoAtual, mesAtual, diasCorte);

      // Quantos dias decorreram no trimestre atual até hoje
      const msPorDia = 86400000;
      const diasDecorridosTrim = Math.max(1, Math.ceil((dataFimAtual.getTime() - dataInicioAtual.getTime()) / msPorDia) + 1);

      // Trimestre anterior
      const dataInicioAnt = new Date(anoAtual, mesInicioTrim - 3, 1);
      const dataFimAnt = new Date(dataInicioAnt.getTime() + (diasDecorridosTrim - 1) * msPorDia);

      return {
        atual: {
          inicio: formatarData(dataInicioAtual),
          fim: formatarData(dataFimAtual),
          diasCorte: diasDecorridosTrim,
          diasTotais: 90,
          rotulo: `T${trimAtual + 1}/${anoAtual} (até hoje)`
        },
        anterior: {
          inicio: formatarData(dataInicioAnt),
          fim: formatarData(dataFimAnt),
          diasCorte: diasDecorridosTrim,
          diasTotais: 90,
          rotulo: `T${trimAtual === 0 ? 4 : trimAtual}/${trimAtual === 0 ? anoAtual - 1 : anoAtual}`
        }
      };
    }

    // Customizado
    const iniAtu = customOpts?.dataAtualInicio || formatarData(new Date(anoAtual, mesAtual, 1));
    const fimAtu = customOpts?.dataAtualFim || formatarData(new Date(anoAtual, mesAtual, diasCorte));
    const iniAnt = customOpts?.dataAnteriorInicio || formatarData(new Date(anoAtual, mesAtual - 1, 1));
    const fimAnt = customOpts?.dataAnteriorFim || formatarData(new Date(anoAtual, mesAtual - 1, diasCorte));

    const dtIniA = new Date(iniAtu);
    const dtFimA = new Date(fimAtu);
    const diasTotaisA = Math.max(1, Math.ceil((dtFimA.getTime() - dtIniA.getTime()) / 86400000) + 1);

    const dtIniB = new Date(iniAnt);
    const dtFimB = new Date(fimAnt);
    const diasTotaisB = Math.max(1, Math.ceil((dtFimB.getTime() - dtIniB.getTime()) / 86400000) + 1);

    return {
      atual: {
        inicio: iniAtu,
        fim: fimAtu,
        diasCorte: diasTotaisA,
        diasTotais: diasTotaisA,
        rotulo: `${iniAtu} a ${fimAtu}`
      },
      anterior: {
        inicio: iniAnt,
        fim: fimAnt,
        diasCorte: diasTotaisB,
        diasTotais: diasTotaisB,
        rotulo: `${iniAnt} a ${fimAnt}`
      }
    };
  }

  /**
   * Calcula o lucro líquido/rentabilidade de uma viagem somando Comissão + Markup + 88% RAV
   */
  public static calcularRentabilidadeViagem(viagem: any): number {
    if (!viagem) return 0;
    const produtos = Array.isArray(viagem.produtos) ? viagem.produtos : [];
    
    if (produtos.length > 0) {
      return produtos.reduce((acc: number, p: any) => {
        if (String(p.status || '').toLowerCase() === 'reembolsado') return acc;
        const comissao = Number(p.comissao) || 0;
        const markup = Number(p.markup) || 0;
        const rav = Number(p.rav) || 0;
        return acc + comissao + markup + (rav * 0.88);
      }, 0);
    }

    // Se não tiver produtos detalhados, utiliza campos diretos da viagem se existentes
    const comissao = Number(viagem.comissao) || 0;
    const markup = Number(viagem.markup) || 0;
    const rav = Number(viagem.rav) || 0;
    if (comissao > 0 || markup > 0 || rav > 0) {
      return comissao + markup + (rav * 0.88);
    }

    return Number(viagem.rentabilidade) || 0;
  }

  /**
   * Processa a apuração das viagens respeitando rigorosamente a data_financeiro e divisões
   */
  public static processarViagens(
    viagens: any[],
    filtros: { consultorId?: string; tipoProduto?: string; destino?: string }
  ): any[] {
    const { consultorId, tipoProduto, destino } = filtros;

    return viagens.filter(v => {
      // 1. GOVERNANÇA ESTRITA: Exige data_financeiro válida física
      if (!v.data_financeiro) return false;

      // 2. Filtro de Destino
      if (destino && destino !== 'todos') {
        const destTerm = destino.toLowerCase().trim();
        const vDest = (v.destino || '').toLowerCase();
        if (!vDest.includes(destTerm)) return false;
      }

      // 3. Filtro de Tipo de Produto
      if (tipoProduto && tipoProduto !== 'todos') {
        const prods = Array.isArray(v.produtos) ? v.produtos : [];
        const tipoMatch = prods.some((p: any) => 
          (p.tipo || '').toLowerCase() === tipoProduto.toLowerCase()
        );
        if (!tipoMatch) return false;
      }

      // 4. Filtro por Consultor (quando especificado)
      if (consultorId && consultorId !== 'todos') {
        const isTitular = (v.consultor_id || (v as any).consultorId) === consultorId;
        const divisoes = Array.isArray(v.divisoes) ? v.divisoes : [];
        const isParceiro = divisoes.some((d: any) => d.consultor_id === consultorId);
        if (!isTitular && !isParceiro) return false;
      }

      return true;
    });
  }

  /**
   * Calcula os KPIs comparativos principais (Vendas, Lucro, Margem, Qtd, Ticket, Orçamentos e Projeção)
   */
  public static calcularKpisComparativos(
    vendasAtual: any[],
    vendasAnterior: any[],
    orcamentosAtual: any[],
    orcamentosAnterior: any[],
    diasDecorridos: number,
    diasTotais: number,
    consultorIdFiltro: string = 'todos'
  ): KpisComparativosResult {
    // Faturamento e Rentabilidade com rateio se houver filtro por consultor
    const somarMetricasVendas = (lista: any[]) => {
      let fat = 0;
      let rent = 0;
      let qtd = 0;

      lista.forEach(v => {
        const valorViagem = Number(v.valor_total) || 0;
        const rentViagem = this.calcularRentabilidadeViagem(v);
        const divisoes = Array.isArray(v.divisoes) ? v.divisoes : [];

        if (consultorIdFiltro !== 'todos' && divisoes.length > 0) {
          const div = divisoes.find((d: any) => d.consultor_id === consultorIdFiltro);
          if (div) {
            const perc = (Number(div.percentual) || 0) / 100;
            fat += valorViagem * perc;
            rent += rentViagem * perc;
            qtd += perc;
          } else if (v.consultor_id === consultorIdFiltro) {
            // É titular, recebe o restante não dividido
            const totalOutros = divisoes.reduce((s: number, d: any) => s + (Number(d.percentual) || 0), 0);
            const percTitular = Math.max(0, 100 - totalOutros) / 100;
            fat += valorViagem * percTitular;
            rent += rentViagem * percTitular;
            qtd += percTitular;
          }
        } else {
          fat += valorViagem;
          rent += rentViagem;
          qtd += 1;
        }
      });

      return { fat, rent, qtd };
    };

    const metAtual = somarMetricasVendas(vendasAtual);
    const metAnterior = somarMetricasVendas(vendasAnterior);

    // Margem %
    const margemAtual = metAtual.fat > 0 ? (metAtual.rent / metAtual.fat) * 100 : 0;
    const margemAnterior = metAnterior.fat > 0 ? (metAnterior.rent / metAnterior.fat) * 100 : 0;

    // Ticket Médio
    const ticketAtual = metAtual.qtd > 0 ? metAtual.fat / metAtual.qtd : 0;
    const ticketAnterior = metAnterior.qtd > 0 ? metAnterior.fat / metAnterior.qtd : 0;

    // Orçamentos por Safra (created_at)
    const orcAtualFiltrados = consultorIdFiltro !== 'todos'
      ? orcamentosAtual.filter(o => (o.consultor_id || o.consultorId) === consultorIdFiltro)
      : orcamentosAtual;

    const orcAntFiltrados = consultorIdFiltro !== 'todos'
      ? orcamentosAnterior.filter(o => (o.consultor_id || o.consultorId) === consultorIdFiltro)
      : orcamentosAnterior;

    const orcAtualQtd = orcAtualFiltrados.length;
    const orcAntQtd = orcAntFiltrados.length;

    // Taxa de Conversão por Safra (virou_venda ou ganho)
    const orcGanhosAtual = orcAtualFiltrados.filter(o => {
      const st = String(o.status || '').toLowerCase();
      return st === 'virou_venda' || st === 'aprovado' || st === 'ganho';
    }).length;

    const orcGanhosAnt = orcAntFiltrados.filter(o => {
      const st = String(o.status || '').toLowerCase();
      return st === 'virou_venda' || st === 'aprovado' || st === 'ganho';
    }).length;

    const txConvAtual = orcAtualQtd > 0 ? (orcGanhosAtual / orcAtualQtd) * 100 : 0;
    const txConvAnt = orcAntQtd > 0 ? (orcGanhosAnt / orcAntQtd) * 100 : 0;

    // Tempo Médio de Fechamento (dias entre criação e fechamento do orçamento)
    const calcularTempoMedio = (lista: any[]) => {
      const ganhosComDatas = lista.filter(o => {
        const st = String(o.status || '').toLowerCase();
        return (st === 'virou_venda' || st === 'aprovado' || st === 'ganho') && (o.data_fechamento || o.updated_at);
      });
      if (ganhosComDatas.length === 0) return 0;

      const totalDias = ganhosComDatas.reduce((acc, o) => {
        const dtCria = new Date(o.created_at).getTime();
        const dtFim = new Date(o.data_fechamento || o.updated_at).getTime();
        const diff = Math.max(0, Math.round((dtFim - dtCria) / 86400000));
        return acc + diff;
      }, 0);

      return totalDias / ganhosComDatas.length;
    };

    const tempoMedioAtual = calcularTempoMedio(orcAtualFiltrados);
    const tempoMedioAnt = calcularTempoMedio(orcAntFiltrados);

    // Run-Rate (Projeção Linear no fim do período)
    const diasValidos = Math.max(1, diasDecorridos);
    const runRateFechamento = diasTotais > 0 ? (metAtual.fat / diasValidos) * diasTotais : metAtual.fat;
    const ritmoEsperadoPercentual = diasTotais > 0 ? Math.min(100, (diasDecorridos / diasTotais) * 100) : 100;

    return {
      faturamento: this.calcularDelta(metAtual.fat, metAnterior.fat),
      rentabilidade: this.calcularDelta(metAtual.rent, metAnterior.rent),
      margemMedia: this.calcularDelta(margemAtual, margemAnterior),
      quantidadeVendas: this.calcularDelta(metAtual.qtd, metAnterior.qtd),
      ticketMedio: this.calcularDelta(ticketAtual, ticketAnterior),
      orcamentosCriados: this.calcularDelta(orcAtualQtd, orcAntQtd),
      taxaConversao: this.calcularDelta(txConvAtual, txConvAnt),
      tempoMedioFechamentoDias: this.calcularDelta(tempoMedioAtual, tempoMedioAnt),
      runRateFechamento,
      ritmoEsperadoPercentual
    };
  }

  /**
   * Constrói a série temporal da Curva S (Pacing Diário Acumulado)
   */
  public static calcularPacingCurvaS(
    vendasAtual: any[],
    vendasAnterior: any[],
    diasCorte: number,
    diasTotais: number,
    benchmarkTotalAnterior: number
  ): CurvaSResult {
    const pontos: PontoCurvaS[] = [];

    // Mapear vendas por dia (1 a diasTotais)
    const mapaAtual: Record<number, number> = {};
    const mapaAnt: Record<number, number> = {};

    vendasAtual.forEach(v => {
      if (v.data_financeiro) {
        const dia = parseInt(v.data_financeiro.split('-')[2], 10);
        mapaAtual[dia] = (mapaAtual[dia] || 0) + (Number(v.valor_total) || 0);
      }
    });

    vendasAnterior.forEach(v => {
      if (v.data_financeiro) {
        const dia = parseInt(v.data_financeiro.split('-')[2], 10);
        mapaAnt[dia] = (mapaAnt[dia] || 0) + (Number(v.valor_total) || 0);
      }
    });

    let acumAtual = 0;
    let acumAnt = 0;
    const diasLimite = Math.max(diasTotais, diasCorte, 30);

    for (let dia = 1; dia <= diasLimite; dia++) {
      const vDiaAtu = mapaAtual[dia] || 0;
      const vDiaAnt = mapaAnt[dia] || 0;

      if (dia <= diasCorte) {
        acumAtual += vDiaAtu;
      }
      acumAnt += vDiaAnt;

      const ponto: PontoCurvaS = {
        dia,
        dataAtualStr: `Dia ${dia}`,
        dataAnteriorStr: `Dia ${dia}`,
        vendaDiaAtual: dia <= diasCorte ? vDiaAtu : 0,
        vendaAcumuladaAtual: dia <= diasCorte ? acumAtual : 0,
        vendaDiaAnterior: vDiaAnt,
        vendaAcumuladaAnterior: acumAnt
      };

      pontos.push(ponto);
    }

    // Calcular Run-Rate e preencher projeção para os dias futuros
    const mediaDiaria = diasCorte > 0 ? acumAtual / diasCorte : 0;
    const runRateFinal = acumAtual + (mediaDiaria * Math.max(0, diasTotais - diasCorte));

    for (let i = 0; i < pontos.length; i++) {
      const p = pontos[i];
      if (p.dia <= diasCorte) {
        p.vendaProjetada = p.vendaAcumuladaAtual;
      } else if (p.dia <= diasTotais) {
        p.vendaProjetada = acumAtual + (mediaDiaria * (p.dia - diasCorte));
      }
    }

    return {
      pontos,
      totalAtualAteCorte: acumAtual,
      totalAnteriorAteCorte: pontos[Math.min(diasCorte, pontos.length) - 1]?.vendaAcumuladaAnterior || 0,
      benchmarkFechamentoAnterior: benchmarkTotalAnterior || acumAnt,
      runRateFinal
    };
  }

  /**
   * Consolida a Tabela Analítica por Consultor com rateio de viagens_divisoes
   */
  public static calcularTabelaConsultores(
    vendasAtual: any[],
    vendasAnterior: any[],
    orcamentosAtual: any[],
    perfis: PerfilConsultor[]
  ): LinhaConsultorComparativo[] {
    const totalGeralLoja = vendasAtual.reduce((s, v) => s + (Number(v.valor_total) || 0), 0);

    // Mapa de acumuladores por ID do consultor
    const mapa = new Map<string, {
      vendasAtu: number;
      qtdAtu: number;
      rentAtu: number;
      vendasAnt: number;
      qtdAnt: number;
      rentAnt: number;
      orcQtd: number;
      orcGanhos: number;
    }>();

    // Inicializar com todos os consultores conhecidos
    perfis.forEach(p => {
      mapa.set(p.id, {
        vendasAtu: 0,
        qtdAtu: 0,
        rentAtu: 0,
        vendasAnt: 0,
        qtdAnt: 0,
        rentAnt: 0,
        orcQtd: 0,
        orcGanhos: 0
      });
    });

    // Processar Vendas Atuais com rateio oficial
    vendasAtual.forEach(v => {
      const valor = Number(v.valor_total) || 0;
      const rent = this.calcularRentabilidadeViagem(v);
      const divisoes = Array.isArray(v.divisoes) ? v.divisoes : [];
      const titularId = v.consultor_id || (v as any).consultorId;

      if (divisoes.length > 0) {
        let somaDivPerc = 0;
        divisoes.forEach((d: any) => {
          const cId = d.consultor_id;
          const perc = (Number(d.percentual) || 0) / 100;
          somaDivPerc += perc;

          if (!mapa.has(cId)) {
            mapa.set(cId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
          }
          const item = mapa.get(cId)!;
          item.vendasAtu += valor * perc;
          item.rentAtu += rent * perc;
          item.qtdAtu += perc;
        });

        // Restante para o titular se houver
        const percTitular = Math.max(0, 1 - somaDivPerc);
        if (titularId && percTitular > 0.001) {
          if (!mapa.has(titularId)) {
            mapa.set(titularId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
          }
          const item = mapa.get(titularId)!;
          item.vendasAtu += valor * percTitular;
          item.rentAtu += rent * percTitular;
          item.qtdAtu += percTitular;
        }
      } else if (titularId) {
        if (!mapa.has(titularId)) {
          mapa.set(titularId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
        }
        const item = mapa.get(titularId)!;
        item.vendasAtu += valor;
        item.rentAtu += rent;
        item.qtdAtu += 1;
      }
    });

    // Processar Vendas Anteriores com rateio oficial
    vendasAnterior.forEach(v => {
      const valor = Number(v.valor_total) || 0;
      const rent = this.calcularRentabilidadeViagem(v);
      const divisoes = Array.isArray(v.divisoes) ? v.divisoes : [];
      const titularId = v.consultor_id || (v as any).consultorId;

      if (divisoes.length > 0) {
        let somaDivPerc = 0;
        divisoes.forEach((d: any) => {
          const cId = d.consultor_id;
          const perc = (Number(d.percentual) || 0) / 100;
          somaDivPerc += perc;

          if (!mapa.has(cId)) {
            mapa.set(cId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
          }
          const item = mapa.get(cId)!;
          item.vendasAnt += valor * perc;
          item.rentAnt += rent * perc;
          item.qtdAnt += perc;
        });

        const percTitular = Math.max(0, 1 - somaDivPerc);
        if (titularId && percTitular > 0.001) {
          if (!mapa.has(titularId)) {
            mapa.set(titularId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
          }
          const item = mapa.get(titularId)!;
          item.vendasAnt += valor * percTitular;
          item.rentAnt += rent * percTitular;
          item.qtdAnt += percTitular;
        }
      } else if (titularId) {
        if (!mapa.has(titularId)) {
          mapa.set(titularId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
        }
        const item = mapa.get(titularId)!;
        item.vendasAnt += valor;
        item.rentAnt += rent;
        item.qtdAnt += 1;
      }
    });

    // Processar Orçamentos
    orcamentosAtual.forEach(o => {
      const cId = o.consultor_id || o.consultorId;
      if (cId) {
        if (!mapa.has(cId)) {
          mapa.set(cId, { vendasAtu: 0, qtdAtu: 0, rentAtu: 0, vendasAnt: 0, qtdAnt: 0, rentAnt: 0, orcQtd: 0, orcGanhos: 0 });
        }
        const item = mapa.get(cId)!;
        item.orcQtd += 1;
        const st = String(o.status || '').toLowerCase();
        if (st === 'virou_venda' || st === 'aprovado' || st === 'ganho') {
          item.orcGanhos += 1;
        }
      }
    });

    // Montar linhas finais
    const linhas: LinhaConsultorComparativo[] = [];

    mapa.forEach((dados, cId) => {
      // Filtrar consultores fantasmas que não têm nenhuma movimentação
      if (dados.vendasAtu === 0 && dados.vendasAnt === 0 && dados.orcQtd === 0) {
        return;
      }

      const perfil = perfis.find(p => p.id === cId);
      const nome = perfil?.nome || 'Consultor ' + cId.slice(0, 5);
      const delta = this.calcularDelta(dados.vendasAtu, dados.vendasAnt);
      const margem = dados.vendasAtu > 0 ? (dados.rentAtu / dados.vendasAtu) * 100 : 0;
      const conv = dados.orcQtd > 0 ? (dados.orcGanhos / dados.orcQtd) * 100 : 0;
      const share = totalGeralLoja > 0 ? (dados.vendasAtu / totalGeralLoja) * 100 : 0;

      linhas.push({
        consultorId: cId,
        nome,
        avatarUrl: perfil?.avatar_url,
        vendasAtualValor: dados.vendasAtu,
        vendasAtualQtd: dados.qtdAtu,
        vendasAnteriorValor: dados.vendasAnt,
        vendasAnteriorQtd: dados.qtdAnt,
        deltaValor: delta.deltaNominal,
        deltaPercentual: delta.deltaPercentual,
        rentabilidadeAtualValor: dados.rentAtu,
        margemAtualPercentual: margem,
        orcamentosQtd: dados.orcQtd,
        taxaConversaoPercentual: conv,
        shareLojaPercentual: share
      });
    });

    // Ordenar pelo faturamento atual decrescente
    return linhas.sort((a, b) => b.vendasAtualValor - a.vendasAtualValor);
  }

  /**
   * Consulta os dados no Supabase para os dois períodos de forma concorrente e cirúrgica
   */
  public static async buscarDadosComparativos(
    opcoes: FiltrosComparativosOptions
  ): Promise<{
    intervalos: { atual: IntervaloDatas; anterior: IntervaloDatas };
    kpis: KpisComparativosResult;
    curvaS: CurvaSResult;
    tabelaTime: LinhaConsultorComparativo[];
    consultores: PerfilConsultor[];
  }> {
    const intervalos = this.resolverDatasPreset(opcoes.preset, new Date(), {
      dataAtualInicio: opcoes.dataAtualInicio,
      dataAtualFim: opcoes.dataAtualFim,
      dataAnteriorInicio: opcoes.dataAnteriorInicio,
      dataAnteriorFim: opcoes.dataAnteriorFim
    });

    // Consultar dados em paralelo
    const [resViagensAtual, resViagensAnt, resOrcAtual, resOrcAnt, resPerfis] = await Promise.all([
      supabase
        .from('viagens')
        .select(`
          id,
          valor_total,
          data_financeiro,
          destino,
          status,
          consultor_id,
          produtos:produtos_viagem(id, tipo, valor_venda, comissao, markup, rav, status),
          divisoes:viagens_divisoes(consultor_id, percentual)
        `)
        .not('status', 'eq', 'cancelada')
        .not('data_financeiro', 'is', null)
        .gte('data_financeiro', intervalos.atual.inicio)
        .lte('data_financeiro', intervalos.atual.fim),

      supabase
        .from('viagens')
        .select(`
          id,
          valor_total,
          data_financeiro,
          destino,
          status,
          consultor_id,
          produtos:produtos_viagem(id, tipo, valor_venda, comissao, markup, rav, status),
          divisoes:viagens_divisoes(consultor_id, percentual)
        `)
        .not('status', 'eq', 'cancelada')
        .not('data_financeiro', 'is', null)
        .gte('data_financeiro', intervalos.anterior.inicio)
        .lte('data_financeiro', intervalos.anterior.fim),

      supabase
        .from('orcamentos')
        .select('id, consultor_id, status, created_at, updated_at, data_fechamento')
        .gte('created_at', `${intervalos.atual.inicio}T00:00:00Z`)
        .lte('created_at', `${intervalos.atual.fim}T23:59:59Z`),

      supabase
        .from('orcamentos')
        .select('id, consultor_id, status, created_at, updated_at, data_fechamento')
        .gte('created_at', `${intervalos.anterior.inicio}T00:00:00Z`)
        .lte('created_at', `${intervalos.anterior.fim}T23:59:59Z`),

      supabase
        .from('profiles')
        .select('id, nome, email, role, avatar_url, ativo')
        .order('nome', { ascending: true })
    ]);

    const perfis: PerfilConsultor[] = resPerfis.data || [];
    const rawViagensAtu = resViagensAtual.data || [];
    const rawViagensAnt = resViagensAnt.data || [];
    const rawOrcAtu = resOrcAtual.data || [];
    const rawOrcAnt = resOrcAnt.data || [];

    // Filtrar viagens com base nos parâmetros
    const viagensAtuFiltradas = this.processarViagens(rawViagensAtu, {
      consultorId: opcoes.consultorId,
      tipoProduto: opcoes.tipoProduto,
      destino: opcoes.destino
    });

    const viagensAntFiltradas = this.processarViagens(rawViagensAnt, {
      consultorId: opcoes.consultorId,
      tipoProduto: opcoes.tipoProduto,
      destino: opcoes.destino
    });

    // Calcular KPIs
    const kpis = this.calcularKpisComparativos(
      viagensAtuFiltradas,
      viagensAntFiltradas,
      rawOrcAtu,
      rawOrcAnt,
      intervalos.atual.diasCorte,
      intervalos.atual.diasTotais,
      opcoes.consultorId || 'todos'
    );

    // Benchmark total do mês anterior (para desenhar linha alvo)
    const benchmarkAnt = rawViagensAnt.reduce((s, v) => s + (Number(v.valor_total) || 0), 0);

    // Calcular Curva S
    const curvaS = this.calcularPacingCurvaS(
      viagensAtuFiltradas,
      viagensAntFiltradas,
      intervalos.atual.diasCorte,
      intervalos.atual.diasTotais,
      benchmarkAnt
    );

    // Tabela do time (com rateio)
    const tabelaTime = this.calcularTabelaConsultores(
      rawViagensAtu,
      rawViagensAnt,
      rawOrcAtu,
      perfis
    );

    return {
      intervalos,
      kpis,
      curvaS,
      tabelaTime,
      consultores: perfis
    };
  }

  /**
   * Gera o conteúdo CSV formatado para Excel Brasil (UTF-8 com BOM e ponto-e-vírgula)
   */
  public static gerarCsvComparativo(
    kpis: KpisComparativosResult,
    tabelaTime: LinhaConsultorComparativo[],
    intervalos: { atual: IntervaloDatas; anterior: IntervaloDatas }
  ): string {
    const formatMoeda = (val: number) => 
      val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const formatPerc = (val: number) => 
      `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

    let csv = '\uFEFF'; // BOM para Excel
    csv += `RELATÓRIO COMPARATIVO DE PERFORMANCE E PACING - PAXFLOW\n`;
    csv += `Período Atual;${intervalos.atual.rotulo};(${intervalos.atual.inicio} a ${intervalos.atual.fim})\n`;
    csv += `Período Anterior;${intervalos.anterior.rotulo};(${intervalos.anterior.inicio} a ${intervalos.anterior.fim})\n\n`;

    csv += `RESUMO EXECUTIVO DE KPIS\n`;
    csv += `Indicador;Período Atual;Período Anterior;Variação Nominal;Variação %\n`;
    csv += `Faturamento Bruto (R$);${formatMoeda(kpis.faturamento.atual)};${formatMoeda(kpis.faturamento.anterior)};${formatMoeda(kpis.faturamento.deltaNominal)};${formatPerc(kpis.faturamento.deltaPercentual)}\n`;
    csv += `Rentabilidade Líquida (R$);${formatMoeda(kpis.rentabilidade.atual)};${formatMoeda(kpis.rentabilidade.anterior)};${formatMoeda(kpis.rentabilidade.deltaNominal)};${formatPerc(kpis.rentabilidade.deltaPercentual)}\n`;
    csv += `Margem Média (%);${formatPerc(kpis.margemMedia.atual)};${formatPerc(kpis.margemMedia.anterior)};-;${formatPerc(kpis.margemMedia.deltaNominal)}\n`;
    csv += `Quantidade de Vendas;${kpis.quantidadeVendas.atual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })};${kpis.quantidadeVendas.anterior.toLocaleString('pt-BR', { maximumFractionDigits: 1 })};${kpis.quantidadeVendas.deltaNominal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })};${formatPerc(kpis.quantidadeVendas.deltaPercentual)}\n`;
    csv += `Ticket Médio (R$);${formatMoeda(kpis.ticketMedio.atual)};${formatMoeda(kpis.ticketMedio.anterior)};${formatMoeda(kpis.ticketMedio.deltaNominal)};${formatPerc(kpis.ticketMedio.deltaPercentual)}\n`;
    csv += `Orçamentos Criados;${kpis.orcamentosCriados.atual};${kpis.orcamentosCriados.anterior};${kpis.orcamentosCriados.deltaNominal};${formatPerc(kpis.orcamentosCriados.deltaPercentual)}\n`;
    csv += `Taxa de Conversão (%);${formatPerc(kpis.taxaConversao.atual)};${formatPerc(kpis.taxaConversao.anterior)};-;${formatPerc(kpis.taxaConversao.deltaNominal)}\n`;
    csv += `Projeção Fechamento (Run-Rate R$);${formatMoeda(kpis.runRateFechamento)};-;-;-\n\n`;

    csv += `DESEMPENHO POR CONSULTOR (COM RATEIO DE DIVISÕES)\n`;
    csv += `Consultor;Vendas Atual (R$);Vendas Atual (Qtd);Vendas Anterior (R$);Vendas Anterior (Qtd);Variação (R$);Variação (%);Rentabilidade Atual (R$);Margem (%);Orçamentos;Conversão (%);Share Loja (%)\n`;

    tabelaTime.forEach(c => {
      csv += `"${c.nome}";${formatMoeda(c.vendasAtualValor)};${c.vendasAtualQtd.toLocaleString('pt-BR', { maximumFractionDigits: 1 })};${formatMoeda(c.vendasAnteriorValor)};${c.vendasAnteriorQtd.toLocaleString('pt-BR', { maximumFractionDigits: 1 })};${formatMoeda(c.deltaValor)};${formatPerc(c.deltaPercentual)};${formatMoeda(c.rentabilidadeAtualValor)};${formatPerc(c.margemAtualPercentual)};${c.orcamentosQtd};${formatPerc(c.taxaConversaoPercentual)};${formatPerc(c.shareLojaPercentual)}\n`;
    });

    return csv;
  }
}

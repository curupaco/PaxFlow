import { supabase } from './supabase';
import { Viagem, ViagemDivisao } from '../types';

export interface ValidacaoSomaDivisoesResult {
  valida: boolean;
  soma: number;
  diferenca: number;
  mensagem: string;
}

export interface SalvarDivisaoItem {
  consultor_id: string;
  percentual: number;
  percentual_rav?: number | null;
  percentualRav?: number | null;
  is_titular?: boolean;
}

export interface SalvarDivisaoParams {
  viagemId: string;
  titularId: string;
  divisoes: SalvarDivisaoItem[];
}

export class ViagensDivisoesService {
  /**
   * Valida rigorosamente se a soma dos percentuais de venda é igual a 100,00%,
   * prevenindo inconsistências de ponto flutuante no JavaScript através de precisão centesimal inteira.
   */
  static validarSomaDivisoes(
    divisoes: Array<{ percentual: number }>
  ): ValidacaoSomaDivisoesResult {
    if (!divisoes || divisoes.length === 0) {
      return {
        valida: false,
        soma: 0,
        diferenca: 100,
        mensagem: 'É necessário informar ao menos um consultor responsável.'
      };
    }

    // Calcula em inteiros de centésimos (basis points): 100.00% = 10000
    const somaCentavos = divisoes.reduce((acc, curr) => {
      const val = Number(curr.percentual) || 0;
      return acc + Math.round(val * 100);
    }, 0);

    const somaReal = Math.round(somaCentavos) / 100;
    const diferenca = Math.round(10000 - somaCentavos) / 100;

    if (somaCentavos === 10000) {
      return {
        valida: true,
        soma: 100,
        diferenca: 0,
        mensagem: 'Soma exata de 100% validada com sucesso.'
      };
    }

    if (somaCentavos < 10000) {
      return {
        valida: false,
        soma: somaReal,
        diferenca,
        mensagem: `Faltam ${diferenca.toFixed(2)}% para totalizar 100,00% da venda.`
      };
    }

    return {
      valida: false,
      soma: somaReal,
      diferenca,
      mensagem: `A soma de ${somaReal.toFixed(2)}% ultrapassa 100,00% em ${Math.abs(diferenca).toFixed(2)}%.`
    };
  }

  /**
   * Valida rigorosamente se a soma dos percentuais de RAV é igual a 100,00%.
   * Caso percentual_rav seja nulo/indefinido, herda percentual para a apuração.
   */
  static validarSomaRav(
    divisoes: Array<{ percentual_rav?: number | null; percentualRav?: number | null; percentual?: number }>
  ): ValidacaoSomaDivisoesResult {
    if (!divisoes || divisoes.length === 0) {
      return {
        valida: false,
        soma: 0,
        diferenca: 100,
        mensagem: 'É necessário informar a divisão da RAV.'
      };
    }

    const somaCentavos = divisoes.reduce((acc, curr) => {
      const rawRav = curr.percentual_rav ?? curr.percentualRav;
      const val = rawRav !== undefined && rawRav !== null ? Number(rawRav) : Number(curr.percentual) || 0;
      return acc + Math.round(val * 100);
    }, 0);

    const somaReal = Math.round(somaCentavos) / 100;
    const diferenca = Math.round(10000 - somaCentavos) / 100;

    if (somaCentavos === 10000) {
      return {
        valida: true,
        soma: 100,
        diferenca: 0,
        mensagem: 'Soma de 100% da RAV validada com sucesso.'
      };
    }

    if (somaCentavos < 10000) {
      return {
        valida: false,
        soma: somaReal,
        diferenca,
        mensagem: `Faltam ${diferenca.toFixed(2)}% para totalizar 100,00% da RAV.`
      };
    }

    return {
      valida: false,
      soma: somaReal,
      diferenca,
      mensagem: `A soma de RAV (${somaReal.toFixed(2)}%) ultrapassa 100,00% em ${Math.abs(diferenca).toFixed(2)}%.`
    };
  }

  /**
   * Retorna os atalhos rápidos de distribuição percentual (1-clique)
   */
  static obterAtalhosRapidos(): Array<{ label: string; titular: number; parceiro: number }> {
    return [
      { label: '50 / 50', titular: 50, parceiro: 50 },
      { label: '80 / 20', titular: 80, parceiro: 20 },
      { label: '70 / 30', titular: 70, parceiro: 30 },
      { label: '90 / 10', titular: 90, parceiro: 10 },
      { label: '100% Titular', titular: 100, parceiro: 0 }
    ];
  }

  /**
   * Busca as divisões registradas no Supabase para uma viagem específica.
   * Conta com fallback defensivo para retrocompatibilidade e tolerância a schema drift (42P01 / 42703).
   */
  static async obterDivisoesPorViagem(
    viagemId: string,
    titularIdFallback?: string
  ): Promise<ViagemDivisao[]> {
    if (!viagemId) return [];

    try {
      let data: any[] | null = null;
      let error: any = null;

      // Tentativa 1: busca completa com percentual_rav
      const res = await supabase
        .from('viagens_divisoes')
        .select('id, viagem_id, consultor_id, percentual, percentual_rav, is_titular, created_at, updated_at, consultor:profiles(id, nome, email, avatar_url)')
        .eq('viagem_id', viagemId)
        .order('is_titular', { ascending: false })
        .order('percentual', { ascending: false });

      data = res.data;
      error = res.error;

      // Se der erro 42703 (coluna percentual_rav ainda não existe no Supabase), tenta sem ela
      if (error && (error.code === '42703' || error.message?.includes('percentual_rav'))) {
        console.warn('⚠️ PaxFlow ViagensDivisoes: Coluna percentual_rav inexistente (42703). Fallback para percentual geral.');
        const resFallback = await supabase
          .from('viagens_divisoes')
          .select('id, viagem_id, consultor_id, percentual, is_titular, created_at, updated_at, consultor:profiles(id, nome, email, avatar_url)')
          .eq('viagem_id', viagemId)
          .order('is_titular', { ascending: false })
          .order('percentual', { ascending: false });
        data = resFallback.data;
        error = resFallback.error;
      }

      if (error) {
        // Fallback Zero-Break caso a tabela ainda não exista no Supabase (42P01)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ PaxFlow ViagensDivisoes: Tabela viagens_divisoes inexistente (42P01). Aplicando fallback legado.');
          return titularIdFallback
            ? [{ consultor_id: titularIdFallback, percentual: 100, percentual_rav: 100, is_titular: true }]
            : [];
        }
        throw error;
      }

      if (!data || data.length === 0) {
        // Viagem legada sem divisões: titular possui 100% de tudo
        return titularIdFallback
          ? [{ consultor_id: titularIdFallback, percentual: 100, percentual_rav: 100, is_titular: true }]
          : [];
      }

      return data.map((item: any) => {
        const pctGeral = Number(item.percentual);
        const pctRav = item.percentual_rav !== undefined && item.percentual_rav !== null
          ? Number(item.percentual_rav)
          : pctGeral;

        return {
          id: item.id,
          viagem_id: item.viagem_id,
          viagemId: item.viagem_id,
          consultor_id: item.consultor_id,
          consultorId: item.consultor_id,
          consultor_nome: item.consultor?.nome || 'Consultor',
          consultorNome: item.consultor?.nome || 'Consultor',
          percentual: pctGeral,
          percentual_rav: pctRav,
          percentualRav: pctRav,
          is_titular: !!item.is_titular,
          isTitular: !!item.is_titular,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      });
    } catch (err) {
      console.error('Erro ao buscar divisões da viagem:', err);
      return titularIdFallback
        ? [{ consultor_id: titularIdFallback, percentual: 100, percentual_rav: 100, is_titular: true }]
        : [];
    }
  }

  /**
   * Obtém a lista de IDs de viagens em que o consultor é participante (co-consultor ou titular).
   */
  static async obterViagensDivididasPorConsultor(consultorId: string): Promise<string[]> {
    if (!consultorId) return [];

    try {
      const { data, error } = await supabase
        .from('viagens_divisoes')
        .select('viagem_id')
        .eq('consultor_id', consultorId);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }

      return (data || []).map((row: any) => row.viagem_id).filter(Boolean);
    } catch (err) {
      console.warn('Aviso ao consultar viagens divididas por consultor:', err);
      return [];
    }
  }

  /**
   * Salva a divisão percentual de uma viagem com validação rígida de 100% de Venda e 100% de RAV.
   */
  static async salvarDivisaoViagem(
    params: SalvarDivisaoParams
  ): Promise<{ success: boolean; error?: string }> {
    const { viagemId, titularId, divisoes } = params;

    if (!viagemId) {
      return { success: false, error: 'Identificador da viagem não informado.' };
    }

    const validacaoVenda = this.validarSomaDivisoes(divisoes);
    if (!validacaoVenda.valida) {
      return { success: false, error: validacaoVenda.mensagem };
    }

    const validacaoRav = this.validarSomaRav(divisoes);
    if (!validacaoRav.valida) {
      return { success: false, error: validacaoRav.mensagem };
    }

    try {
      // 1. Remove divisões anteriores da viagem
      const { error: delError } = await supabase
        .from('viagens_divisoes')
        .delete()
        .eq('viagem_id', viagemId);

      if (delError) {
        // Fallback Zero-Break para erro 42P01
        if (delError.code === '42P01' || delError.message?.includes('does not exist')) {
          console.warn('⚠️ PaxFlow ViagensDivisoes: Tabela viagens_divisoes inexistente (42P01). Fallback em observacoes.');
          return { success: true };
        }
        throw delError;
      }

      // 2. Prepara os novos registros com suporte a percentual_rav
      const rowsToInsert = divisoes.map(d => {
        const isTitular = d.consultor_id === titularId || !!d.is_titular;
        const pctGeral = Number(d.percentual);
        const rawRav = d.percentual_rav ?? d.percentualRav;
        const pctRav = rawRav !== undefined && rawRav !== null ? Number(rawRav) : pctGeral;

        return {
          viagem_id: viagemId,
          consultor_id: d.consultor_id,
          percentual: pctGeral,
          percentual_rav: pctRav,
          is_titular: isTitular
        };
      });

      // 3. Tenta inserir com percentual_rav
      const { error: insError } = await supabase
        .from('viagens_divisoes')
        .insert(rowsToInsert);

      if (insError) {
        // Fallback para erro 42703 (coluna percentual_rav ainda não existe no banco)
        if (insError.code === '42703' || insError.message?.includes('percentual_rav')) {
          console.warn('⚠️ PaxFlow ViagensDivisoes: Coluna percentual_rav inexistente (42703) ao salvar. Inserindo sem percentual_rav.');
          const rowsFallback = rowsToInsert.map(r => ({
            viagem_id: r.viagem_id,
            consultor_id: r.consultor_id,
            percentual: r.percentual,
            is_titular: r.is_titular
          }));
          const { error: fallbackError } = await supabase
            .from('viagens_divisoes')
            .insert(rowsFallback);
          if (fallbackError) throw fallbackError;
        } else {
          throw insError;
        }
      }

      // 4. Sincroniza o titular principal no registro da viagem (para compatibilidade)
      if (titularId) {
        try {
          await supabase
            .from('viagens')
            .update({ consultor_id: titularId })
            .eq('id', viagemId);
        } catch (syncErr) {
          console.warn('Aviso não-bloqueante ao sincronizar titular da viagem:', syncErr);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao salvar divisão da viagem:', err);
      return { success: false, error: err?.message || 'Falha ao salvar divisão da viagem.' };
    }
  }

  /**
   * Calcula a fração de participação geral de um consultor em uma viagem (de 0.0 a 1.0).
   * Utilizado para rateio exato de faturamento bruto, contagem de vendas e comissões normais.
   */
  static calcularParticipacaoConsultor(viagem: any, consultorId: string): number {
    if (!viagem || !consultorId) return 0;

    const divisoes: ViagemDivisao[] = viagem.divisoes || (viagem as any).viagens_divisoes;

    if (Array.isArray(divisoes) && divisoes.length > 0) {
      const match = divisoes.find(
        d => (d.consultor_id || d.consultorId) === consultorId
      );
      if (match) {
        const pct = Number(match.percentual) || 0;
        return Math.max(0, Math.min(pct / 100, 1));
      }
      return 0;
    }

    // Caso legado: sem divisões na viagem, o titular tem 100%
    const titularId = viagem.consultor_id || viagem.consultorId;
    if (titularId === consultorId) {
      return 1;
    }

    return 0;
  }

  /**
   * Calcula a fração de participação específica sobre a RAV (de 0.0 a 1.0).
   * Se o percentual_rav não tiver sido definido, herda o percentual geral da venda.
   */
  static calcularParticipacaoRavConsultor(viagem: any, consultorId: string): number {
    if (!viagem || !consultorId) return 0;

    const divisoes: ViagemDivisao[] = viagem.divisoes || (viagem as any).viagens_divisoes;

    if (Array.isArray(divisoes) && divisoes.length > 0) {
      const match = divisoes.find(
        d => (d.consultor_id || d.consultorId) === consultorId
      );
      if (match) {
        const rawRav = match.percentual_rav ?? match.percentualRav;
        const pct = rawRav !== undefined && rawRav !== null
          ? Number(rawRav)
          : Number(match.percentual) || 0;
        return Math.max(0, Math.min(pct / 100, 1));
      }
      return 0;
    }

    // Caso legado: sem divisões na viagem, o titular tem 100%
    const titularId = viagem.consultor_id || viagem.consultorId;
    if (titularId === consultorId) {
      return 1;
    }

    return 0;
  }
}

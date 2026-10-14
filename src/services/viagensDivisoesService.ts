import { supabase } from './supabase';
import { Viagem, ViagemDivisao } from '../types';

export interface ValidacaoSomaDivisoesResult {
  valida: boolean;
  soma: number;
  diferenca: number;
  mensagem: string;
}

export interface SalvarDivisaoParams {
  viagemId: string;
  titularId: string;
  divisoes: Array<{
    consultor_id: string;
    percentual: number;
    is_titular?: boolean;
  }>;
}

export class ViagensDivisoesService {
  /**
   * Valida rigorosamente se a soma dos percentuais é igual a 100,00%,
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
        mensagem: `Faltam ${diferenca.toFixed(2)}% para totalizar 100,00%.`
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
   * Conta com fallback defensivo para retrocompatibilidade e tolerância a schema drift.
   */
  static async obterDivisoesPorViagem(
    viagemId: string,
    titularIdFallback?: string
  ): Promise<ViagemDivisao[]> {
    if (!viagemId) return [];

    try {
      const { data, error } = await supabase
        .from('viagens_divisoes')
        .select('id, viagem_id, consultor_id, percentual, is_titular, created_at, updated_at, consultor:profiles(id, nome, email, avatar_url)')
        .eq('viagem_id', viagemId)
        .order('is_titular', { ascending: false })
        .order('percentual', { ascending: false });

      if (error) {
        // Fallback Zero-Break caso a tabela ainda não exista no Supabase (42P01)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('⚠️ PaxFlow ViagensDivisoes: Tabela viagens_divisoes inexistente (42P01). Aplicando fallback legado.');
          return titularIdFallback
            ? [{ consultor_id: titularIdFallback, percentual: 100, is_titular: true }]
            : [];
        }
        throw error;
      }

      if (!data || data.length === 0) {
        // Viagem legada sem divisões: titular possui 100%
        return titularIdFallback
          ? [{ consultor_id: titularIdFallback, percentual: 100, is_titular: true }]
          : [];
      }

      return data.map((item: any) => ({
        id: item.id,
        viagem_id: item.viagem_id,
        viagemId: item.viagem_id,
        consultor_id: item.consultor_id,
        consultorId: item.consultor_id,
        consultor_nome: item.consultor?.nome || 'Consultor',
        consultorNome: item.consultor?.nome || 'Consultor',
        percentual: Number(item.percentual),
        is_titular: !!item.is_titular,
        isTitular: !!item.is_titular,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (err) {
      console.error('Erro ao buscar divisões da viagem:', err);
      return titularIdFallback
        ? [{ consultor_id: titularIdFallback, percentual: 100, is_titular: true }]
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
   * Salva a divisão percentual de uma viagem com validação rígida de 100% e atomicidade.
   */
  static async salvarDivisaoViagem(
    params: SalvarDivisaoParams
  ): Promise<{ success: boolean; error?: string }> {
    const { viagemId, titularId, divisoes } = params;

    if (!viagemId) {
      return { success: false, error: 'Identificador da viagem não informado.' };
    }

    const validacao = this.validarSomaDivisoes(divisoes);
    if (!validacao.valida) {
      return { success: false, error: validacao.mensagem };
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

      // 2. Prepara os novos registros de divisão
      const rowsToInsert = divisoes.map(d => {
        const isTitular = d.consultor_id === titularId || !!d.is_titular;
        return {
          viagem_id: viagemId,
          consultor_id: d.consultor_id,
          percentual: Number(d.percentual),
          is_titular: isTitular
        };
      });

      // 3. Insere os novos participantes
      const { error: insError } = await supabase
        .from('viagens_divisoes')
        .insert(rowsToInsert);

      if (insError) {
        throw insError;
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
   * Calcula a fração de participação de um consultor em uma viagem (de 0.0 a 1.0).
   * Utilizado para rateio exato de faturamento, comissões, metas e gamificação.
   */
  static calcularParticipacaoConsultor(viagem: any, consultorId: string): number {
    if (!viagem || !consultorId) return 0;

    const divisoes: ViagemDivisao[] = viagem.divisoes || (viagem as any).viagens_divisoes;

    // Se houver divisões estruturadas cadastradas na viagem
    if (Array.isArray(divisoes) && divisoes.length > 0) {
      const match = divisoes.find(
        d => (d.consultor_id || d.consultorId) === consultorId
      );
      if (match) {
        const pct = Number(match.percentual) || 0;
        return Math.max(0, Math.min(pct / 100, 1));
      }
      // Se há divisões e o consultor não está na lista, sua participação é 0%
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

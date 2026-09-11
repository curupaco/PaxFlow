import { supabase } from './supabase';
import { ContatoEmbarqueRegistro } from '../types';

/**
 * Serviço responsável pela persistência e leitura resiliente
 * de contatos de pré-embarque por trecho no Supabase (Fonte Única da Verdade).
 */
export class ContatosEmbarqueService {
  /**
   * Extrai o mapa de contatos da viagem (via coluna nativa ou via observações).
   */
  public static extrairContatos(viagem: any): Record<string, ContatoEmbarqueRegistro> {
    if (!viagem) return {};

    if (
      viagem.contatos_embarque &&
      typeof viagem.contatos_embarque === 'object' &&
      Object.keys(viagem.contatos_embarque).length > 0
    ) {
      return viagem.contatos_embarque;
    }

    if (
      viagem.observacoes &&
      typeof viagem.observacoes === 'string' &&
      viagem.observacoes.includes('[CONTATOS_EMBARQUE]:')
    ) {
      try {
        const match = viagem.observacoes.match(/\[CONTATOS_EMBARQUE\]:\s*(\{.*\})/);
        if (match && match[1]) {
          return JSON.parse(match[1]);
        }
      } catch (e) {
        console.warn('Erro ao parsear contatos_embarque de observações da viagem:', e);
      }
    }

    return viagem.contatos_embarque || {};
  }

  /**
   * Salva os contatos de pré-embarque no Supabase.
   * Tenta primeiro a coluna nativa 'contatos_embarque'. Se ela não existir
   * no schema remoto do Supabase (schema drift 42703), persiste com segurança
   * no campo 'observacoes' da viagem no banco.
   */
  public static async salvarContatos(
    viagemId: string,
    contatos: Record<string, ContatoEmbarqueRegistro>
  ): Promise<boolean> {
    try {
      // 1. Tentar salvar diretamente na coluna nativa contatos_embarque
      const { error } = await supabase
        .from('viagens')
        .update({
          contatos_embarque: contatos,
          updated_at: new Date().toISOString()
        })
        .eq('id', viagemId);

      if (!error) return true;

      // 2. Se a coluna contatos_embarque não existir (erro 42703 ou mensagem 'does not exist'), aplica fallback em observações
      const isMissingColumn =
        (error as any).code === '42703' ||
        (error.message && error.message.includes('column') && error.message.includes('does not exist')) ||
        (error.message && error.message.includes('contatos_embarque'));

      if (isMissingColumn) {
        console.warn(
          'Coluna contatos_embarque não encontrada no banco Supabase. Salvando com segurança em observações da viagem:',
          error.message
        );

        const { data: vData } = await supabase
          .from('viagens')
          .select('observacoes')
          .eq('id', viagemId)
          .single();

        let currentObs = vData?.observacoes || '';
        currentObs = currentObs.replace(/\[CONTATOS_EMBARQUE\]:\s*\{.*\}\n?/g, '').trim();
        const novoObs = `${currentObs}\n[CONTATOS_EMBARQUE]: ${JSON.stringify(contatos)}`.trim();

        const { error: errObs } = await supabase
          .from('viagens')
          .update({
            observacoes: novoObs,
            updated_at: new Date().toISOString()
          })
          .eq('id', viagemId);

        if (errObs) throw errObs;
        return true;
      }

      throw error;
    } catch (err) {
      console.error('Erro ao persistir contatos de pré-embarque:', err);
      throw err;
    }
  }
}

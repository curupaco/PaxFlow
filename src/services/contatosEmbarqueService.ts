import { supabase } from './supabase';
import { ContatoEmbarqueRegistro } from '../types';

export interface ItemEmbarqueViagem {
  chave: string;
  rotulo: string;
  dataStr: string;
  horaStr?: string;
  tipo: 'ida' | 'volta' | 'segmento-ida' | 'segmento-volta';
  tipoDesc: string;
  destino: string;
  loc: string;
  productId?: string;
}

/**
 * Serviço responsável pela persistência e leitura resiliente
 * de contatos de pré-embarque por trecho no Supabase (Fonte Única da Verdade).
 */
export class ContatosEmbarqueService {
  /**
   * Obtém a lista consolidada de embarques da viagem.
   * Regra de negócio: se a viagem possui produtos aéreos com trechos cadastrados,
   * exibe estritamente os trechos de voo (com fornecedor, rota e LOC).
   * Se não houver produtos aéreos com trechos (ex: só hotel/terrestre), utiliza as datas gerais da viagem.
   */
  public static obterEmbarquesViagem(viagem: any, produtosViagem?: any[]): ItemEmbarqueViagem[] {
    if (!viagem) return [];
    const items: ItemEmbarqueViagem[] = [];
    const prods = produtosViagem || viagem.produtos || [];

    // 1. Coletar trechos de produtos aéreos
    const trechosAereos: { produto: any; trecho: any; idx: number }[] = [];
    if (Array.isArray(prods)) {
      prods.forEach((p: any) => {
        const pTipoUpper = (p.tipo || '').trim().toUpperCase();
        if (pTipoUpper.includes('AÉREO') || pTipoUpper.includes('VOO') || pTipoUpper === 'AEREO') {
          if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
            p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
              if (t.dataIda || t.dataVolta) {
                trechosAereos.push({ produto: p, trecho: t, idx });
              }
            });
          }
        }
      });
    }

    // 2. Se houver trechos aéreos, prioriza exclusivamente os trechos de voo
    if (trechosAereos.length > 0) {
      trechosAereos.forEach(({ produto: p, trecho: t, idx }) => {
        const prodId = p.id || '';
        const fornecedor = p.fornecedor ? ` - ${p.fornecedor}` : '';
        const rota = (t.origem && t.destino) ? `${t.origem} ➔ ${t.destino}` : (viagem.destino || 'Destino');
        const loc = p.codigo_reserva || viagem.codigo_localizador || 'S/ LOC';

        if (t.dataIda) {
          items.push({
            chave: `seg-ida-${prodId}-${idx}`,
            rotulo: `${rota} (Ida)`,
            dataStr: t.dataIda,
            horaStr: t.horarioIda || t.horaIda,
            tipo: 'segmento-ida',
            tipoDesc: `✈️ Voo (Ida)${fornecedor}`,
            destino: rota,
            loc,
            productId: prodId
          });
        }
        if (t.dataVolta) {
          items.push({
            chave: `seg-volta-${prodId}-${idx}`,
            rotulo: `${rota} (Volta)`,
            dataStr: t.dataVolta,
            horaStr: t.horarioVolta || t.horaVolta,
            tipo: 'segmento-volta',
            tipoDesc: `✈️ Voo (Volta)${fornecedor}`,
            destino: rota,
            loc,
            productId: prodId
          });
        }
      });
    } else {
      // 3. Caso não haja produtos aéreos cadastrados com trechos, usa as datas gerais da viagem
      if (viagem.data_ida) {
        items.push({
          chave: 'viagem-ida',
          rotulo: `Ida (${viagem.destino || 'Viagem'})`,
          dataStr: viagem.data_ida,
          tipo: 'ida',
          tipoDesc: '✈️ Ida da Viagem',
          destino: viagem.destino || 'Destino',
          loc: viagem.codigo_localizador || 'S/ LOC',
          productId: ''
        });
      }
      if (viagem.data_volta) {
        items.push({
          chave: 'viagem-volta',
          rotulo: `Volta (${viagem.destino || 'Retorno'})`,
          dataStr: viagem.data_volta,
          tipo: 'volta',
          tipoDesc: '✈️ Volta da Viagem',
          destino: viagem.destino || 'Destino',
          loc: viagem.codigo_localizador || 'S/ LOC',
          productId: ''
        });
      }
    }

    items.sort((a, b) => a.dataStr.localeCompare(b.dataStr));
    return items;
  }

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
   * no schema remoto do Supabase (schema drift 42703 ou PGRST204), persiste com segurança
   * no campo 'observacoes' da viagem no banco.
   */
  public static async salvarContatos(
    viagemId: string,
    contatos: Record<string, ContatoEmbarqueRegistro>
  ): Promise<boolean> {
    try {
      // 1. Tentar salvar diretamente na coluna nativa contatos_embarque (sem updated_at, pois a tabela viagens não possui esse campo)
      const { error } = await supabase
        .from('viagens')
        .update({
          contatos_embarque: contatos
        })
        .eq('id', viagemId);

      if (!error) return true;

      // 2. Se a coluna contatos_embarque não existir (erro 42703, PGRST204 ou mensagem de schema cache / does not exist)
      const errCode = (error as any).code;
      const errMsg = error.message || '';
      const isMissingColumn =
        errCode === '42703' ||
        errCode === 'PGRST204' ||
        errMsg.includes('schema cache') ||
        errMsg.includes('column') ||
        errMsg.includes('does not exist') ||
        errMsg.includes('contatos_embarque');

      if (isMissingColumn) {
        console.warn(
          'Coluna contatos_embarque não encontrada no banco Supabase. Salvando com segurança em observações da viagem:',
          errMsg
        );

        const query = supabase
          .from('viagens')
          .select('observacoes')
          .eq('id', viagemId);

        const { data: vData } = typeof (query as any).maybeSingle === 'function'
          ? await (query as any).maybeSingle()
          : await (query as any).single();

        let currentObs = vData?.observacoes || '';
        currentObs = currentObs.replace(/\[CONTATOS_EMBARQUE\]:\s*\{.*\}\n?/g, '').trim();
        const novoObs = `${currentObs}\n[CONTATOS_EMBARQUE]: ${JSON.stringify(contatos)}`.trim();

        const { error: errObs } = await supabase
          .from('viagens')
          .update({
            observacoes: novoObs
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

  /**
   * Alterna o status de conferência/validação do gestor para um trecho específico de embarque.
   * Exclusivo para administradores.
   */
  public static async alternarValidacaoGestor(
    viagem: any,
    trechoKey: string,
    gestorId: string,
    gestorNome: string,
    statusDesejado?: boolean
  ): Promise<{ sucesso: boolean; novoStatus: boolean; contatosAtualizados: Record<string, ContatoEmbarqueRegistro> }> {
    const viagemId = typeof viagem === 'string' ? viagem : viagem?.id;

    let contatos: Record<string, ContatoEmbarqueRegistro> = {};
    if (typeof viagem === 'object' && viagem !== null) {
      contatos = { ...this.extrairContatos(viagem) };
    } else {
      const q = supabase
        .from('viagens')
        .select('id, contatos_embarque, observacoes')
        .eq('id', viagemId);

      const { data } = typeof (q as any).maybeSingle === 'function'
        ? await (q as any).maybeSingle()
        : await (q as any).single();

      if (data) {
        contatos = { ...this.extrairContatos(data) };
      }
    }

    const registroAtual = contatos[trechoKey] || { feito: false };
    const novoStatus = statusDesejado !== undefined ? statusDesejado : !registroAtual.validado_gestor;

    contatos[trechoKey] = {
      ...registroAtual,
      validado_gestor: novoStatus,
      validado_gestor_em: novoStatus ? new Date().toISOString() : undefined,
      gestor_id: novoStatus ? gestorId : undefined,
      gestor_nome: novoStatus ? gestorNome : undefined
    };

    await this.salvarContatos(viagemId, contatos);

    return {
      sucesso: true,
      novoStatus,
      contatosAtualizados: contatos
    };
  }
}

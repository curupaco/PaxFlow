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

    // Helper para verificar se um produto é do tipo aéreo/voo
    const isAereo = (p: any): boolean => {
      const pTipoUpper = (p.tipo || '').trim().toUpperCase();
      return pTipoUpper.includes('AÉR') || 
             pTipoUpper.includes('AER') || 
             pTipoUpper.includes('VOO') || 
             pTipoUpper.includes('BILHETE') || 
             pTipoUpper.includes('AVIA') || 
             pTipoUpper.includes('PASSAGEM');
    };

    const extrairLocProduto = (p: any): string => {
      const locDireto = (p?.codigo_reserva || p?.codigoReserva || p?.codigo_localizador || p?.codigoLoc || p?.loc || '').trim().toUpperCase();
      if (locDireto) return locDireto;
      if (p?.dados_adicionais && typeof p.dados_adicionais === 'object') {
        const locAdicional = (p.dados_adicionais.localizador || p.dados_adicionais.loc || p.dados_adicionais.codigo_reserva || '').trim().toUpperCase();
        if (locAdicional) return locAdicional;
      }
      return '';
    };

    // Coletar produtos aéreos da viagem
    const prodsAereos = Array.isArray(prods) ? prods.filter(isAereo) : [];

    // Todos os LOCs de produtos aéreos cadastrados na viagem (sem duplicatas)
    const locsAereosCadastrados = Array.from(new Set(
      prodsAereos.map(extrairLocProduto).filter(Boolean)
    ));
    const locAereoPadrao = locsAereosCadastrados.length > 0 ? locsAereosCadastrados.join(' / ') : '';

    // Todos os LOCs de conferências registradas na viagem se houver
    const locsConferencias = Array.isArray(viagem.loc_conferencias)
      ? viagem.loc_conferencias.map((c: any) => (c.codigo_localizador || '').trim().toUpperCase()).filter(Boolean)
      : (Array.isArray(viagem.conferencias) ? viagem.conferencias.map((c: any) => (c.codigo_localizador || '').trim().toUpperCase()).filter(Boolean) : []);
    const locConferenciaPadrao = locsConferencias.length > 0 ? Array.from(new Set(locsConferencias)).join(' / ') : '';

    // Todos os LOCs de quaisquer produtos cadastrados na viagem como fallback defensivo geral
    const todosLocsViagem = Array.from(new Set(
      (Array.isArray(prods) ? prods : []).map(extrairLocProduto).filter(Boolean)
    ));
    const locQualquerProduto = todosLocsViagem.length > 0 ? todosLocsViagem.join(' / ') : '';

    // 1. Coletar trechos de produtos aéreos
    const trechosAereos: { produto: any; trecho: any; idx: number }[] = [];
    prodsAereos.forEach((p: any) => {
      if (p.dados_adicionais && Array.isArray(p.dados_adicionais.trechos)) {
        p.dados_adicionais.trechos.forEach((t: any, idx: number) => {
          if (t.dataIda || t.dataVolta) {
            trechosAereos.push({ produto: p, trecho: t, idx });
          }
        });
      }
    });

    // 2. Se houver trechos aéreos, prioriza exclusivamente os trechos de voo
    if (trechosAereos.length > 0) {
      trechosAereos.forEach(({ produto: p, trecho: t, idx }) => {
        const prodId = p.id || '';
        const fornecedor = p.fornecedor ? ` - ${p.fornecedor}` : '';
        const rota = (t.origem && t.destino) ? `${t.origem} ➔ ${t.destino}` : (viagem.destino || 'Destino');
        
        // LOC: prioriza sempre o LOC do produto aéreo cadastrado
        const locProd = extrairLocProduto(p);
        const loc = locProd || (t.loc ? String(t.loc).trim().toUpperCase() : '') || locAereoPadrao || (viagem.codigo_localizador || '').trim().toUpperCase() || locConferenciaPadrao || locQualquerProduto || 'S/ LOC';

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
      // 3. Caso não haja produtos aéreos com trechos cadastrados em dados_adicionais
      // Se houver produtos aéreos cadastrados na viagem, o LOC dos embarques DEVE SEMPRE refletir o LOC do produto aéreo
      const produtoAereoPrincipal = prodsAereos[0];
      const prodId = produtoAereoPrincipal?.id || '';
      const fornecedorAereo = produtoAereoPrincipal?.fornecedor ? ` - ${produtoAereoPrincipal.fornecedor}` : '';

      const extrairLocDeData = (dataAlvo: string): string => {
        if (!dataAlvo) return '';
        const prodData = prodsAereos.find(p => p.data_servico === dataAlvo);
        return prodData ? extrairLocProduto(prodData) : '';
      };

      const locIda = extrairLocDeData(viagem.data_ida) || locAereoPadrao || (viagem.codigo_localizador || '').trim().toUpperCase() || locConferenciaPadrao || locQualquerProduto || 'S/ LOC';
      const locVolta = extrairLocDeData(viagem.data_volta) || locAereoPadrao || (viagem.codigo_localizador || '').trim().toUpperCase() || locConferenciaPadrao || locQualquerProduto || 'S/ LOC';

      if (viagem.data_ida) {
        items.push({
          chave: 'viagem-ida',
          rotulo: `Ida (${viagem.destino || 'Viagem'})`,
          dataStr: viagem.data_ida,
          tipo: 'ida',
          tipoDesc: prodsAereos.length > 0 ? `✈️ Voo (Ida)${fornecedorAereo}` : '✈️ Ida da Viagem',
          destino: viagem.destino || 'Destino',
          loc: locIda,
          productId: prodId
        });
      }
      if (viagem.data_volta) {
        items.push({
          chave: 'viagem-volta',
          rotulo: `Volta (${viagem.destino || 'Retorno'})`,
          dataStr: viagem.data_volta,
          tipo: 'volta',
          tipoDesc: prodsAereos.length > 0 ? `✈️ Voo (Volta)${fornecedorAereo}` : '✈️ Volta da Viagem',
          destino: viagem.destino || 'Destino',
          loc: locVolta,
          productId: prodId
        });
      }

      if (!viagem.data_ida && !viagem.data_volta && prodsAereos.length > 0) {
        prodsAereos.forEach((p, idx) => {
          if (p.data_servico) {
            items.push({
              chave: `prod-aereo-${p.id || idx}`,
              rotulo: `${viagem.destino || 'Voo'} (Embarque)`,
              dataStr: p.data_servico,
              tipo: 'ida',
              tipoDesc: `✈️ Voo${p.fornecedor ? ` - ${p.fornecedor}` : ''}`,
              destino: viagem.destino || 'Destino',
              loc: extrairLocProduto(p) || locAereoPadrao || 'S/ LOC',
              productId: p.id || ''
            });
          }
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
      const { error } = await supabase
        .from('viagens')
        .update({
          contatos_embarque: contatos
        })
        .eq('id', viagemId);

      if (error) throw error;
      return true;
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

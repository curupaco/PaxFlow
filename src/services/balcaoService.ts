import { supabase } from './supabase';
import { EscalaService } from './escalaService';

export interface ResultadoBuscaBalcao {
  cliente: {
    id: string;
    nome: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  };
  orcamentos: Array<{ id: string; titulo: string; consultorNome: string; consultorId: string; data: string; total: string }>;
  viagens: Array<{ id: string; titulo: string; consultorNome: string; consultorId: string; destino: string; status: string }>;
  reembolsos: Array<{ id: string; titulo: string; consultorNome: string; consultorId: string; valor: string; status: string }>;
}

export class BalcaoService {
  /**
   * Realiza busca multicritério (Nome, CPF, Telefone ou E-mail) sanitizada em toda a base
   */
  public static async buscarMulticriterio(query: string): Promise<ResultadoBuscaBalcao[]> {
    if (!query || query.trim().length < 2) return [];

    const rawQuery = query.trim().toLowerCase();
    const cleanDigits = query.replace(/\D/g, '');

    // 0. Tenta invocar a RPC PostgreSQL SECURITY DEFINER (bypasses RLS para consulta de balcão)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('buscar_balcao_co_piloto', { query_text: query });
      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData as ResultadoBuscaBalcao[];
      }
    } catch (e) {
      console.warn('RPC buscar_balcao_co_piloto não disponível, usando fallback cliente:', e);
    }

    const resultadosMap = new Map<string, ResultadoBuscaBalcao>();
    const clientesCacheMap = new Map<string, any>();
    const consultoresMap = new Map<string, string>();

    // Carrega perfis para obter os nomes dos consultores
    try {
      const { data: profs } = await supabase.from('profiles').select('id, nome');
      if (profs) profs.forEach((p: any) => consultoresMap.set(p.id, p.nome));
    } catch (e) {}

    try {
      // 1. Busca Clientes no Supabase
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*');

      if (clientesData && clientesData.length > 0) {
        clientesData.forEach((c: any) => {
          clientesCacheMap.set(c.id, c);

          const cNome = (c.nome || '').toLowerCase();
          const cEmail = (c.email || '').toLowerCase();
          const cDocClean = (c.documento || c.cpf || '').replace(/\D/g, '');
          const cTelClean = (c.telefone || '').replace(/\D/g, '');

          const matchNome = cNome.includes(rawQuery);
          const matchEmail = cEmail && cEmail.includes(rawQuery);
          const matchDoc = cleanDigits.length >= 3 && cDocClean.includes(cleanDigits);
          const matchTel = cleanDigits.length >= 3 && cTelClean.includes(cleanDigits);

          if (matchNome || matchEmail || matchDoc || matchTel) {
            resultadosMap.set(c.id, {
              cliente: {
                id: c.id,
                nome: c.nome || 'Cliente sem nome',
                cpf: c.documento || c.cpf,
                telefone: c.telefone,
                email: c.email
              },
              orcamentos: [],
              viagens: [],
              reembolsos: []
            });
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao buscar clientes via Supabase:', e);
    }

    // 2. Busca Produtos de Viagem correspondentes (por codigo_reserva, fornecedor, descricao ou dados_adicionais)
    const produtosPorViagemMap = new Map<string, Array<any>>();
    try {
      const { data: produtosData } = await supabase
        .from('produtos_viagem')
        .select('id, viagem_id, tipo, fornecedor, descricao, codigo_reserva, dados_adicionais');

      if (produtosData && produtosData.length > 0) {
        produtosData.forEach((p: any) => {
          const pLoc = (p.codigo_reserva || '').toLowerCase();
          const pDesc = (p.descricao || '').toLowerCase();
          const pForn = (p.fornecedor || '').toLowerCase();
          const pDadosStr = p.dados_adicionais ? JSON.stringify(p.dados_adicionais).toLowerCase() : '';

          const matchLoc = pLoc.includes(rawQuery);
          const matchDesc = pDesc.includes(rawQuery);
          const matchForn = pForn.includes(rawQuery);
          const matchDados = pDadosStr.includes(rawQuery);

          if (matchLoc || matchDesc || matchForn || matchDados) {
            if (p.viagem_id) {
              const lista = produtosPorViagemMap.get(p.viagem_id) || [];
              lista.push(p);
              produtosPorViagemMap.set(p.viagem_id, lista);
            }
          }
        });
      }
    } catch (errProd) {
      console.warn('Erro ao buscar produtos_viagem via Supabase:', errProd);
    }

    // 3. Busca Viagens correspondentes
    try {
      const { data: viagensData } = await supabase.from('viagens').select('*');
      if (viagensData && viagensData.length > 0) {
        viagensData.forEach((v: any) => {
          const cId = v.cliente_id;
          const vDestino = (v.destino || '').toLowerCase();
          const vLoc = (v.codigo_localizador || '').toLowerCase();
          const vCodRef = (v.codigo_ref || '').toLowerCase();
          const matchDestino = vDestino.includes(rawQuery);
          const matchLoc = vLoc.includes(rawQuery);
          const matchCodRef = vCodRef.includes(rawQuery);

          const produtosMatches = produtosPorViagemMap.get(v.id) || [];
          const hasProdutoMatch = produtosMatches.length > 0;

          if ((cId && resultadosMap.has(cId)) || matchDestino || matchLoc || matchCodRef || hasProdutoMatch) {
            const cliInfo = cId ? clientesCacheMap.get(cId) : null;
            const key = cId || `viagem-${v.id}`;

            let item = resultadosMap.get(key);
            if (!item) {
              item = {
                cliente: {
                  id: key,
                  nome: cliInfo?.nome || v.nome_cliente || 'Cliente',
                  cpf: cliInfo?.documento || cliInfo?.cpf,
                  telefone: cliInfo?.telefone,
                  email: cliInfo?.email
                },
                orcamentos: [],
                viagens: [],
                reembolsos: []
              };
              resultadosMap.set(key, item);
            }

            let refCodeStr = v.codigo_ref ? `[${v.codigo_ref}] ` : (v.codigo_localizador ? `[LOC ${v.codigo_localizador}] ` : '');
            if (hasProdutoMatch) {
              const pMatch = produtosMatches[0];
              const pLoc = pMatch.codigo_reserva ? `[LOC ${pMatch.codigo_reserva}] ` : '';
              const pTipo = pMatch.tipo ? `${pMatch.tipo}: ` : '';
              refCodeStr = `${pLoc}${pTipo}`;
            }

            item.viagens.push({
              id: v.id,
              titulo: `${refCodeStr}Viagem para ${v.destino || 'Destino'}`,
              consultorNome: consultoresMap.get(v.consultor_id) || 'Agência',
              consultorId: v.consultor_id || '',
              destino: v.destino || 'Destino',
              status: v.status || 'ativa'
            });
          }
        });
      }
    } catch (e) {}

    // 3. Busca Orçamentos correspondentes
    try {
      const { data: orcData } = await supabase.from('orcamentos').select('*');
      if (orcData && orcData.length > 0) {
        orcData.forEach((o: any) => {
          const cId = o.cliente_id;
          const oNomeCli = (o.nome_cliente || '').toLowerCase();
          const oDestino = (o.destino || '').toLowerCase();
          const oCodRef = (o.codigo_ref || '').toLowerCase();
          const oContato = (o.contato || '').toLowerCase();

          const matchNomeCli = oNomeCli.includes(rawQuery);
          const matchDestino = oDestino.includes(rawQuery);
          const matchCodRef = oCodRef.includes(rawQuery);
          const matchContato = oContato.includes(rawQuery);

          if ((cId && resultadosMap.has(cId)) || matchNomeCli || matchDestino || matchCodRef || matchContato) {
            const cliInfo = cId ? clientesCacheMap.get(cId) : null;
            const key = cId || `orc-${o.id}`;

            let item = resultadosMap.get(key);
            if (!item) {
              item = {
                cliente: {
                  id: key,
                  nome: o.nome_cliente || cliInfo?.nome || 'Cliente'
                },
                orcamentos: [],
                viagens: [],
                reembolsos: []
              };
              resultadosMap.set(key, item);
            }

            const val = o.valor_proposta || o.valor_viagem;
            const formattedValor = val ? `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00';
            const refCodeStr = o.codigo_ref ? `[${o.codigo_ref}] ` : '';

            item.orcamentos.push({
              id: o.id,
              titulo: `${refCodeStr}Orçamento ${o.destino || o.nome_cliente || ''}`,
              consultorNome: consultoresMap.get(o.consultor_id) || 'Agência',
              consultorId: o.consultor_id || '',
              data: o.created_at || '',
              total: formattedValor
            });
          }
        });
      }
    } catch (e) {}

    // Deduplica viagens e orçamentos dentro de cada resultado de cliente por ID
    const resultados = Array.from(resultadosMap.values()).map(item => {
      const vMap = new Map<string, any>();
      (item.viagens || []).forEach(v => {
        if (v && v.id && !vMap.has(v.id)) vMap.set(v.id, v);
      });

      const oMap = new Map<string, any>();
      (item.orcamentos || []).forEach(o => {
        if (o && o.id && !oMap.has(o.id)) oMap.set(o.id, o);
      });

      return {
        ...item,
        viagens: Array.from(vMap.values()),
        orcamentos: Array.from(oMap.values())
      };
    });

    return resultados;
  }

  /**
   * Envia uma notificação no Inbox do consultor titular avisando que seu cliente foi atendido no balcão
   */
  public static async gerarAlertaAtendimentoBalcao(
    titularId: string,
    titularNome: string,
    clienteNome: string,
    consultorCoPilotoNome: string,
    tipoItem: string,
    itemId: string,
    coPilotoId?: string
  ): Promise<boolean> {
    try {
      const now = new Date();
      const dataStr = now.toLocaleDateString('pt-BR');
      const horaStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await EscalaService.criarSolicitacao({
        tipo: 'atendimento_balcao', // Modelo unificado de notificação de balcão
        solicitante_id: coPilotoId || titularId,
        solicitante_nome: consultorCoPilotoNome,
        destinatario_id: titularId,
        destinatario_nome: titularNome,
        data_origem: `${dataStr} ${horaStr}`,
        motivo: `🤝 Atendimento Presencial / Balcão: Seu cliente ${clienteNome} foi atendido no balcão por ${consultorCoPilotoNome} em ${dataStr} às ${horaStr}. (Item: ${tipoItem.toUpperCase()} ${itemId})`,
        status: 'aprovado',
        resposta_admin: `Atendimento efetuado em ${dataStr} às ${horaStr}`
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paxflow:new-message'));
        window.dispatchEvent(new CustomEvent('paxflow-inbox-updated'));
      }

      return true;
    } catch (e) {
      console.error('Erro ao gerar alerta de atendimento no balcão:', e);
      return false;
    }
  }
}

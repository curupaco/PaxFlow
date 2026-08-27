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

    try {
      // 1. Busca Clientes no Supabase
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*');

      if (clientesData && clientesData.length > 0) {
        clientesData.forEach((c: any) => {
          const cNome = (c.nome || '').toLowerCase();
          const cEmail = (c.email || '').toLowerCase();
          const cCpfClean = (c.cpf || '').replace(/\D/g, '');
          const cTelClean = (c.telefone || '').replace(/\D/g, '');

          const matchNome = cNome.includes(rawQuery);
          const matchEmail = cEmail && cEmail.includes(rawQuery);
          const matchCpf = cleanDigits.length >= 3 && cCpfClean.includes(cleanDigits);
          const matchTel = cleanDigits.length >= 3 && cTelClean.includes(cleanDigits);

          if (matchNome || matchEmail || matchCpf || matchTel) {
            resultadosMap.set(c.id, {
              cliente: {
                id: c.id,
                nome: c.nome || 'Cliente sem nome',
                cpf: c.cpf,
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

    // 2. Busca Viagens correspondentes
    try {
      const { data: viagensData } = await supabase.from('viagens').select('*');
      if (viagensData && viagensData.length > 0) {
        viagensData.forEach((v: any) => {
          const cId = v.cliente_id;
          const vTitle = (v.titulo || v.nome_viagem || v.destino || '').toLowerCase();
          const matchTitle = vTitle.includes(rawQuery);

          if (resultadosMap.has(cId) || matchTitle) {
            let item = resultadosMap.get(cId);
            if (!item) {
              item = {
                cliente: { id: cId || 'c-' + Date.now(), nome: v.cliente_nome || 'Cliente' },
                orcamentos: [],
                viagens: [],
                reembolsos: []
              };
              resultadosMap.set(item.cliente.id, item);
            }
            item.viagens.push({
              id: v.id,
              titulo: v.titulo || v.nome_viagem || `Viagem para ${v.destino || 'Destino'}`,
              consultorNome: v.consultor_nome || 'Consultor Titular',
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
          const oTitle = (o.titulo_orcamento || o.cliente_nome || '').toLowerCase();
          const matchTitle = oTitle.includes(rawQuery);

          if (resultadosMap.has(cId) || matchTitle) {
            let item = resultadosMap.get(cId);
            if (!item) {
              item = {
                cliente: { id: cId || 'c-' + Date.now(), nome: o.cliente_nome || 'Cliente' },
                orcamentos: [],
                viagens: [],
                reembolsos: []
              };
              resultadosMap.set(item.cliente.id, item);
            }
            item.orcamentos.push({
              id: o.id,
              titulo: o.titulo_orcamento || `Orçamento ${o.codigo_orcamento || ''}`,
              consultorNome: o.consultor_nome || 'Consultor Titular',
              consultorId: o.consultor_id || '',
              data: o.created_at || '',
              total: o.valor_total ? `R$ ${o.valor_total}` : 'R$ 0,00'
            });
          }
        });
      }
    } catch (e) {}

    return Array.from(resultadosMap.values());
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
    itemId: string
  ): Promise<boolean> {
    try {
      const now = new Date();
      const dataStr = now.toLocaleDateString('pt-BR');
      const horaStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await EscalaService.criarSolicitacao({
        tipo: 'atendimento_balcao', // Modelo unificado de notificação de balcão
        solicitante_id: titularId,
        solicitante_nome: consultorCoPilotoNome,
        destinatario_id: titularId,
        destinatario_nome: titularNome,
        data_origem: `${dataStr} ${horaStr}`,
        motivo: `🤝 Atendimento Presencial / Balcão: Seu cliente ${clienteNome} foi atendido no balcão por ${consultorCoPilotoNome} em ${dataStr} às ${horaStr}. (Item: ${tipoItem.toUpperCase()} ${itemId})`,
        status: 'aprovado',
        resposta_admin: `Atendimento efetuado em ${dataStr} às ${horaStr}`
      });

      return true;
    } catch (e) {
      console.error('Erro ao gerar alerta de atendimento no balcão:', e);
      return false;
    }
  }
}

/**
 * campanhasService.ts
 * Motor de Inteligência Comercial e Segmentação de Base para Campanhas e Negociações.
 *
 * Funcionalidades:
 * - Unificação de Viagens Confirmadas e Orçamentos com deduplicação ou visão por oportunidade.
 * - Filtros combinados: Destino (Nacional/Internacional/Multi-termo), Período, Faixa de Valor,
 *   Fornecedor, Sazonalidade (mês de embarque), Status de Orçamento, NPS e Perfil de Passageiros.
 * - Controle de Acesso (RBAC): Consultores veem apenas seus próprios registros e não possuem ações em lote.
 * - Gerenciamento de Presets de Campanha no Supabase com resiliência total a Schema Drift (42P01 / 42703).
 */

import { supabase } from './supabase';

export type OrigemCampanha = 'todos' | 'viagens' | 'orcamentos';
export type TipoVisao = 'oportunidade' | 'cliente_unico';
export type TipoDestino = 'todos' | 'nacional' | 'internacional';

export interface FiltrosCampanha {
  origem: OrigemCampanha;
  tipoVisao: TipoVisao;
  tipoDestino: TipoDestino;
  destinoBusca?: string; // Termo de busca ou múltiplos termos (ex: "Cuba, Cancun")
  periodoMeses?: number; // Ex: 3, 6, 12, 24 ou indefinido para customizado
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD
  valorMinimo?: number;
  valorMaximo?: number;
  fornecedor?: string;
  mesEmbarque?: number; // 1 a 12
  statusOrcamento?: string; // 'TODOS' | 'SOLICITADO' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDO' | 'DESISTENCIA'
  classificacaoNps?: 'todos' | 'promotores' | 'neutros' | 'detratores';
  perfilPassageiro?: 'todos' | 'com_criancas' | 'apenas_adultos';
  consultorId?: string; // Se admin pode filtrar por qualquer consultor; se consultor é travado
  origemLead?: string; // Filtro por canal de captação (ex: 'TODOS', 'WhatsApp', 'Instagram', 'Indicação', etc.)
}

export interface ItemSegmentacaoCampanha {
  id: string;
  registroId: string;
  tipo: 'viagem' | 'orcamento';
  clienteId?: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail?: string;
  destino: string;
  tipoDestino: 'nacional' | 'internacional';
  dataReferencia: string; // Data de criação ou ida
  mesEmbarque?: number;
  valor: number;
  consultorId: string;
  consultorNome: string;
  statusOuEtapa: string;
  fornecedores: string[];
  npsNota?: number;
  npsCategoria?: 'promotor' | 'neutro' | 'detrator';
  qtdPassageiros?: number;
  possuiCriancas?: boolean;
  totalOportunidadesCliente?: number; // Preenchido na visão por cliente único
  origemLead?: string; // Canal de captação do lead/cliente
}

export interface MetricasCampanha {
  totalRegistros: number;
  totalClientesUnicos: number;
  valorTotal: number;
  ticketMedio: number;
  promotoresCount: number;
  neutrosCount: number;
  detratoresCount: number;
}

export interface PresetCampanha {
  id: string;
  nome: string;
  descricao?: string;
  filtros: FiltrosCampanha;
  criadoPor?: string;
  criadoPorNome?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class CampanhasService {
  /**
   * Identifica se um destino é Nacional (Brasil) ou Internacional.
   */
  static classificarTipoDestino(destino: string): 'nacional' | 'internacional' {
    if (!destino) return 'nacional';
    const dest = destino.trim().toLowerCase();
    
    // Lista de termos e estados/cidades nacionais comuns
    const termosBrasil = [
      'brasil', 'br', 'nordeste', 'gramado', 'canela', 'fortaleza', 'natal', 'porto seguro',
      'maceio', 'maceió', 'maragogi', 'salvador', 'rio de janeiro', 'sao paulo', 'são paulo',
      'florianopolis', 'florianópolis', 'foz do iguacu', 'foz do iguaçu', 'jalapao', 'jalapão',
      'bonito', 'fernando de noronha', 'noronha', 'porto de galinhas', 'curitiba', 'manaus',
      'belem', 'belém', 'joao pessoa', 'joão pessoa', 'jericoacoara', 'jeri', 'ilha grande',
      'arraial', 'angra dos reis', 'bh', 'belo horizonte', 'campos do jordao', 'caldas novas'
    ];

    for (const termo of termosBrasil) {
      if (dest.includes(termo)) return 'nacional';
    }

    // Se possui estados brasileiros no final (ex: "Natal/RN", "Porto Seguro - BA")
    const ufs = ['/ac', '/al', '/ap', '/am', '/ba', '/ce', '/df', '/es', '/go', '/ma', '/mt', '/ms', '/mg', '/pa', '/pb', '/pr', '/pe', '/pi', '/rj', '/rn', '/rs', '/ro', '/rr', '/sc', '/sp', '/se', '/to'];
    if (ufs.some(uf => dest.includes(uf) || dest.includes(uf.toUpperCase()))) {
      return 'nacional';
    }

    return 'internacional';
  }

  /**
   * Consolida viagens e orçamentos em uma lista padronizada de segmentação.
   */
  static normalizarDados(
    viagens: any[] = [],
    orcamentos: any[] = [],
    feedbacksNps: any[] = []
  ): ItemSegmentacaoCampanha[] {
    const mapaNpsPorViagem = new Map<string, any>();
    const mapaNpsPorCliente = new Map<string, any>();

    for (const f of feedbacksNps) {
      if (f.viagem_id) mapaNpsPorViagem.set(f.viagem_id, f);
      if (f.cliente_id) mapaNpsPorCliente.set(f.cliente_id, f);
    }

    const resultado: ItemSegmentacaoCampanha[] = [];

    // 1. Viagens
    for (const v of viagens) {
      const fb = (v.id ? mapaNpsPorViagem.get(v.id) : null) || (v.cliente_id || v.clienteId ? mapaNpsPorCliente.get(v.cliente_id || v.clienteId) : null);
      let npsCategoria: 'promotor' | 'neutro' | 'detrator' | undefined = undefined;
      const npsNota = fb ? Number(fb.nota) : (v.nps_nota !== undefined ? Number(v.nps_nota) : undefined);

      if (npsNota !== undefined && !isNaN(npsNota)) {
        if (npsNota >= 9) npsCategoria = 'promotor';
        else if (npsNota >= 7) npsCategoria = 'neutro';
        else npsCategoria = 'detrator';
      }

      // Fornecedores da viagem a partir de produtos_viagem se houver
      const produtos = v.produtos_viagem || v.produtosViagem || [];
      const fornecedores = Array.from(
        new Set(
          produtos
            .map((p: any) => (p.fornecedor || '').trim())
            .filter((f: string) => f.length > 0)
        )
      ) as string[];

      // Extração de data de referência e mês de embarque
      const dataRef = v.data_ida || v.dataIda || v.created_at || v.createdAt || '';
      let mesEmbarque: number | undefined = undefined;
      if (v.data_ida || v.dataIda) {
        const d = new Date(v.data_ida || v.dataIda);
        if (!isNaN(d.getTime())) mesEmbarque = d.getUTCMonth() + 1;
      }

      const destino = v.destino || 'Destino Não Informado';
      const valor = Number(v.valor_total || v.valorTotal || 0);

      // Crianças
      const pass = v.passageiros || [];
      const qtdPass = pass.length || Number(v.numero_passageiros || v.numeroPassageiros || 1);
      const possuiCriancas = pass.some((p: any) => p.tipo === 'CHD' || p.tipo === 'INF' || (p.faixaEtaria && p.faixaEtaria.includes('crianca')));

      // Origem do Lead
      const origemLeadViagem = v.origem || v.cliente?.lead_origin || v.lead_origin || (v.cliente ? v.cliente.origem : '') || 'Não Informada';

      resultado.push({
        id: `viagem-${v.id}`,
        registroId: v.id,
        tipo: 'viagem',
        clienteId: v.cliente_id || v.clienteId,
        clienteNome: v.cliente_nome || v.clienteNome || (v.cliente ? v.cliente.nome : 'Cliente Sem Nome'),
        clienteTelefone: v.cliente_telefone || v.clienteTelefone || (v.cliente ? v.cliente.telefone : ''),
        clienteEmail: v.cliente_email || v.clienteEmail || (v.cliente ? v.cliente.email : ''),
        destino,
        tipoDestino: this.classificarTipoDestino(destino),
        dataReferencia: dataRef,
        mesEmbarque,
        valor,
        consultorId: v.consultor_id || v.consultorId || '',
        consultorNome: v.consultor_nome || v.consultorNome || 'Não Atribuído',
        statusOuEtapa: 'Viagem Fechada',
        fornecedores,
        npsNota,
        npsCategoria,
        qtdPassageiros: qtdPass,
        possuiCriancas,
        origemLead: origemLeadViagem
      });
    }

    // 2. Orçamentos
    for (const o of orcamentos) {
      const fb = o.cliente_id || o.clienteId ? mapaNpsPorCliente.get(o.cliente_id || o.clienteId) : null;
      let npsCategoria: 'promotor' | 'neutro' | 'detrator' | undefined = undefined;
      const npsNota = fb ? Number(fb.nota) : undefined;
      if (npsNota !== undefined && !isNaN(npsNota)) {
        if (npsNota >= 9) npsCategoria = 'promotor';
        else if (npsNota >= 7) npsCategoria = 'neutro';
        else npsCategoria = 'detrator';
      }

      const dataRef = o.data_viagem || o.dataViagem || o.created_at || o.createdAt || '';
      let mesEmbarque: number | undefined = undefined;
      if (o.data_viagem || o.dataViagem) {
        const d = new Date(o.data_viagem || o.dataViagem);
        if (!isNaN(d.getTime())) mesEmbarque = d.getUTCMonth() + 1;
      }

      const destino = o.destino || 'Destino Não Informado';
      const valor = Number(o.valor_viagem || o.valorViagem || o.valor_proposta || o.valorProposta || 0);

      // Status
      let statusOrc = o.status || 'SOLICITADO';
      if (o.sub_status === 'DESISTENCIA' || o.subStatus === 'DESISTENCIA') {
        statusOrc = 'DESISTENCIA';
      }

      // Origem do Lead
      const origemLeadOrc = o.origem || o.cliente?.lead_origin || (o.cliente ? o.cliente.origem : '') || 'Não Informada';

      resultado.push({
        id: `orcamento-${o.id}`,
        registroId: o.id,
        tipo: 'orcamento',
        clienteId: o.cliente_id || o.clienteId,
        clienteNome: o.nome_cliente || o.nomeCliente || 'Lead Sem Nome',
        clienteTelefone: o.contato || o.cliente_telefone || o.clienteTelefone || '',
        clienteEmail: o.cliente_email || o.clienteEmail || '',
        destino,
        tipoDestino: this.classificarTipoDestino(destino),
        dataReferencia: dataRef,
        mesEmbarque,
        valor,
        consultorId: o.consultor_id || o.consultorId || '',
        consultorNome: o.consultor_nome || o.consultorNome || 'Não Atribuído',
        statusOuEtapa: statusOrc,
        fornecedores: [],
        npsNota,
        npsCategoria,
        qtdPassageiros: 1,
        possuiCriancas: false,
        origemLead: origemLeadOrc
      });
    }

    return resultado;
  }

  /**
   * Aplica a matriz de filtros estratégicos sobre os itens normalizados.
   */
  static filtrarItens(
    itens: ItemSegmentacaoCampanha[],
    filtros: FiltrosCampanha,
    usuarioLogado: { id: string; role: string }
  ): ItemSegmentacaoCampanha[] {
    const isAdmin = (usuarioLogado.role || '').toLowerCase() === 'admin';

    return itens.filter(item => {
      // 1. RBAC: Consultor só vê os próprios registros
      if (!isAdmin) {
        if (item.consultorId !== usuarioLogado.id) return false;
      } else if (filtros.consultorId && filtros.consultorId !== 'TODOS') {
        if (item.consultorId !== filtros.consultorId) return false;
      }

      // 2. Origem (Viagens vs Orçamentos)
      if (filtros.origem === 'viagens' && item.tipo !== 'viagem') return false;
      if (filtros.origem === 'orcamentos' && item.tipo !== 'orcamento') return false;

      // 3. Tipo de Destino (Nacional vs Internacional)
      if (filtros.tipoDestino === 'nacional' && item.tipoDestino !== 'nacional') return false;
      if (filtros.tipoDestino === 'internacional' && item.tipoDestino !== 'internacional') return false;

      // 4. Busca por Destino (multi-busca por vírgula ou termo simples)
      if (filtros.destinoBusca && filtros.destinoBusca.trim()) {
        const termos = filtros.destinoBusca
          .toLowerCase()
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        if (termos.length > 0) {
          const destLower = item.destino.toLowerCase();
          const bateuAlgum = termos.some(termo => destLower.includes(termo));
          if (!bateuAlgum) return false;
        }
      }

      // 5. Período / Data
      if (filtros.periodoMeses && filtros.periodoMeses > 0) {
        const limiteData = new Date();
        limiteData.setMonth(limiteData.getMonth() - filtros.periodoMeses);
        const dataItem = new Date(item.dataReferencia);
        if (!isNaN(dataItem.getTime()) && dataItem < limiteData) {
          return false;
        }
      } else {
        if (filtros.dataInicio) {
          const dInicio = new Date(`${filtros.dataInicio}T00:00:00`);
          const dataItem = new Date(item.dataReferencia);
          if (!isNaN(dataItem.getTime()) && dataItem < dInicio) return false;
        }
        if (filtros.dataFim) {
          const dFim = new Date(`${filtros.dataFim}T23:59:59`);
          const dataItem = new Date(item.dataReferencia);
          if (!isNaN(dataItem.getTime()) && dataItem > dFim) return false;
        }
      }

      // 6. Faixa Financeira
      if (filtros.valorMinimo !== undefined && filtros.valorMinimo !== null) {
        if (item.valor < filtros.valorMinimo) return false;
      }
      if (filtros.valorMaximo !== undefined && filtros.valorMaximo !== null) {
        if (item.valor > filtros.valorMaximo) return false;
      }

      // 7. Fornecedor
      if (filtros.fornecedor && filtros.fornecedor.trim()) {
        const fLower = filtros.fornecedor.toLowerCase().trim();
        const temFornecedor = item.fornecedores.some(forn => forn.toLowerCase().includes(fLower));
        if (!temFornecedor) return false;
      }

      // 8. Sazonalidade / Mês de Embarque
      if (filtros.mesEmbarque && filtros.mesEmbarque > 0) {
        if (item.mesEmbarque !== filtros.mesEmbarque) return false;
      }

      // 9. Status de Orçamento
      if (filtros.statusOrcamento && filtros.statusOrcamento !== 'TODOS') {
        if (item.tipo === 'orcamento') {
          if (item.statusOuEtapa !== filtros.statusOrcamento) return false;
        }
      }

      // 10. NPS
      if (filtros.classificacaoNps && filtros.classificacaoNps !== 'todos') {
        if (filtros.classificacaoNps === 'promotores' && item.npsCategoria !== 'promotor') return false;
        if (filtros.classificacaoNps === 'neutros' && item.npsCategoria !== 'neutro') return false;
        if (filtros.classificacaoNps === 'detratores' && item.npsCategoria !== 'detrator') return false;
      }

      // 11. Perfil de Passageiro
      if (filtros.perfilPassageiro && filtros.perfilPassageiro !== 'todos') {
        if (filtros.perfilPassageiro === 'com_criancas' && !item.possuiCriancas) return false;
        if (filtros.perfilPassageiro === 'apenas_adultos' && item.possuiCriancas) return false;
      }

      // 12. Origem do Lead (Canal de captação)
      if (filtros.origemLead && filtros.origemLead !== 'TODOS') {
        const origFiltro = filtros.origemLead.trim().toLowerCase();
        const itemOrigem = (item.origemLead || '').trim().toLowerCase();
        if (!itemOrigem || (!itemOrigem.includes(origFiltro) && !origFiltro.includes(itemOrigem))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Consolida a visão por cliente único quando selecionado pelo gestor.
   */
  static agruparPorCliente(itens: ItemSegmentacaoCampanha[]): ItemSegmentacaoCampanha[] {
    const mapaClientes = new Map<string, ItemSegmentacaoCampanha[]>();

    for (const item of itens) {
      // Chave baseada em clienteId ou telefone ou nome limpo
      const telLimpo = item.clienteTelefone ? item.clienteTelefone.replace(/\D/g, '') : '';
      const nomeLimpo = (item.clienteNome || '').toLowerCase().trim();
      const chave = item.clienteId || telLimpo || nomeLimpo;
      if (!mapaClientes.has(chave)) {
        mapaClientes.set(chave, []);
      }
      mapaClientes.get(chave)!.push(item);
    }

    const unificados: ItemSegmentacaoCampanha[] = [];

    for (const [, grupo] of mapaClientes.entries()) {
      // Ordena pelo mais recente
      grupo.sort((a, b) => new Date(b.dataReferencia).getTime() - new Date(a.dataReferencia).getTime());
      const principal = { ...grupo[0] };

      // Soma financeira de todo o histórico do filtro
      principal.valor = grupo.reduce((acc, curr) => acc + curr.valor, 0);
      principal.totalOportunidadesCliente = grupo.length;

      // Junta destinos distintos
      const destinosDistintos = Array.from(new Set(grupo.map(g => g.destino).filter(Boolean)));
      principal.destino = destinosDistintos.join(', ');

      // Junta fornecedores distintos
      const fornecedoresDistintos = Array.from(
        new Set(grupo.flatMap(g => g.fornecedores).filter(Boolean))
      );
      principal.fornecedores = fornecedoresDistintos;

      // Se qualquer uma das oportunidades tiver crianças
      principal.possuiCriancas = grupo.some(g => g.possuiCriancas);

      // Preserva a origem do lead mais significativa
      const origemEncontrada = grupo.find(g => g.origemLead && g.origemLead !== 'Não Informada')?.origemLead;
      if (origemEncontrada) {
        principal.origemLead = origemEncontrada;
      }

      unificados.push(principal);
    }

    return unificados;
  }

  /**
   * Calcula os KPIs resumidos do grupo segmentado.
   */
  static calcularMetricas(itens: ItemSegmentacaoCampanha[]): MetricasCampanha {
    const totalRegistros = itens.length;
    const clientesSet = new Set<string>();
    let valorTotal = 0;
    let promotoresCount = 0;
    let neutrosCount = 0;
    let detratoresCount = 0;

    for (const it of itens) {
      const telLimpo = it.clienteTelefone ? it.clienteTelefone.replace(/\D/g, '') : '';
      const nomeLimpo = (it.clienteNome || '').toLowerCase().trim();
      const cId = it.clienteId || telLimpo || nomeLimpo;
      if (cId) clientesSet.add(cId);

      valorTotal += it.valor;

      if (it.npsCategoria === 'promotor') promotoresCount++;
      else if (it.npsCategoria === 'neutro') neutrosCount++;
      else if (it.npsCategoria === 'detrator') detratoresCount++;
    }

    const ticketMedio = totalRegistros > 0 ? valorTotal / totalRegistros : 0;

    return {
      totalRegistros,
      totalClientesUnicos: clientesSet.size,
      valorTotal,
      ticketMedio,
      promotoresCount,
      neutrosCount,
      detratoresCount
    };
  }

  /**
   * Salva um modelo de preset no Supabase com resiliência total a Schema Drift (42P01 / 42703).
   */
  static async salvarPreset(
    nome: string,
    filtros: FiltrosCampanha,
    usuario: { id: string; nome: string },
    descricao?: string
  ): Promise<{ sucesso: boolean; preset?: PresetCampanha; aviso?: string }> {
    const payload = {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      filtros,
      criado_por: usuario.id,
      criado_por_nome: usuario.nome
    };

    try {
      const { data, error } = await supabase
        .from('campanhas_presets')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Tabela não criada ainda (42P01) ou Coluna inexistente (42703)
        if (error.code === '42P01' || error.code === '42703') {
          console.warn('[CampanhasService] Schema drift ou tabela campanhas_presets pendente no Supabase. Fallback seguro ativado.');
          const presetVirtual: PresetCampanha = {
            id: `temp-${Date.now()}`,
            nome: payload.nome,
            descricao: payload.descricao || undefined,
            filtros: payload.filtros,
            criadoPor: usuario.id,
            criadoPorNome: usuario.nome,
            createdAt: new Date().toISOString()
          };
          return {
            sucesso: true,
            preset: presetVirtual,
            aviso: 'O modelo foi preparado para a sessão, mas lembre-se de rodar a migração DDL no Supabase para persistência definitiva.'
          };
        }
        throw error;
      }

      return {
        sucesso: true,
        preset: {
          id: data.id,
          nome: data.nome,
          descricao: data.descricao,
          filtros: data.filtros,
          criadoPor: data.criado_por,
          criadoPorNome: data.criado_por_nome,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (err: any) {
      console.warn('[CampanhasService] Falha ao gravar preset no Supabase:', err);
      return {
        sucesso: false,
        aviso: err.message || 'Erro ao persistir modelo no banco de dados.'
      };
    }
  }

  /**
   * Carrega todos os presets do Supabase com fallback seguro caso a tabela ainda não exista.
   */
  static async listarPresets(): Promise<PresetCampanha[]> {
    try {
      const { data, error } = await supabase
        .from('campanhas_presets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.info('[CampanhasService] Tabela campanhas_presets ainda não existe no Supabase. Retornando lista vazia.');
          return [];
        }
        throw error;
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome,
        descricao: d.descricao,
        filtros: d.filtros,
        criadoPor: d.criado_por,
        criadoPorNome: d.criado_por_nome,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    } catch (err) {
      console.warn('[CampanhasService] Erro ao carregar presets:', err);
      return [];
    }
  }

  /**
   * Exclui um preset por ID com tratamento seguro.
   */
  static async excluirPreset(id: string): Promise<boolean> {
    try {
      if (id.startsWith('temp-')) return true;

      const { error } = await supabase
        .from('campanhas_presets')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '42P01') return true;
        console.warn('[CampanhasService] Erro ao excluir preset:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Exporta a lista de itens formatada para CSV.
   */
  static gerarCsv(itens: ItemSegmentacaoCampanha[]): string {
    const colunas = [
      'Tipo',
      'Origem do Lead',
      'Cliente',
      'Telefone',
      'Email',
      'Destino',
      'Tipo Destino',
      'Data Referencia',
      'Mes Embarque',
      'Valor (R$)',
      'Consultor',
      'Status',
      'Fornecedores',
      'Nota NPS',
      'Categoria NPS'
    ];

    const escape = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const linhas = itens.map(i => [
      escape(i.tipo === 'viagem' ? 'Viagem' : 'Orçamento'),
      escape(i.origemLead || 'Não Informada'),
      escape(i.clienteNome),
      escape(i.clienteTelefone),
      escape(i.clienteEmail || ''),
      escape(i.destino),
      escape(i.tipoDestino === 'nacional' ? 'Nacional' : 'Internacional'),
      escape(i.dataReferencia),
      escape(i.mesEmbarque ? String(i.mesEmbarque) : ''),
      escape(i.valor.toFixed(2)),
      escape(i.consultorNome),
      escape(i.statusOuEtapa),
      escape(i.fornecedores.join('; ')),
      escape(i.npsNota !== undefined ? String(i.npsNota) : ''),
      escape(i.npsCategoria || '')
    ].join(';'));

    return [colunas.join(';'), ...linhas].join('\r\n');
  }

  /**
   * Formata lista de contatos em lote para cópia direta para a área de transferência.
   */
  static formatarListaContatosLote(itens: ItemSegmentacaoCampanha[]): string {
    const contatosUnicos = new Map<string, string>();
    for (const it of itens) {
      if (it.clienteTelefone) {
        const limpo = it.clienteTelefone.replace(/\D/g, '');
        if (limpo && !contatosUnicos.has(limpo)) {
          contatosUnicos.set(limpo, `${it.clienteNome} (${it.clienteTelefone}) - Destino: ${it.destino}`);
        }
      }
    }
    return Array.from(contatosUnicos.values()).join('\n');
  }
}

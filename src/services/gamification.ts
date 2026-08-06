import { supabase } from './supabase';

export interface LevelProgress {
  nivel: number;
  xpAtual: number;
  xpProximoNivel: number;
  percent: number;
  patente: string;
  patenteEmoji: string;
}

export interface BadgeDefinition {
  key: string;
  nome: string;
  descricao: string;
  categoria: string;
  emoji: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: 'SLA_CHAMP',
    nome: 'Mestre dos Prazos',
    descricao: 'Manter 30 dias seguidos sem nenhum alerta estourado na Inbox.',
    categoria: 'Operacional',
    emoji: '⏳'
  },
  {
    key: 'DRIVE_MASTER',
    nome: 'Organizador Implacável',
    descricao: 'Fazer upload de documentos em 15 viagens diferentes.',
    categoria: 'Organização',
    emoji: '📁'
  },
  {
    key: 'COMPLIANCE_HERO',
    nome: 'Cadastro Blindado',
    descricao: 'Cadastrar 10 fichas de clientes com CPF/CNPJ válidos sequencialmente.',
    categoria: 'Qualidade de Dados',
    emoji: '🛡️'
  },
  {
    key: 'VOUCHER_EXPERT',
    nome: 'Mestre dos Vouchers',
    descricao: 'Detalhar perfeitamente 10 produtos de viagem (Tarifa + Taxa + Comissão).',
    categoria: 'Financeiro',
    emoji: '✈️'
  },
  {
    key: 'FAST_SALE',
    nome: 'Venda Relâmpago',
    descricao: 'Mover um orçamento para "Aceito" em menos de 24h desde a criação.',
    categoria: 'Performance',
    emoji: '⚡'
  },
  {
    key: 'REFUND_SHIELD',
    nome: 'Guardião do Reembolso',
    descricao: 'Concluir 5 reembolsos no status "Pago" sem estourar o SLA.',
    categoria: 'Financeiro',
    emoji: '💸'
  },
  {
    key: 'GLOBETROTTER',
    nome: 'Desbravador do Globo',
    descricao: 'Cadastrar viagens para 5 continentes ou destinos internacionais distintos.',
    categoria: 'Operacional',
    emoji: '🌍'
  },
  {
    key: 'GROUP_LEADER',
    nome: 'Guia de Excursão',
    descricao: 'Gerenciar com sucesso uma viagem com mais de 5 passageiros vinculados.',
    categoria: 'Operacional',
    emoji: '👥'
  },
  {
    key: 'CALENDAR_PRO',
    nome: 'Senhor da Agenda',
    descricao: 'Agendar 30 lembretes manuais ("Me Lembre Depois") no Mission Control.',
    categoria: 'Organização',
    emoji: '📅'
  },
  {
    key: 'COMMUNICATOR',
    nome: 'Voz da Agência',
    descricao: 'Disparar 50 mensagens automáticas ou manuais de WhatsApp pelo sistema.',
    categoria: 'Comunicação',
    emoji: '💬'
  },
  {
    key: 'TEAM_PLAYER',
    nome: 'Parceiro de Expedição',
    descricao: 'Adicionar 30 comentários ou menções @ nas viagens/orçamentos da equipe.',
    categoria: 'Colaboração',
    emoji: '🤝'
  },
  {
    key: 'HOT_LEAD',
    nome: 'Caçador de Oportunidades',
    descricao: 'Converter 5 leads que estavam marcados com temperatura "Fria" para "Aceito".',
    categoria: 'Performance',
    emoji: '☀️'
  },
  {
    key: 'RECOVERY_PRO',
    nome: 'Fênix do Reembolso',
    descricao: 'Concluir com sucesso um reembolso que estava pendente há mais de 30 dias.',
    categoria: 'Financeiro',
    emoji: '🩹'
  },
  {
    key: 'SAFETY_FIRST',
    nome: 'Embarque Seguro',
    descricao: 'Cadastrar todos os passaportes, vistos e localizadores 30 dias antes do voo.',
    categoria: 'Qualidade de Dados',
    emoji: '🔒'
  },
  {
    key: 'COMMISSION_KING',
    nome: 'Rei da Comissão',
    descricao: 'Faturar mais de R$ 5.000 em comissões em campanhas ativas.',
    categoria: 'Financeiro',
    emoji: '👑'
  },
  {
    key: 'FIRST_CLASS',
    nome: 'Primeira Classe',
    descricao: 'Cadastrar uma venda/viagem com valor superior a R$ 20.000.',
    categoria: 'Performance',
    emoji: '⭐'
  },
  {
    key: 'DISCOUNT_SHIELD',
    nome: 'Negociador Implacável',
    descricao: 'Converter orçamentos sem conceder descontos adicionais.',
    categoria: 'Performance',
    emoji: '🛡️'
  },
  {
    key: 'SLA_LEGEND',
    nome: 'Lenda do SLA',
    descricao: 'Completar metas de processos 100% dentro do SLA.',
    categoria: 'Operacional',
    emoji: '⏳'
  },
  {
    key: 'REVIEW_STAR',
    nome: 'Estrela do Feedback',
    descricao: 'Obter satisfação total dos clientes em atendimentos registrados.',
    categoria: 'Qualidade de Dados',
    emoji: '🌟'
  },
  {
    key: 'CRUISE_CAPTAIN',
    nome: 'Capitão dos Mares',
    descricao: 'Detalhar perfeitamente 5 produtos do tipo Cruzeiro Marítimo.',
    categoria: 'Operacional',
    emoji: '🚢'
  },
  {
    key: 'ROAD_TRIPPER',
    nome: 'Pé na Estrada',
    descricao: 'Detalhar perfeitamente 10 locações de veículos ou passagens de ônibus.',
    categoria: 'Operacional',
    emoji: '🚗'
  },
  {
    key: 'INSURANCE_GUARDIAN',
    nome: 'Protetor do Viajante',
    descricao: 'Adicionar 15 produtos do tipo seguro viagem nas operações.',
    categoria: 'Qualidade de Dados',
    emoji: '🩹'
  },
  {
    key: 'RESORT_LOVER',
    nome: 'Amante de Resort',
    descricao: 'Detalhar perfeitamente 5 produtos do tipo Resort All Inclusive.',
    categoria: 'Operacional',
    emoji: '🏖️'
  },
  {
    key: 'BACKLOG_CLEANER',
    nome: 'Destruidor de Pendências',
    descricao: 'Arquivar ou concluir 50 tarefas no cockpit de planejamento.',
    categoria: 'Organização',
    emoji: '🧹'
  },
  {
    key: 'EARLY_BIRD',
    nome: 'Planejador Antecipado',
    descricao: 'Cadastrar viagens com data de ida superior a 6 meses de antecedência.',
    categoria: 'Organização',
    emoji: '🌅'
  },
  {
    key: 'LAST_MINUTE',
    nome: 'Fechamento Relâmpago',
    descricao: 'Concluir vendas e embarcar o passageiro na mesma semana.',
    categoria: 'Performance',
    emoji: '⏱️'
  },
  {
    key: 'LOYALTY_MAKER',
    nome: 'Fidelizador',
    descricao: 'Cadastrar 3 viagens operacionais diferentes para o mesmo cliente.',
    categoria: 'Qualidade de Dados',
    emoji: '💎'
  },
  {
    key: 'DIRECT_MASTER',
    nome: 'Consultor Conectado',
    descricao: 'Enviar 100 mensagens diretas internas (P2P) para colegas de equipe.',
    categoria: 'Comunicação',
    emoji: '📬'
  },
  {
    key: 'MENTOR',
    nome: 'Mentor da Agência',
    descricao: 'Ser mencionado por outros membros da equipe 10 vezes em notas colaborativas.',
    categoria: 'Colaboração',
    emoji: '🎓'
  },
  {
    key: 'WINTER_EXPLORER',
    nome: 'Desbravador do Gelo',
    descricao: 'Cadastrar 3 viagens para destinos de frio ou neve.',
    categoria: 'Operacional',
    emoji: '❄️'
  },
  {
    key: 'BEACH_BUM',
    nome: 'Rei da Praia',
    descricao: 'Cadastrar 10 viagens para destinos tropicais ou litorâneos.',
    categoria: 'Operacional',
    emoji: '☀️'
  },
  {
    key: 'XP_BOOSTER',
    nome: 'Turbinado de XP',
    descricao: 'Ganhar uma quantidade extraordinária de XP em uma campanha de aceleração.',
    categoria: 'Performance',
    emoji: '🚀'
  },
  {
    key: 'PROCESS_MASTER',
    nome: 'Mestre dos Processos',
    descricao: 'Realizar a conferência financeira completa de 20 produtos de viagem.',
    categoria: 'Financeiro',
    emoji: '🧠'
  },
  {
    key: 'TICKET_RESOLVER',
    nome: 'Solucionador',
    descricao: 'Atender e concluir 10 chamados importados de CSV/Digisac.',
    categoria: 'Organização',
    emoji: '🔧'
  }
];

/**
 * Calcula os limites de XP e patentes com base nas regras do banco de dados:
 * - Nível 1: 0 a 249 XP
 * - Nível 2: 250 a 749 XP
 * - Nível 3: 750 a 1499 XP
 * - Nível 4: 1500 a 2499 XP
 * - Nível 5+: 2500+ XP (Níveis superiores exigem 1000 XP cada)
 */
export function obterProgressoNivel(totalXp: number): LevelProgress {
  let nivel = 1;
  let xpNoNivel = totalXp;
  let xpNecessario = 250;

  if (totalXp < 250) {
    nivel = 1;
    xpNoNivel = totalXp;
    xpNecessario = 250;
  } else if (totalXp < 750) {
    nivel = 2;
    xpNoNivel = totalXp - 250;
    xpNecessario = 500;
  } else if (totalXp < 1500) {
    nivel = 3;
    xpNoNivel = totalXp - 750;
    xpNecessario = 750;
  } else if (totalXp < 2500) {
    nivel = 4;
    xpNoNivel = totalXp - 1500;
    xpNecessario = 1000;
  } else {
    const excedente = totalXp - 2500;
    const niveisExtras = Math.floor(excedente / 1000);
    nivel = 5 + niveisExtras;
    xpNoNivel = excedente % 1000;
    xpNecessario = 1000;
  }

  const percent = Math.min(Math.max((xpNoNivel / xpNecessario) * 100, 0), 100);

  let patente = 'Mochileiro';
  let patenteEmoji = '🎒';
  
  if (nivel >= 20) {
    patente = 'Embaixador do Turismo';
    patenteEmoji = '👑';
  } else if (nivel >= 15) {
    patente = 'Guia de Elite';
    patenteEmoji = '🌟';
  } else if (nivel >= 10) {
    patente = 'Navegador';
    patenteEmoji = '🧭';
  } else if (nivel >= 5) {
    patente = 'Explorador';
    patenteEmoji = '🗺️';
  }

  return { nivel, xpAtual: xpNoNivel, xpProximoNivel: xpNecessario, percent, patente, patenteEmoji };
}

/**
 * Registra um evento de XP para o usuário.
 * Devido ao índice UNIQUE na coluna acao_chave, o Supabase impedirá logs repetidos.
 */
export async function registrarXp(userId: string, acaoChave: string, xpGanho: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles_xp_logs')
      .insert({
        profile_id: userId,
        acao_chave: acaoChave,
        xp_ganho: xpGanho
      });

    // Ignora o erro 23505 (violência de restrição única do Postgres - ação já pontuada antes)
    if (error && error.code !== '23505') {
      console.warn('Erro ao registrar XP no Supabase:', error.message);
    }
  } catch (err) {
    console.error('Erro na chamada registrarXp:', err);
  }
}

/**
 * Obtém a lista de chaves de medalhas conquistadas pelo usuário
 */
export async function obterMedalhasUsuario(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles_badges')
      .select('badge_key')
      .eq('profile_id', userId);

    if (error) throw error;
    return (data || []).map(b => b.badge_key);
  } catch (err) {
    console.error('Erro ao buscar medalhas:', err);
    return [];
  }
}

/**
 * Concede uma medalha/badge para um usuário
 */
export async function concederMedalha(userId: string, badgeKey: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles_badges')
      .insert({
        profile_id: userId,
        badge_key: badgeKey
      });

    if (error) {
      if (error.code === '23505') {
        // Já conquistou a medalha
        return false;
      }
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Erro ao conceder medalha:', err);
    return false;
  }
}

export interface Campaign {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo_meta: 'xp_acumulado' | 'cliente_criado' | 'venda_aceita' | 'lembrete_criado' | 'reembolso_pago' | 'produto_detalhado';
  meta_quantidade: number;
  badge_key: string;
  ativa: boolean;
}

export interface CampaignProgress {
  campaign: Campaign;
  progresso: number;
  meta: number;
  percent: number;
  concluida: boolean;
}

export async function obterCampanhasAtivas(): Promise<Campaign[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('ativa', true)
      .lte('data_inicio', hoje)
      .gte('data_fim', hoje);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar campanhas ativas:', err);
    return [];
  }
}

export async function obterProgressoCampanha(userId: string, campaign: Campaign): Promise<CampaignProgress> {
  const startIso = `${campaign.data_inicio}T00:00:00.000Z`;
  const endIso = `${campaign.data_fim}T23:59:59.999Z`;

  let progresso = 0;

  try {
    if (campaign.tipo_meta === 'xp_acumulado') {
      const { data, error } = await supabase
        .from('profiles_xp_logs')
        .select('xp_ganho')
        .eq('profile_id', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);
      
      if (!error && data) {
        progresso = data.reduce((acc, row) => acc + (row.xp_ganho || 0), 0);
      }
    } else if (campaign.tipo_meta === 'cliente_criado') {
      const { count, error } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_responsavel_id', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);
      
      if (!error && count !== null) {
        progresso = count;
      }
    } else if (campaign.tipo_meta === 'venda_aceita') {
      const { count, error } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', userId)
        .eq('status', 'CONCLUIDO')
        .eq('sub_status', 'ACEITO')
        .gte('updated_at', startIso)
        .lte('updated_at', endIso);
      
      if (!error && count !== null) {
        progresso = count;
      }
    } else if (campaign.tipo_meta === 'lembrete_criado') {
      const { count, error } = await supabase
        .from('lembretes')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);
      
      if (!error && count !== null) {
        progresso = count;
      }
    } else if (campaign.tipo_meta === 'reembolso_pago') {
      const { count, error } = await supabase
        .from('reembolsos')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_solicitante_id', userId)
        .eq('status', 'pago')
        .gte('updated_at', startIso)
        .lte('updated_at', endIso);
      
      if (!error && count !== null) {
        progresso = count;
      }
    } else if (campaign.tipo_meta === 'produto_detalhado') {
      const { data: viagens, error: vErr } = await supabase
        .from('viagens')
        .select('id')
        .eq('consultor_id', userId);
      
      if (!vErr && viagens && viagens.length > 0) {
        const viagemIds = viagens.map(v => v.id);
        const { count, error } = await supabase
          .from('produtos_viagem')
          .select('*', { count: 'exact', head: true })
          .in('viagem_id', viagemIds)
          .gte('created_at', startIso)
          .lte('created_at', endIso);
        
        if (!error && count !== null) {
          progresso = count;
        }
      }
    }
  } catch (err) {
    console.error('Erro ao calcular progresso de campanha:', err);
  }

  const meta = campaign.meta_quantidade;
  const percent = Math.min(Math.max((progresso / meta) * 100, 0), 100);
  const concluida = progresso >= meta;

  return { campaign, progresso, meta, percent, concluida };
}

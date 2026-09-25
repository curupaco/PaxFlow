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
    const { getSessaoAtual } = await import('./supabase');
    const { user } = await getSessaoAtual();
    const activeUserId = user?.id || userId;

    // Ignora se o perfil estiver configurado para não participar de métricas e gamificação
    const { data: profile } = await supabase
      .from('profiles')
      .select('participa_metricas')
      .eq('id', activeUserId)
      .maybeSingle();

    if (profile && profile.participa_metricas === false) {
      return;
    }

    const { error } = await supabase
      .from('profiles_xp_logs')
      .insert({
        profile_id: activeUserId,
        acao_chave: acaoChave,
        xp_ganho: xpGanho
      });

    // Ignora o erro 23505 (violacao de restricao unica do Postgres - ação já pontuada antes) e RLS
    if (error && error.code !== '23505') {
      console.warn('Aviso ao registrar XP no Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Aviso silencioso na chamada registrarXp:', err);
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
    // Ignora se o perfil estiver configurado para não participar de métricas e gamificação
    const { data: profile } = await supabase
      .from('profiles')
      .select('participa_metricas')
      .eq('id', userId)
      .maybeSingle();

    if (profile && profile.participa_metricas === false) {
      return false;
    }

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

export interface GamificationCelebration {
  id: string;
  profile_id: string;
  badge_key: string;
  badge_name: string;
  badge_emoji: string;
  campaign_id?: string | null;
  campaign_titulo: string;
  created_at: string;
  consultor_nome?: string;
}

/**
 * Registra um evento de celebração global quando uma meta é batida ou medalha concedida
 */
export async function registrarCelebracaoConquista(celebration: {
  profile_id: string;
  badge_key: string;
  badge_name: string;
  badge_emoji: string;
  campaign_id?: string | null;
  campaign_titulo: string;
}): Promise<GamificationCelebration | null> {
  try {
    const { data, error } = await supabase
      .from('gamification_celebrations')
      .insert({
        profile_id: celebration.profile_id,
        badge_key: celebration.badge_key,
        badge_name: celebration.badge_name,
        badge_emoji: celebration.badge_emoji,
        campaign_id: celebration.campaign_id || null,
        campaign_titulo: celebration.campaign_titulo
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01' || error.code === '42703') {
        console.warn('Tabela ou coluna de celebração ausente no Supabase (Schema Drift 42P01/42703). Operando com fallback gracioso.');
        return null;
      }
      console.warn('Aviso ao registrar celebração:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Erro silencioso ao registrar celebração:', err);
    return null;
  }
}

/**
 * Sincroniza retroativamente celebrações de metas já batidas por consultores em campanhas ativas
 * Audita o progresso real de todos os consultores no banco e garante concessão de medalhas e celebrações.
 */
export async function sincronizarCelebracoesCampanhasAtivas(): Promise<void> {
  try {
    const campanhas = await obterCampanhasAtivas();
    if (!campanhas || campanhas.length === 0) return;

    // 1. Carregar perfis de consultores cadastrados
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, nome_completo, participa_metricas')
      .eq('ativo', true);

    if (pErr && pErr.code !== '42703') {
      console.warn('Aviso ao carregar perfis para sincronização de metas:', pErr.message);
    }

    const consultores = profiles || [];

    for (const camp of campanhas) {
      if (!camp.badge_key) continue;

      const badgeObj = BADGE_DEFINITIONS.find(def => def.key === camp.badge_key);
      const badgeNome = badgeObj ? badgeObj.nome : camp.badge_key;
      const badgeEmoji = badgeObj ? badgeObj.emoji : '🏆';

      // 2. Buscar celebrações já registradas para esse badge e campanha
      const { data: existingCels, error: cErr } = await supabase
        .from('gamification_celebrations')
        .select('profile_id, badge_key')
        .eq('badge_key', camp.badge_key);

      if (cErr && (cErr.code === '42P01' || cErr.code === '42703')) {
        return;
      }

      const registeredProfileIds = new Set((existingCels || []).map(c => c.profile_id));

      // 3. Avaliar o progresso real de cada consultor
      for (const consultor of consultores) {
        if (consultor.participa_metricas === false) continue;

        const prog = await obterProgressoCampanha(consultor.id, camp);
        if (prog.concluida) {
          // Garante a concessão da medalha no banco
          await concederMedalha(consultor.id, camp.badge_key);

          // Se ainda não gerou celebração global, registra no banco
          if (!registeredProfileIds.has(consultor.id)) {
            await registrarCelebracaoConquista({
              profile_id: consultor.id,
              badge_key: camp.badge_key,
              badge_name: badgeNome,
              badge_emoji: badgeEmoji,
              campaign_id: camp.id,
              campaign_titulo: camp.titulo
            });
            registeredProfileIds.add(consultor.id);
          }
        }
      }

      // 4. Fallback: buscar consultores que já possuem a medalha em profiles_badges
      const { data: badges } = await supabase
        .from('profiles_badges')
        .select('profile_id, badge_key')
        .eq('badge_key', camp.badge_key);

      if (badges && badges.length > 0) {
        for (const b of badges) {
          if (!registeredProfileIds.has(b.profile_id)) {
            await registrarCelebracaoConquista({
              profile_id: b.profile_id,
              badge_key: camp.badge_key,
              badge_name: badgeNome,
              badge_emoji: badgeEmoji,
              campaign_id: camp.id,
              campaign_titulo: camp.titulo
            });
            registeredProfileIds.add(b.profile_id);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao sincronizar celebrações de campanhas ativas:', err);
  }
}

/**
 * Obtém a lista de celebrações de conquistas recentes que o usuário ainda não visualizou
 */
export async function obterCelebracoesPendentes(userId: string): Promise<GamificationCelebration[]> {
  try {
    // Busca celebrações dos últimos 30 dias (cobrindo a vigência das campanhas)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Buscar celebrações recentes
    const { data: celebrations, error: cErr } = await supabase
      .from('gamification_celebrations')
      .select('*, profiles:profile_id(nome_completo)')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (cErr) {
      if (cErr.code === '42P01' || cErr.code === '42703') {
        return [];
      }
      console.warn('Aviso ao buscar celebrações:', cErr.message);
      return [];
    }

    if (!celebrations || celebrations.length === 0) {
      return [];
    }

    // 2. Buscar quais já foram visualizadas por este usuário
    const { data: views, error: vErr } = await supabase
      .from('gamification_celebration_views')
      .select('celebration_id')
      .eq('viewer_profile_id', userId);

    if (vErr && vErr.code !== '42P01' && vErr.code !== '42703') {
      console.warn('Aviso ao buscar views de celebração:', vErr.message);
    }

    const viewedIds = new Set((views || []).map(v => v.celebration_id));

    return celebrations
      .filter(c => !viewedIds.has(c.id))
      .map(c => ({
        id: c.id,
        profile_id: c.profile_id,
        badge_key: c.badge_key,
        badge_name: c.badge_name,
        badge_emoji: c.badge_emoji,
        campaign_id: c.campaign_id,
        campaign_titulo: c.campaign_titulo,
        created_at: c.created_at,
        consultor_nome: (c.profiles as any)?.nome_completo || 'Consultor'
      }));
  } catch (err) {
    console.warn('Erro silencioso ao obter celebrações pendentes:', err);
    return [];
  }
}

/**
 * Marca uma celebração como visualizada pelo usuário no banco de dados
 */
export async function marcarCelebracaoVisualizada(celebrationId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('gamification_celebration_views')
      .insert({
        celebration_id: celebrationId,
        viewer_profile_id: userId
      });

    if (error && error.code !== '23505' && error.code !== '42P01' && error.code !== '42703') {
      console.warn('Aviso ao marcar celebração como visualizada:', error.message);
    }
  } catch (err) {
    console.warn('Erro silencioso ao marcar celebração como visualizada:', err);
  }
}

export interface Campaign {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo_meta: 'xp_acumulado' | 'cliente_criado' | 'venda_aceita' | 'orcamento_criado' | 'orcamento_andamento' | 'orcamento_fechado' | 'lembrete_criado' | 'reembolso_pago' | 'produto_detalhado';
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
    } else if (campaign.tipo_meta === 'orcamento_criado') {
      const { count, error } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);
      
      if (!error && count !== null) {
        progresso = count;
      }
    } else if (campaign.tipo_meta === 'orcamento_andamento') {
      const { count, error } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', userId)
        .in('status', ['EM_ANDAMENTO', 'AGUARDANDO'])
        .gte('updated_at', startIso)
        .lte('updated_at', endIso);
      
      if (!error && count !== null) {
        progresso = count;
      }
    } else if (campaign.tipo_meta === 'venda_aceita' || campaign.tipo_meta === 'orcamento_fechado') {
      const { count, error } = await supabase
        .from('orcamentos')
        .select('*', { count: 'exact', head: true })
        .eq('consultor_id', userId)
        .eq('status', 'CONCLUIDO')
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

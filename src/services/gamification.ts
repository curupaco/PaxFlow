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

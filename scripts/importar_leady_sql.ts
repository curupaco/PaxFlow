import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RegistroClienteLeady {
  chaveUnica: string;
  nome: string;
  consultorLeady: string;
  email: string | null;
  telefone: string | null;
  documentoLimpo: string | null;
  documentoFormatado: string | null;
  primeiroAtendimento: string | null;
  ultimoAtendimento: string | null;
  primeiraCompra: string | null;
  ultimaCompra: string | null;
  rentabilidade: number;
  ticketMedio: number;
  atendimentosTotais: number;
  atendimentosFechados: number;
  loteOrdem: number;
}

export interface ResultadoProcessamentoLeady {
  totalLinhasBrutas: number;
  totalClientesUnicos: number;
  duplicatasMescladas: number;
  consultoresEncontrados: string[];
  clientes: RegistroClienteLeady[];
}

export const ARQUIVOS_CSV_LEADY_PADRAO = [
  '/home/curupaco/.gemini/antigravity/brain/4aed7f1f-47a4-4ab5-8c0b-07beed865d32/.user_uploaded/media_1795270219872_822078bd.csv',
  '/home/curupaco/.gemini/antigravity/brain/4aed7f1f-47a4-4ab5-8c0b-07beed865d32/.user_uploaded/media_1795270219925_d9bbbfbf.csv',
  '/home/curupaco/.gemini/antigravity/brain/4aed7f1f-47a4-4ab5-8c0b-07beed865d32/.user_uploaded/media_1795270219933_43185e75.csv'
];

export const DESTINO_SQL_PADRAO = path.resolve(process.cwd(), 'supabase/seed_carga_leady.sql');

/**
 * Parser robusto para linha CSV delimitada por ponto e vírgula (;) suportando aspas.
 */
export function parseCsvSemicolonLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ';' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseBrNumber(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.trim().replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Higieniza CPF/CNPJ preservando zeros à esquerda omitidos por planilhas (8-11 dígitos = CPF, 12-14 = CNPJ).
 */
export function normalizarDocumentoLeady(rawDoc: string | undefined): { limpo: string | null; formatado: string | null } {
  const digits = (rawDoc || '').replace(/\D/g, '');
  if (digits.length < 8) {
    return { limpo: null, formatado: null };
  }

  if (digits.length <= 11) {
    const cpf = digits.padStart(11, '0');
    const fmt = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
    return { limpo: cpf, formatado: fmt };
  }

  if (digits.length <= 14) {
    const cnpj = digits.padStart(14, '0');
    const fmt = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    return { limpo: cnpj, formatado: fmt };
  }

  return { limpo: digits, formatado: digits };
}

function normalizarTextoChave(val: string): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function escolherPrimeiroValido(candidatos: Array<string | undefined>): string | null {
  for (const item of candidatos) {
    const v = (item || '').trim();
    if (v && v !== '-' && v.toLowerCase() !== 'null') {
      return v;
    }
  }
  return null;
}

function escolherDataMaisAntiga(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function escolherDataMaisRecente(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

/**
 * Processa os múltiplos lotes CSV (em ordem cronológica) aplicando desduplicação
 * com chave mestre CPF/CNPJ (ou Nome + Telefone/E-mail) e precedência do período mais recente.
 */
export function processarConteudosCsvLeady(conteudosCsv: string[]): ResultadoProcessamentoLeady {
  const clientesMap = new Map<string, RegistroClienteLeady>();
  const consultoresSet = new Set<string>();
  let totalLinhasBrutas = 0;
  let duplicatasMescladas = 0;

  conteudosCsv.forEach((conteudo, loteIdx) => {
    const semBom = conteudo.replace(/^\uFEFF/, '');
    const linhas = semBom.split(/\r?\n/);

    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;

      const cols = parseCsvSemicolonLine(linha);
      if (cols.length < 2) continue;

      const nome = (cols[0] || '').trim();
      if (!nome || nome.toLowerCase() === 'nome') continue;

      totalLinhasBrutas++;

      const consultorLeady = (cols[1] || '').trim();
      if (consultorLeady) consultoresSet.add(consultorLeady);

      const emailRaw = escolherPrimeiroValido([cols[2], cols[3], cols[19]]);
      const email = emailRaw ? emailRaw.toLowerCase() : null;
      const telefone = escolherPrimeiroValido([cols[4], cols[5], cols[6]]);
      const { limpo: documentoLimpo, formatado: documentoFormatado } = normalizarDocumentoLeady(cols[7]);

      const primeiroAtendimento = escolherPrimeiroValido([cols[8]]);
      const ultimoAtendimento = escolherPrimeiroValido([cols[9]]);
      const primeiraCompra = escolherPrimeiroValido([cols[10]]);
      const ultimaCompra = escolherPrimeiroValido([cols[11]]);
      const rentabilidade = parseBrNumber(cols[12]);
      const ticketMedio = parseBrNumber(cols[13]);
      const atendimentosTotais = Math.round(parseBrNumber(cols[16]));
      const atendimentosFechados = Math.round(parseBrNumber(cols[17]));

      const telDigits = (telefone || '').replace(/\D/g, '');
      const chaveUnica = documentoLimpo
        ? `CPF:${documentoLimpo}`
        : `NOM:${normalizarTextoChave(nome)}|${telDigits || email || 'SEM_CONTATO'}`;

      const existente = clientesMap.get(chaveUnica);
      if (!existente) {
        clientesMap.set(chaveUnica, {
          chaveUnica,
          nome,
          consultorLeady,
          email,
          telefone,
          documentoLimpo,
          documentoFormatado,
          primeiroAtendimento,
          ultimoAtendimento,
          primeiraCompra,
          ultimaCompra,
          rentabilidade,
          ticketMedio,
          atendimentosTotais,
          atendimentosFechados,
          loteOrdem: loteIdx
        });
      } else {
        duplicatasMescladas++;
        // Precedência para o lote mais recente (loteIdx maior) nos dados cadastrais e consultor
        const usarMaisRecente = loteIdx >= existente.loteOrdem;
        clientesMap.set(chaveUnica, {
          chaveUnica,
          nome: usarMaisRecente && nome.length >= existente.nome.length ? nome : existente.nome,
          consultorLeady: usarMaisRecente && consultorLeady ? consultorLeady : existente.consultorLeady,
          email: usarMaisRecente ? (email || existente.email) : (existente.email || email),
          telefone: usarMaisRecente ? (telefone || existente.telefone) : (existente.telefone || telefone),
          documentoLimpo: existente.documentoLimpo || documentoLimpo,
          documentoFormatado: existente.documentoFormatado || documentoFormatado,
          primeiroAtendimento: escolherDataMaisAntiga(existente.primeiroAtendimento, primeiroAtendimento),
          ultimoAtendimento: escolherDataMaisRecente(existente.ultimoAtendimento, ultimoAtendimento),
          primeiraCompra: escolherDataMaisAntiga(existente.primeiraCompra, primeiraCompra),
          ultimaCompra: escolherDataMaisRecente(existente.ultimaCompra, ultimaCompra),
          rentabilidade: existente.rentabilidade + rentabilidade,
          ticketMedio: ticketMedio > 0 && usarMaisRecente ? ticketMedio : (existente.ticketMedio || ticketMedio),
          atendimentosTotais: existente.atendimentosTotais + atendimentosTotais,
          atendimentosFechados: existente.atendimentosFechados + atendimentosFechados,
          loteOrdem: Math.max(existente.loteOrdem, loteIdx)
        });
      }
    }
  });

  return {
    totalLinhasBrutas,
    totalClientesUnicos: clientesMap.size,
    duplicatasMescladas,
    consultoresEncontrados: Array.from(consultoresSet).sort(),
    clientes: Array.from(clientesMap.values())
  };
}

function sqlString(val: string | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

export function formatarHistoricoLeadyObs(c: RegistroClienteLeady): string {
  const ultCompra = c.ultimaCompra ? c.ultimaCompra.split(' ')[0] : 'N/A';
  const fmtBrl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `[Histórico Leady] Consultor Origem: ${c.consultorLeady || 'Geral'} | Última Compra: ${ultCompra} | Ticket Médio: R$ ${fmtBrl(c.ticketMedio)} | Rentabilidade: R$ ${fmtBrl(c.rentabilidade)} | Fechamentos: ${c.atendimentosFechados}`;
}

/**
 * Gera script SQL transacional (BEGIN ... COMMIT) usando tabela temporária para UPSERT defensivo (COALESCE).
 */
export function gerarSqlCargaLeady(resultado: ResultadoProcessamentoLeady): string {
  const lines: string[] = [];

  lines.push('-- ==============================================================================');
  lines.push('-- SCRIPT UNIFICADO SUPABASE: PACOTE OPERACIONAL + CARGA ÚNICA LEADY (2020-2026)');
  lines.push(`-- Gerado em: ${new Date().toISOString()}`);
  lines.push(`-- Linhas brutas lidas: ${resultado.totalLinhasBrutas} | Clientes únicos consolidados: ${resultado.totalClientesUnicos} | Duplicatas mescladas: ${resultado.duplicatasMescladas}`);
  lines.push(`-- Consultores Leady identificados: ${resultado.consultoresEncontrados.join(', ')}`);
  lines.push('-- Contém:');
  lines.push('--   1. Migração de Orçamentos (SOLICITADO -> EM_ANDAMENTO)');
  lines.push('--   2. Coluna física sla_cruzeiro_pre_embarque_dias em global_settings_table + View/Trigger global_settings');
  lines.push('--   3. Carga desduplicada de clientes históricos do Leady com atualização defensiva (COALESCE)');
  lines.push('-- ==============================================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');
  lines.push('-- 1. MIGRAÇÃO DE ORÇAMENTOS: Unificação do estágio Solicitado em Em Andamento');
  lines.push('UPDATE public.orcamentos');
  lines.push('SET status = \'EM_ANDAMENTO\'');
  lines.push('WHERE UPPER(status) = \'SOLICITADO\';');
  lines.push('');
  lines.push('-- 2. PARÂMETRO DE SLA DE CRUZEIROS (20 DIAS) NA TABELA FÍSICA E VIEW GLOBAL_SETTINGS');
  lines.push('ALTER TABLE IF EXISTS public.global_settings_table');
  lines.push('ADD COLUMN IF NOT EXISTS sla_cruzeiro_pre_embarque_dias INT DEFAULT 20 NOT NULL;');
  lines.push('');
  lines.push('UPDATE public.global_settings_table');
  lines.push('SET sla_cruzeiro_pre_embarque_dias = 20');
  lines.push('WHERE sla_cruzeiro_pre_embarque_dias IS NULL;');
  lines.push('');
  lines.push('DROP VIEW IF EXISTS public.global_settings CASCADE;');
  lines.push('');
  lines.push('CREATE VIEW public.global_settings WITH (security_invoker = true) AS');
  lines.push('SELECT');
  lines.push('    id,');
  lines.push('    agency_name,');
  lines.push('    taxa_cancelamento_padrao,');
  lines.push('    prazo_reembolso_dias,');
  lines.push('    notificacoes_ativas,');
  lines.push('    email_suporte,');
  lines.push('    CASE');
  lines.push('        WHEN (SELECT COALESCE(role, \'consultor\') FROM public.profiles WHERE id = auth.uid()) = \'admin\' THEN google_refresh_token');
  lines.push('        ELSE NULL');
  lines.push('    END AS google_refresh_token,');
  lines.push('    google_parent_folder_id,');
  lines.push('    sla_pre_embarque_dias,');
  lines.push('    sla_cruzeiro_pre_embarque_dias,');
  lines.push('    sla_pos_viagem_dias,');
  lines.push('    limite_upload_mb,');
  lines.push('    enviar_nps_automatico,');
  lines.push('    agency_logo_url,');
  lines.push('    agency_primary_color,');
  lines.push('    copiloto_ativo,');
  lines.push('    permitir_consultor_criar_viagem,');
  lines.push('    CASE');
  lines.push('        WHEN (SELECT COALESCE(role, \'consultor\') FROM public.profiles WHERE id = auth.uid()) = \'admin\' THEN digisac_token');
  lines.push('        ELSE NULL');
  lines.push('    END AS digisac_token,');
  lines.push('    digisac_domain,');
  lines.push('    digisac_service_id,');
  lines.push('    digisac_enable_manual_send,');
  lines.push('    digisac_enable_chat_history,');
  lines.push('    digisac_enable_vouchers,');
  lines.push('    digisac_enable_routing,');
  lines.push('    digisac_enable_bot_triggers,');
  lines.push('    digisac_enable_webhooks,');
  lines.push('    tempo_desistencia_orcamento_dias,');
  lines.push('    antecedencia_risco_operacional_dias,');
  lines.push('    habilitar_risk_score,');
  lines.push('    risk_score_janela_carencia_dias,');
  lines.push('    risk_score_limite_critico,');
  lines.push('    habilitar_next_trip_engine,');
  lines.push('    next_trip_corte_prontidao_alta,');
  lines.push('    next_trip_snooze_dias,');
  lines.push('    habilitar_upsell_preditivo,');
  lines.push('    upsell_config,');
  lines.push('    habilitar_studio_pro,');
  lines.push('    studio_moeda_padrao,');
  lines.push('    studio_validade_dias,');
  lines.push('    studio_permitir_aceite_formal,');
  lines.push('    notificacoes_financeiro_ativas,');
  lines.push('    created_at,');
  lines.push('    updated_at');
  lines.push('FROM public.global_settings_table;');
  lines.push('');
  lines.push('CREATE OR REPLACE FUNCTION public.manage_global_settings_view()');
  lines.push('RETURNS TRIGGER AS $$');
  lines.push('BEGIN');
  lines.push('    IF TG_OP = \'UPDATE\' THEN');
  lines.push('        UPDATE public.global_settings_table');
  lines.push('        SET');
  lines.push('            agency_name = COALESCE(NEW.agency_name, global_settings_table.agency_name),');
  lines.push('            taxa_cancelamento_padrao = COALESCE(NEW.taxa_cancelamento_padrao, global_settings_table.taxa_cancelamento_padrao),');
  lines.push('            prazo_reembolso_dias = COALESCE(NEW.prazo_reembolso_dias, global_settings_table.prazo_reembolso_dias),');
  lines.push('            notificacoes_ativas = COALESCE(NEW.notificacoes_ativas, global_settings_table.notificacoes_ativas),');
  lines.push('            email_suporte = COALESCE(NEW.email_suporte, global_settings_table.email_suporte),');
  lines.push('            google_refresh_token = CASE WHEN NEW.google_refresh_token = \'[MASCARADO]\' THEN global_settings_table.google_refresh_token ELSE COALESCE(NEW.google_refresh_token, global_settings_table.google_refresh_token) END,');
  lines.push('            google_parent_folder_id = COALESCE(NEW.google_parent_folder_id, global_settings_table.google_parent_folder_id),');
  lines.push('            sla_pre_embarque_dias = COALESCE(NEW.sla_pre_embarque_dias, global_settings_table.sla_pre_embarque_dias),');
  lines.push('            sla_cruzeiro_pre_embarque_dias = COALESCE(NEW.sla_cruzeiro_pre_embarque_dias, global_settings_table.sla_cruzeiro_pre_embarque_dias),');
  lines.push('            sla_pos_viagem_dias = COALESCE(NEW.sla_pos_viagem_dias, global_settings_table.sla_pos_viagem_dias),');
  lines.push('            limite_upload_mb = COALESCE(NEW.limite_upload_mb, global_settings_table.limite_upload_mb),');
  lines.push('            enviar_nps_automatico = COALESCE(NEW.enviar_nps_automatico, global_settings_table.enviar_nps_automatico),');
  lines.push('            agency_logo_url = COALESCE(NEW.agency_logo_url, global_settings_table.agency_logo_url),');
  lines.push('            agency_primary_color = COALESCE(NEW.agency_primary_color, global_settings_table.agency_primary_color),');
  lines.push('            copiloto_ativo = COALESCE(NEW.copiloto_ativo, global_settings_table.copiloto_ativo),');
  lines.push('            permitir_consultor_criar_viagem = COALESCE(NEW.permitir_consultor_criar_viagem, global_settings_table.permitir_consultor_criar_viagem),');
  lines.push('            digisac_token = COALESCE(NEW.digisac_token, global_settings_table.digisac_token),');
  lines.push('            digisac_domain = COALESCE(NEW.digisac_domain, global_settings_table.digisac_domain),');
  lines.push('            digisac_service_id = COALESCE(NEW.digisac_service_id, global_settings_table.digisac_service_id),');
  lines.push('            digisac_enable_manual_send = COALESCE(NEW.digisac_enable_manual_send, global_settings_table.digisac_enable_manual_send),');
  lines.push('            digisac_enable_chat_history = COALESCE(NEW.digisac_enable_chat_history, global_settings_table.digisac_enable_chat_history),');
  lines.push('            digisac_enable_vouchers = COALESCE(NEW.digisac_enable_vouchers, global_settings_table.digisac_enable_vouchers),');
  lines.push('            digisac_enable_routing = COALESCE(NEW.digisac_enable_routing, global_settings_table.digisac_enable_routing),');
  lines.push('            digisac_enable_bot_triggers = COALESCE(NEW.digisac_enable_bot_triggers, global_settings_table.digisac_enable_bot_triggers),');
  lines.push('            digisac_enable_webhooks = COALESCE(NEW.digisac_enable_webhooks, global_settings_table.digisac_enable_webhooks),');
  lines.push('            tempo_desistencia_orcamento_dias = COALESCE(NEW.tempo_desistencia_orcamento_dias, global_settings_table.tempo_desistencia_orcamento_dias),');
  lines.push('            antecedencia_risco_operacional_dias = COALESCE(NEW.antecedencia_risco_operacional_dias, global_settings_table.antecedencia_risco_operacional_dias),');
  lines.push('            habilitar_risk_score = COALESCE(NEW.habilitar_risk_score, global_settings_table.habilitar_risk_score),');
  lines.push('            risk_score_janela_carencia_dias = COALESCE(NEW.risk_score_janela_carencia_dias, global_settings_table.risk_score_janela_carencia_dias),');
  lines.push('            risk_score_limite_critico = COALESCE(NEW.risk_score_limite_critico, global_settings_table.risk_score_limite_critico),');
  lines.push('            habilitar_next_trip_engine = COALESCE(NEW.habilitar_next_trip_engine, global_settings_table.habilitar_next_trip_engine),');
  lines.push('            next_trip_corte_prontidao_alta = COALESCE(NEW.next_trip_corte_prontidao_alta, global_settings_table.next_trip_corte_prontidao_alta),');
  lines.push('            next_trip_snooze_dias = COALESCE(NEW.next_trip_snooze_dias, global_settings_table.next_trip_snooze_dias),');
  lines.push('            habilitar_upsell_preditivo = COALESCE(NEW.habilitar_upsell_preditivo, global_settings_table.habilitar_upsell_preditivo),');
  lines.push('            upsell_config = COALESCE(NEW.upsell_config, global_settings_table.upsell_config),');
  lines.push('            habilitar_studio_pro = COALESCE(NEW.habilitar_studio_pro, global_settings_table.habilitar_studio_pro),');
  lines.push('            studio_moeda_padrao = COALESCE(NEW.studio_moeda_padrao, global_settings_table.studio_moeda_padrao),');
  lines.push('            studio_validade_dias = COALESCE(NEW.studio_validade_dias, global_settings_table.studio_validade_dias),');
  lines.push('            studio_permitir_aceite_formal = COALESCE(NEW.studio_permitir_aceite_formal, global_settings_table.studio_permitir_aceite_formal),');
  lines.push('            notificacoes_financeiro_ativas = COALESCE(NEW.notificacoes_financeiro_ativas, global_settings_table.notificacoes_financeiro_ativas),');
  lines.push('            updated_at = NOW()');
  lines.push('        WHERE public.global_settings_table.id = OLD.id;');
  lines.push('        RETURN NEW;');
  lines.push('    ELSIF TG_OP = \'INSERT\' THEN');
  lines.push('        INSERT INTO public.global_settings_table (');
  lines.push('            agency_name, taxa_cancelamento_padrao, prazo_reembolso_dias, notificacoes_ativas,');
  lines.push('            email_suporte, google_refresh_token, google_parent_folder_id, sla_pre_embarque_dias,');
  lines.push('            sla_cruzeiro_pre_embarque_dias, sla_pos_viagem_dias, limite_upload_mb, enviar_nps_automatico,');
  lines.push('            agency_logo_url, agency_primary_color, copiloto_ativo, permitir_consultor_criar_viagem,');
  lines.push('            digisac_token, digisac_domain, digisac_service_id, digisac_enable_manual_send,');
  lines.push('            digisac_enable_chat_history, digisac_enable_vouchers, digisac_enable_routing,');
  lines.push('            digisac_enable_bot_triggers, digisac_enable_webhooks, tempo_desistencia_orcamento_dias,');
  lines.push('            antecedencia_risco_operacional_dias, habilitar_risk_score, risk_score_janela_carencia_dias,');
  lines.push('            risk_score_limite_critico, habilitar_next_trip_engine, next_trip_corte_prontidao_alta,');
  lines.push('            next_trip_snooze_dias, habilitar_upsell_preditivo, upsell_config, habilitar_studio_pro,');
  lines.push('            studio_moeda_padrao, studio_validade_dias, studio_permitir_aceite_formal, notificacoes_financeiro_ativas');
  lines.push('        ) VALUES (');
  lines.push('            COALESCE(NEW.agency_name, \'PaxFlow\'),');
  lines.push('            COALESCE(NEW.taxa_cancelamento_padrao, 0.00),');
  lines.push('            COALESCE(NEW.prazo_reembolso_dias, 30),');
  lines.push('            COALESCE(NEW.notificacoes_ativas, true),');
  lines.push('            COALESCE(NEW.email_suporte, \'suporte@paxflow.com.br\'),');
  lines.push('            NEW.google_refresh_token,');
  lines.push('            NEW.google_parent_folder_id,');
  lines.push('            COALESCE(NEW.sla_pre_embarque_dias, 7),');
  lines.push('            COALESCE(NEW.sla_cruzeiro_pre_embarque_dias, 20),');
  lines.push('            COALESCE(NEW.sla_pos_viagem_dias, 3),');
  lines.push('            COALESCE(NEW.limite_upload_mb, 25),');
  lines.push('            COALESCE(NEW.enviar_nps_automatico, false),');
  lines.push('            NEW.agency_logo_url,');
  lines.push('            COALESCE(NEW.agency_primary_color, \'#4f46e5\'),');
  lines.push('            COALESCE(NEW.copiloto_ativo, true),');
  lines.push('            COALESCE(NEW.permitir_consultor_criar_viagem, false),');
  lines.push('            NEW.digisac_token,');
  lines.push('            NEW.digisac_domain,');
  lines.push('            NEW.digisac_service_id,');
  lines.push('            COALESCE(NEW.digisac_enable_manual_send, true),');
  lines.push('            COALESCE(NEW.digisac_enable_chat_history, true),');
  lines.push('            COALESCE(NEW.digisac_enable_vouchers, true),');
  lines.push('            COALESCE(NEW.digisac_enable_routing, true),');
  lines.push('            COALESCE(NEW.digisac_enable_bot_triggers, true),');
  lines.push('            COALESCE(NEW.digisac_enable_webhooks, true),');
  lines.push('            COALESCE(NEW.tempo_desistencia_orcamento_dias, 30),');
  lines.push('            COALESCE(NEW.antecedencia_risco_operacional_dias, 15),');
  lines.push('            COALESCE(NEW.habilitar_risk_score, true),');
  lines.push('            COALESCE(NEW.risk_score_janela_carencia_dias, 60),');
  lines.push('            COALESCE(NEW.risk_score_limite_critico, 50),');
  lines.push('            COALESCE(NEW.habilitar_next_trip_engine, true),');
  lines.push('            COALESCE(NEW.next_trip_corte_prontidao_alta, 75),');
  lines.push('            COALESCE(NEW.next_trip_snooze_dias, 30),');
  lines.push('            COALESCE(NEW.habilitar_upsell_preditivo, true),');
  lines.push('            COALESCE(NEW.upsell_config, \'{"esim": true, "sala_vip": true, "locacao_veiculo": true, "bagagem_assento": true, "seguro_saude": true, "passes_experiencias": true, "transfer_privativo": true, "upgrade_hotel": true, "cancel_flex": true}\'::jsonb),');
  lines.push('            COALESCE(NEW.habilitar_studio_pro, true),');
  lines.push('            COALESCE(NEW.studio_moeda_padrao, \'BRL\'),');
  lines.push('            COALESCE(NEW.studio_validade_dias, 7),');
  lines.push('            COALESCE(NEW.studio_permitir_aceite_formal, true),');
  lines.push('            COALESCE(NEW.notificacoes_financeiro_ativas, true)');
  lines.push('        )');
  lines.push('        RETURNING * INTO NEW;');
  lines.push('        RETURN NEW;');
  lines.push('    END IF;');
  lines.push('    RETURN NULL;');
  lines.push('END;');
  lines.push('$$ LANGUAGE plpgsql SECURITY DEFINER;');
  lines.push('');
  lines.push('DROP TRIGGER IF EXISTS on_global_settings_view_manage ON public.global_settings;');
  lines.push('CREATE TRIGGER on_global_settings_view_manage');
  lines.push('    INSTEAD OF INSERT OR UPDATE ON public.global_settings');
  lines.push('    FOR EACH ROW EXECUTE FUNCTION public.manage_global_settings_view();');
  lines.push('');
  lines.push('-- 3. CARGA ÚNICA DE CLIENTES HISTÓRICOS DO LEADY');
  lines.push('ALTER TABLE IF EXISTS public.clientes ALTER COLUMN telefone DROP NOT NULL;');
  lines.push('ALTER TABLE IF EXISTS public.clientes ALTER COLUMN email DROP NOT NULL;');
  lines.push('ALTER TABLE IF EXISTS public.clientes ALTER COLUMN documento DROP NOT NULL;');
  lines.push('');
  lines.push('');
  lines.push('CREATE TEMP TABLE tmp_leady_clientes (');
  lines.push('  nome TEXT NOT NULL,');
  lines.push('  consultor_leady TEXT,');
  lines.push('  email TEXT,');
  lines.push('  telefone TEXT,');
  lines.push('  documento_limpo TEXT,');
  lines.push('  documento_formatado TEXT,');
  lines.push('  historico_obs TEXT NOT NULL');
  lines.push(') ON COMMIT DROP;');
  lines.push('');

  const batchSize = 200;
  for (let i = 0; i < resultado.clientes.length; i += batchSize) {
    const batch = resultado.clientes.slice(i, i + batchSize);
    lines.push('INSERT INTO tmp_leady_clientes (nome, consultor_leady, email, telefone, documento_limpo, documento_formatado, historico_obs) VALUES');
    const valuesSql = batch.map((c) => {
      const obs = formatarHistoricoLeadyObs(c);
      return `  (${sqlString(c.nome)}, ${sqlString(c.consultorLeady)}, ${sqlString(c.email)}, ${sqlString(c.telefone)}, ${sqlString(c.documentoLimpo)}, ${sqlString(c.documentoFormatado)}, ${sqlString(obs)})`;
    });
    lines.push(valuesSql.join(',\n') + ';');
    lines.push('');
  }

  lines.push('DO $$');
  lines.push('DECLARE');
  lines.push('  r RECORD;');
  lines.push('  v_existing_id UUID;');
  lines.push('  v_consultor_id UUID;');
  lines.push('  v_termo_consultor TEXT;');
  lines.push('BEGIN');
  lines.push('  FOR r IN SELECT * FROM tmp_leady_clientes LOOP');
  lines.push('    v_consultor_id := NULL;');
  lines.push('');
  lines.push('    -- 1. De-para dinâmico do consultor do Leady para public.profiles');
  lines.push('    IF NULLIF(TRIM(r.consultor_leady), \'\') IS NOT NULL THEN');
  lines.push('      v_termo_consultor := CASE UPPER(TRIM(r.consultor_leady))');
  lines.push('        WHEN \'CADU\' THEN \'cadu\'');
  lines.push('        WHEN \'GUTO\' THEN \'guto\'');
  lines.push('        WHEN \'MALTA\' THEN \'malta\'');
  lines.push('        WHEN \'MARIA\' THEN \'maria\'');
  lines.push('        ELSE LOWER(TRIM(r.consultor_leady))');
  lines.push('      END;');
  lines.push('');
  lines.push('      SELECT p.id INTO v_consultor_id');
  lines.push('      FROM public.profiles p');
  lines.push('      WHERE LOWER(p.nome) LIKE \'%\' || v_termo_consultor || \'%\'');
  lines.push('         OR (UPPER(TRIM(r.consultor_leady)) = \'CADU\' AND LOWER(p.nome) LIKE \'%carlos eduardo%\')');
  lines.push('         OR (UPPER(TRIM(r.consultor_leady)) = \'GUTO\' AND LOWER(p.nome) LIKE \'%augusto%\')');
  lines.push('      ORDER BY COALESCE(p.ativo, TRUE) DESC, p.created_at ASC');
  lines.push('      LIMIT 1;');
  lines.push('    END IF;');
  lines.push('');
  lines.push('    -- 2. Verifica cliente existente no PaxFlow por CPF/CNPJ limpo ou E-mail');
  lines.push('    v_existing_id := NULL;');
  lines.push('    IF r.documento_limpo IS NOT NULL THEN');
  lines.push('      SELECT c.id INTO v_existing_id');
  lines.push('      FROM public.clientes c');
  lines.push('      WHERE lpad(regexp_replace(COALESCE(c.documento, \'\'), \'\\D\', \'\', \'g\'), length(r.documento_limpo), \'0\') = r.documento_limpo');
  lines.push('        AND NULLIF(regexp_replace(COALESCE(c.documento, \'\'), \'\\D\', \'\', \'g\'), \'\') IS NOT NULL');
  lines.push('      LIMIT 1;');
  lines.push('    END IF;');
  lines.push('');
  lines.push('    IF v_existing_id IS NULL AND r.email IS NOT NULL THEN');
  lines.push('      SELECT c.id INTO v_existing_id');
  lines.push('      FROM public.clientes c');
  lines.push('      WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(r.email))');
  lines.push('      LIMIT 1;');
  lines.push('    END IF;');
  lines.push('');
  lines.push('    -- 3. Atualização defensiva (COALESCE) ou Inserção');
  lines.push('    IF v_existing_id IS NOT NULL THEN');
  lines.push('      UPDATE public.clientes');
  lines.push('      SET');
  lines.push('        email = COALESCE(NULLIF(TRIM(email), \'\'), r.email),');
  lines.push('        telefone = COALESCE(NULLIF(TRIM(telefone), \'\'), r.telefone),');
  lines.push('        documento = COALESCE(NULLIF(TRIM(documento), \'\'), r.documento_formatado),');
  lines.push('        consultor_responsavel_id = COALESCE(consultor_responsavel_id, v_consultor_id),');
  lines.push('        observacoes = CASE');
  lines.push('          WHEN COALESCE(observacoes, \'\') NOT LIKE \'%[Histórico Leady]%\' THEN');
  lines.push('            TRIM(BOTH E\'\\n\' FROM COALESCE(observacoes, \'\') || E\'\\n\' || r.historico_obs)');
  lines.push('          ELSE observacoes');
  lines.push('        END,');
  lines.push('        updated_at = NOW()');
  lines.push('      WHERE id = v_existing_id;');
  lines.push('    ELSE');
  lines.push('      INSERT INTO public.clientes (');
  lines.push('        nome,');
  lines.push('        email,');
  lines.push('        telefone,');
  lines.push('        documento,');
  lines.push('        observacoes,');
  lines.push('        consultor_responsavel_id,');
  lines.push('        classificacoes');
  lines.push('      ) VALUES (');
  lines.push('        r.nome,');
  lines.push('        r.email,');
  lines.push('        COALESCE(r.telefone, \'\'),');
  lines.push('        r.documento_formatado,');
  lines.push('        r.historico_obs,');
  lines.push('        v_consultor_id,');
  lines.push('        ARRAY[\'Leady Histórico\']::TEXT[]');
  lines.push('      );');
  lines.push('    END IF;');
  lines.push('  END LOOP;');
  lines.push('END $$;');
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');

  return lines.join('\n');
}

export function executarGeracaoSeedLeady(
  caminhosCsv: string[] = ARQUIVOS_CSV_LEADY_PADRAO,
  caminhoDestinoSql: string = DESTINO_SQL_PADRAO
): ResultadoProcessamentoLeady {
  const conteudos = caminhosCsv.map((p) => fs.readFileSync(p, 'utf8'));
  const resultado = processarConteudosCsvLeady(conteudos);
  const sql = gerarSqlCargaLeady(resultado);
  fs.writeFileSync(caminhoDestinoSql, sql, 'utf8');
  return resultado;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const res = executarGeracaoSeedLeady();
  console.log(`✅ Seed Leady gerada em: ${DESTINO_SQL_PADRAO}`);
  console.log(`• Linhas brutas processadas: ${res.totalLinhasBrutas}`);
  console.log(`• Clientes únicos consolidados: ${res.totalClientesUnicos}`);
  console.log(`• Duplicatas entre lotes mescladas: ${res.duplicatasMescladas}`);
  console.log(`• Consultores encontrados (${res.consultoresEncontrados.length}): ${res.consultoresEncontrados.join(', ')}`);
}


import { supabase } from './supabase';
import { EscalaDiaria, SolicitacaoEscala, BancoFolgasItem, EventoEscalaItem, TurnoConfig } from '../types';
import { formatarDataBR } from '../utils/messageFormatter';
import { PushSenderService } from './pushSenderService';

export function isSameConsultantName(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  const firstA = a.split(' ')[0];
  const firstB = b.split(' ')[0];
  if (firstA === firstB && firstA.length > 1) return true;
  return a.includes(b) || b.includes(a);
}

export const TURNO_PRESETS: TurnoConfig[] = [
  { codigo: '10-17', label: '10:00 - 17:00', corClass: 'c10' },
  { codigo: '12-19', label: '12:00 - 19:00', corClass: 'c12' },
  { codigo: '13-20', label: '13:00 - 20:00', corClass: 'c12' },
  { codigo: '14-21', label: '14:00 - 21:00', corClass: 'c14' },
  { codigo: '15-22', label: '15:00 - 22:00', corClass: 'c15' },
  { codigo: '11-18', label: '11:00 - 18:00', corClass: 'c10' },
  { codigo: 'Folga', label: 'Folga Semanal', corClass: 'folga' },
  { codigo: 'Férias', label: 'Período de Férias', corClass: 'ferias' },
  { codigo: 'Reunião', label: 'Reunião / Evento', corClass: 'event' },
  { codigo: 'F', label: 'Falta / Feriado / Vazio', corClass: 'off' },
];

export interface FeriadoInfo {
  dia: number;
  nome: string;
  tipo: 'nacional' | 'estadual' | 'local';
}

export class EscalaService {
  private static LOCAL_STORAGE_ESCALA_KEY = 'paxflow_escala_diaria_v1';
  private static LOCAL_STORAGE_ESCALA_OBS_KEY = 'paxflow_escala_diaria_obs_v1';
  private static LOCAL_STORAGE_SOLICITACOES_KEY = 'paxflow_escala_solicitacoes_v1';
  private static LOCAL_STORAGE_BANCO_KEY = 'paxflow_escala_banco_folgas_v1';
  private static LOCAL_STORAGE_EVENTOS_KEY = 'paxflow_escala_eventos_v1';
  private static LOCAL_STORAGE_FERIADOS_PLANTOES_KEY = 'paxflow_escala_feriados_plantoes_v1';

  /**
   * Helper que retorna feriados nacionais e estaduais para um mês/ano
   */
  public static getFeriadosDoMes(ano: number, mes: number): Record<number, FeriadoInfo> {
    const feriados: Record<number, FeriadoInfo> = {};

    const fixosNacionais: Record<string, string> = {
      '1-1': 'Confraternização Universal',
      '4-21': 'Tiradentes',
      '5-1': 'Dia do Trabalho',
      '9-7': 'Independência do Brasil',
      '10-12': 'Nsa. Sra. Aparecida',
      '11-2': 'Finados',
      '11-15': 'Proclamação da República',
      '11-20': 'Dia da Consciência Negra',
      '12-25': 'Natal'
    };

    const fixosEstaduais: Record<string, string> = {
      '1-25': 'Aniversário de São Paulo (SP)',
      '4-23': 'Dia de São Jorge (RJ)',
      '7-9': 'Revolução Constitucionalista (SP)'
    };

    const keyPrefix = `${mes}-`;

    Object.entries(fixosNacionais).forEach(([key, nome]) => {
      if (key.startsWith(keyPrefix)) {
        const dia = parseInt(key.split('-')[1], 10);
        feriados[dia] = { dia, nome, tipo: 'nacional' };
      }
    });

    Object.entries(fixosEstaduais).forEach(([key, nome]) => {
      if (key.startsWith(keyPrefix)) {
        const dia = parseInt(key.split('-')[1], 10);
        if (!feriados[dia]) {
          feriados[dia] = { dia, nome, tipo: 'estadual' };
        }
      }
    });

    return feriados;
  }

  /**
   * Helper to get CSS class for a given shift value
   */
  public static getTurnoCls(val: string): string {
    if (!val || val === '-' || val === '—') return 'off';
    const found = TURNO_PRESETS.find(p => p.codigo === val);
    if (found) return found.corClass;
    if (val.startsWith('10') || val.startsWith('11')) return 'c10';
    if (val.startsWith('12') || val.startsWith('13')) return 'c12';
    if (val.startsWith('14')) return 'c14';
    if (val.startsWith('15')) return 'c15';
    if (val.toLowerCase().includes('folga')) return 'folga';
    if (val.toLowerCase().includes('féria')) return 'ferias';
    if (val.toLowerCase().includes('reuniã')) return 'event';
    return 'off';
  }



  /**
   * Fetches full monthly schedule table directly from Supabase
   */
  public static async loadEscalaMensal(ano: number, mes: number): Promise<Record<string, string[]>> {
    let dbLoadedMap: Record<string, string[]> = {};
    let isFromDb = false;

    const daysInMonth = new Date(ano, mes, 0).getDate();
    const monthStr = String(mes).padStart(2, '0');
    const lastDayStr = String(daysInMonth).padStart(2, '0');

    // 1. Obter consultores ativos cadastrados no Supabase (profiles)
    let activeProfilesMap: Map<string, string> = new Map();
    try {
      const { data: profs } = await supabase.from('profiles').select('nome');
      if (profs && profs.length > 0) {
        profs.forEach((p: any) => {
          if (p.nome && p.nome.trim()) {
            activeProfilesMap.set(p.nome.trim().toLowerCase(), p.nome.trim());
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao consultar perfis para a escala:', e);
    }

    // 2. Obter lançamentos da escala_diaria
    try {
      const { data, error } = await supabase
        .from('escala_diaria')
        .select('*')
        .gte('data', `${ano}-${monthStr}-01`)
        .lte('data', `${ano}-${monthStr}-${lastDayStr}`);

      if (!error && data && data.length > 0) {
        isFromDb = true;
        data.forEach((row: any) => {
          const rawName = (row.consultor_nome || 'Consultor').trim();
          const lowerName = rawName.toLowerCase();

          // Ignorar registros de usuários que não existem mais na tabela profiles
          if (activeProfilesMap.size > 0 && !activeProfilesMap.has(lowerName)) {
            return;
          }

          const name = activeProfilesMap.get(lowerName) || rawName;
          if (!dbLoadedMap[name]) {
            dbLoadedMap[name] = new Array(31).fill('');
          }
          const dayNum = parseInt(row.data.split('-')[2], 10) - 1;
          if (dayNum >= 0 && dayNum < 31) {
            dbLoadedMap[name][dayNum] = row.turno_codigo || row.observacao_custom || '';
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao consultar escala no Supabase:', e);
    }

    // Se não houver escala no banco para o mês, popula com consultores reais
    if (!isFromDb || Object.keys(dbLoadedMap).length === 0) {
      if (activeProfilesMap.size > 0) {
        activeProfilesMap.forEach((originalName) => {
          dbLoadedMap[originalName] = new Array(31).fill('10-17');
        });
      } else {
        dbLoadedMap = {};
      }
    }

    // 3. Aplicar ordenação salva no Supabase (setinhas de ordenação)
    const customOrder = await this.loadOrdemConsultores();
    if (customOrder && customOrder.length > 0) {
      const orderedMap: Record<string, string[]> = {};
      customOrder.forEach(name => {
        const matched = Object.keys(dbLoadedMap).find(k => k.trim().toLowerCase() === name.trim().toLowerCase());
        if (matched && dbLoadedMap[matched]) {
          orderedMap[matched] = dbLoadedMap[matched];
        }
      });
      Object.keys(dbLoadedMap).forEach(name => {
        if (!orderedMap[name]) {
          orderedMap[name] = dbLoadedMap[name];
        }
      });
      return orderedMap;
    }

    return dbLoadedMap;
  }

  /**
   * Fetches full monthly schedule comments map directly from Supabase
   */
  public static async loadEscalaComentarios(ano: number, mes: number): Promise<Record<string, string[]>> {
    let dbObsMap: Record<string, string[]> = {};
    const monthStr = String(mes).padStart(2, '0');
    const daysInMonth = new Date(ano, mes, 0).getDate();
    const lastDayStr = String(daysInMonth).padStart(2, '0');

    try {
      const { data, error } = await supabase
        .from('escala_diaria')
        .select('consultor_nome, data, observacao_custom')
        .gte('data', `${ano}-${monthStr}-01`)
        .lte('data', `${ano}-${monthStr}-${lastDayStr}`);

      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          const name = row.consultor_nome || 'Consultor';
          if (!dbObsMap[name]) {
            dbObsMap[name] = new Array(31).fill('');
          }
          const dayNum = parseInt(row.data.split('-')[2], 10) - 1;
          if (dayNum >= 0 && dayNum < 31) {
            dbObsMap[name][dayNum] = row.observacao_custom || '';
          }
        });
      }
    } catch (e) {}

    return dbObsMap;
  }

  public static async loadOrdemConsultores(): Promise<string[]> {
    try {
      // 1. Tentar primeiro na tabela escala_eventos (sem restrição de FK)
      const { data, error } = await supabase
        .from('escala_eventos')
        .select('consultor_nome')
        .eq('titulo', 'CONFIG_ORDEM_ESCALA')
        .maybeSingle();

      if (!error && data && data.consultor_nome) {
        try {
          const parsed = JSON.parse(data.consultor_nome);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }

      // 2. Fallback para registros legados em escala_banco_folgas
      const { data: fData } = await supabase
        .from('escala_banco_folgas')
        .select('detalhes_historico')
        .eq('consultor_nome', 'CONFIG_ORDEM_ESCALA')
        .maybeSingle();

      if (fData && fData.detalhes_historico) {
        try {
          const parsed = JSON.parse(fData.detalhes_historico);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Erro ao carregar ordem dos consultores do Supabase:', e);
    }
    return [];
  }

  public static async salvarOrdemConsultores(ordem: string[]): Promise<boolean> {
    try {
      const configId = '00000000-0000-0000-0000-000000000099';
      const { error } = await supabase
        .from('escala_eventos')
        .upsert({
          id: configId,
          data: '2026-01-01',
          titulo: 'CONFIG_ORDEM_ESCALA',
          consultor_nome: JSON.stringify(ordem)
        });

      if (error) {
        console.error('Erro ao salvar ordem dos consultores no Supabase:', error.message);
        return false;
      }
      this.notifySync();
      return true;
    } catch (e) {
      console.error('Exceção ao salvar ordem dos consultores no Supabase:', e);
      return false;
    }
  }

  /**
   * Save a single day cell edit for a consultant with optional comment
   */
  public static async salvarCelulaEscala(
    ano: number,
    mes: number,
    consultorNome: string,
    diaIndex: number,
    valor: string,
    observacao?: string
  ): Promise<boolean> {
    const dataFormatted = `${ano}-${String(mes).padStart(2, '0')}-${String(diaIndex + 1).padStart(2, '0')}`;

    try {
      const { error } = await supabase
        .from('escala_diaria')
        .upsert({
          consultor_nome: consultorNome,
          data: dataFormatted,
          turno_codigo: valor,
          observacao_custom: observacao || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'consultor_nome,data' });

      if (error) {
        console.warn('Erro ao salvar escala_diaria no Supabase:', error.message);
        return false;
      }
      this.notifySync();
      return true;
    } catch (e) {
      console.error('Erro ao salvar célula da escala:', e);
      return false;
    }
  }

  private static toValidUUID(str: string): string {
    if (!str) return '00000000-0000-4000-8000-000000000001';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      return str;
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const h1 = Math.abs(hash).toString(16).padStart(8, '0');
    const h2 = Math.abs(hash * 31).toString(16).padStart(4, '0').slice(0, 4);
    const h3 = '4' + Math.abs(hash * 17).toString(16).padStart(3, '0').slice(0, 3);
    const h4 = '8' + Math.abs(hash * 13).toString(16).padStart(3, '0').slice(0, 3);
    const h5 = Math.abs(hash * 7).toString(16).padStart(12, '0').slice(0, 12);
    return `${h1}-${h2}-${h3}-${h4}-${h5}`;
  }

  private static notifySync(): void {
  }

  /**
   * Fetch Leave Bank balances (Direct from Supabase)
   */
  public static async loadBancoFolgas(): Promise<BancoFolgasItem[]> {
    try {
      const { data, error } = await supabase.from('escala_banco_folgas').select('*');
      if (!error && data) {
        const clean = (data as BancoFolgasItem[]).filter(b => 
          b.consultor_id !== 'CONFIG_FERIADOS_PLANTOES' && b.consultor_nome !== 'CONFIG_FERIADOS_PLANTOES' &&
          b.consultor_id !== 'CONFIG_ORDEM_ESCALA' && b.consultor_nome !== 'CONFIG_ORDEM_ESCALA'
        );
        return clean;
      }
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao carregar escala_banco_folgas do Supabase:', e);
    }
    return [];
  }

  /**
   * Save / Update Leave Bank item directly to Supabase
   */
  public static async salvarBancoFolgas(items: BancoFolgasItem[]): Promise<boolean> {
    try {
      const payload = items.map(item => {
        const isRealUUID = item.consultor_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.consultor_id) && !item.consultor_id.startsWith('c-');
        return {
          id: this.toValidUUID(item.id || item.consultor_nome),
          consultor_id: isRealUUID ? item.consultor_id : null,
          consultor_nome: item.consultor_nome,
          equipe: item.equipe || 'Equipe Agaxtur',
          saldo_dias: String(item.saldo_dias),
          detalhes_historico: item.detalhes_historico || '',
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase.from('escala_banco_folgas').upsert(payload);
      if (error) {
        console.error('Erro ao salvar escala_banco_folgas no Supabase:', error.message);
        return false;
      }
      this.notifySync();
      return true;
    } catch (e) {
      console.error('Exceção ao salvar escala_banco_folgas no Supabase:', e);
      return false;
    }
  }

  /**
   * Fetch Events directly from Supabase
   */
  public static async loadEventosEscala(): Promise<EventoEscalaItem[]> {
    try {
      const { data, error } = await supabase.from('escala_eventos').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.filter(e => e.titulo && !e.titulo.startsWith('PLANTÃO:')) as EventoEscalaItem[];
      }
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao carregar eventos da escala do Supabase:', e);
    }
    return [];
  }

  /**
   * Add a new Event directly to Supabase
   */
  public static async adicionarEvento(evento: EventoEscalaItem): Promise<boolean> {
    const newId = this.toValidUUID(evento.id || `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
    try {
      const { error } = await supabase.from('escala_eventos').insert({
        id: newId,
        data: evento.data,
        titulo: evento.titulo,
        consultor_nome: evento.consultor_nome
      });

      if (error) {
        console.warn('Erro ao inserir evento no Supabase:', error.message);
        return false;
      }

      this.notifySync();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch Holiday Shifts (Strictly capped at 3 holidays)
   */
  public static async loadFeriadosPlantoes(): Promise<import('../types').FeriadoPlantaoInfo[]> {
    try {
      const { data, error } = await supabase
        .from('escala_eventos')
        .select('*');

      if (!error && data && data.length > 0) {
        const plantaoEvents = data.filter(e => e.titulo && e.titulo.startsWith('PLANTÃO:')).slice(0, 3);
        if (plantaoEvents.length > 0) {
          return plantaoEvents.map(item => {
            const rawTitle = item.titulo.replace(/^PLANTÃO:\s*/, '');
            const consultoresList = item.consultor_nome ? item.consultor_nome.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
            return {
              id: item.id,
              data: item.data,
              nome: rawTitle,
              nomeCurto: rawTitle,
              consultoresTrabalharam: consultoresList
            };
          });
        }
      }
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao carregar feriados/plantões do Supabase:', e);
    }
    return [];
  }

  /**
   * Save / Update Holiday Shifts directly to Supabase (Strictly 3 holidays)
   */
  public static async salvarFeriadosPlantoes(items: import('../types').FeriadoPlantaoInfo[]): Promise<boolean> {
    try {
      const itemsToSave = (items || []).slice(0, 3);
      const payload = itemsToSave.map(fp => ({
        id: this.toValidUUID(fp.id || fp.nome),
        data: fp.data,
        titulo: `PLANTÃO: ${fp.nomeCurto || fp.nome}`,
        consultor_nome: (fp.consultoresTrabalharam || []).join(', ')
      }));

      const { error } = await supabase.from('escala_eventos').upsert(payload);
      if (error) {
        console.warn('Erro ao salvar feriados/plantões no Supabase:', error.message);
        return false;
      }
      this.notifySync();
      return true;
    } catch (e) {
      console.warn('Erro ao salvar feriados/plantões no Supabase:', e);
      return false;
    }
  }

  /**
   * Delete an Event / Training
   */
  public static async deletarEvento(eventoId: string): Promise<boolean> {
    try {
      await supabase.from('escala_eventos').delete().eq('id', eventoId);
      this.notifySync();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Auto-fill an entire month schedule for a consultant in batch with optional comment
   */
  public static async preencherMesEmLote(
    ano: number,
    mes: number,
    consultorNome: string,
    turnoPadrao: string,
    diasFolgaSemanais: number[],
    observacaoLote?: string
  ): Promise<boolean> {
    const daysInMonth = new Date(ano, mes, 0).getDate();
    const rowsToUpsert: any[] = [];
    const valuesArray = new Array(31).fill('');
    const obsArray = new Array(31).fill('');

    for (let dayIdx = 0; dayIdx < daysInMonth; dayIdx++) {
      const dateObj = new Date(ano, mes - 1, dayIdx + 1);
      const dow = dateObj.getDay();
      const valor = diasFolgaSemanais.includes(dow) ? 'Folga' : turnoPadrao;
      valuesArray[dayIdx] = valor;
      obsArray[dayIdx] = observacaoLote || '';

      const dataFormatted = `${ano}-${String(mes).padStart(2, '0')}-${String(dayIdx + 1).padStart(2, '0')}`;
      rowsToUpsert.push({
        consultor_nome: consultorNome,
        data: dataFormatted,
        turno_codigo: valor,
        observacao_custom: observacaoLote || null,
        updated_at: new Date().toISOString()
      });
    }

    // Bulk upsert no Supabase
    try {
      const { error } = await supabase
        .from('escala_diaria')
        .upsert(rowsToUpsert, { onConflict: 'consultor_nome,data' });

      if (error) {
        console.error('Erro ao salvar escala no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Erro ao preencher mês em lote:', e);
      return false;
    }
  }

  /**
   * Fetch all Shift Change / Off requests
   */
  /**
   * Fetch all Shift Change / Off requests directly from Supabase
   */
  public static async loadSolicitacoes(): Promise<SolicitacaoEscala[]> {
    try {
      const { data, error } = await supabase
        .from('escala_solicitacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar solicitações de escala do Supabase:', error.message);
        throw new Error(`Erro ao carregar solicitações: ${error.message}`);
      }

      return (data as SolicitacaoEscala[]) || [];
    } catch (e: any) {
      console.error('Exceção ao carregar solicitações de escala do Supabase:', e);
      throw e;
    }
  }

  /**
   * Create a new Shift Swap or Day Off Request directly in Supabase
   */
  public static async criarSolicitacao(sol: Omit<SolicitacaoEscala, 'id' | 'created_at'>): Promise<SolicitacaoEscala> {
    let uuid = '';
    try {
      uuid = crypto.randomUUID();
    } catch {
      uuid = 'sol-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }

    const newObj: SolicitacaoEscala = {
      ...sol,
      id: uuid,
      created_at: new Date().toISOString()
    };

    const isValidUUID = (val: any) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
    const safeSolicitanteId = isValidUUID(newObj.solicitante_id) ? newObj.solicitante_id : null;
    const safeDestinatarioId = isValidUUID(newObj.destinatario_id) ? newObj.destinatario_id : null;

    const { error } = await supabase.from('escala_solicitacoes').insert({
      id: newObj.id,
      tipo: newObj.tipo,
      solicitante_id: safeSolicitanteId,
      solicitante_nome: newObj.solicitante_nome || 'Consultor',
      destinatario_id: safeDestinatarioId,
      destinatario_nome: newObj.destinatario_nome || null,
      data_origem: newObj.data_origem,
      data_destino: newObj.data_destino || newObj.data_origem,
      motivo: newObj.motivo || '',
      status: newObj.status || 'pendente_admin',
      created_at: newObj.created_at
    });

    if (error) {
      console.error('Erro ao salvar escala_solicitacoes no Supabase:', error.message);
      throw new Error(`Não foi possível enviar a solicitação: ${error.message}`);
    }

    // Criar lembretes na Inbox para garantir que Administradores recebam o alerta em tempo real em qualquer dispositivo
    try {
      if (newObj.status === 'pendente_admin') {
        const { data: adminsData } = await supabase.from('profiles').select('id, role');
        const admins = (adminsData || []).filter(a => (a.role || '').toLowerCase() === 'admin');

        if (admins && admins.length > 0) {
          const tipoLabel = newObj.tipo === 'troca' ? 'Troca de Turno' : newObj.tipo === 'folga' ? 'Folga Semanal' : newObj.tipo === 'ferias' ? 'Férias' : 'Atendimento no Balcão';
          for (const admin of admins) {
            // Dispara Web Push no celular dos administradores
            PushSenderService.sendToUser(admin.id, {
              title: `📅 Solicitação de Escala: ${tipoLabel}`,
              body: `${newObj.solicitante_nome} solicitou ${tipoLabel} (${formatarDataBR(newObj.data_origem)})`,
              url: '/#inbox'
            });
          }
        }
      } else if ((newObj.status === 'pendente_colega' || newObj.status === 'pendente_consultor') && newObj.destinatario_id) {
        const titulo = newObj.status === 'pendente_consultor' ? '🔄 Proposta de Troca de Horário da Gestão' : 'Solicitação de Troca de Turno';
        const desc = newObj.status === 'pendente_consultor' 
          ? `O Administrador ${newObj.solicitante_nome} enviou uma proposta de alteração de escala para ${formatarDataBR(newObj.data_origem)}. ${newObj.motivo ? `Justificativa: ${newObj.motivo}` : ''}`
          : `${newObj.solicitante_nome} solicitou trocar o turno de ${formatarDataBR(newObj.data_origem)} com você.`;

        await supabase.from('lembretes').insert({
          consultor_id: newObj.destinatario_id,
          criador_id: newObj.solicitante_id || null,
          titulo,
          descricao: desc,
          data_lembrete: newObj.data_origem,
          prioridade: 'alta',
          concluido: false,
          created_at: newObj.created_at
        });
        // Dispara Web Push no celular do consultor/colega
        PushSenderService.sendToUser(newObj.destinatario_id, {
          title: titulo,
          body: desc,
          url: '/#inbox'
        });
      }
    } catch (errLembrete) {
      console.warn('Aviso ao sincronizar lembrete da escala:', errLembrete);
    }

    return newObj;
  }

  /**
   * Permite que o consultor solicitante cancele sua própria solicitação se estiver pendente
   */
  public static async cancelarSolicitacao(solicitacaoId: string, userId: string): Promise<boolean> {
    try {
      const { data: target, error: fetchErr } = await supabase
        .from('escala_solicitacoes')
        .select('*')
        .eq('id', solicitacaoId)
        .maybeSingle();

      if (fetchErr || !target) return false;

      if (target.status !== 'pendente_colega' && target.status !== 'pendente_admin') {
        return false;
      }

      const updatedAt = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('escala_solicitacoes')
        .update({
          status: 'recusado',
          resposta_admin: 'Cancelada pelo próprio solicitante',
          updated_at: updatedAt
        })
        .eq('id', solicitacaoId);

      if (updateErr) throw new Error(updateErr.message);

      return true;
    } catch (e) {
      console.error('Erro ao cancelar solicitação no Supabase:', e);
      return false;
    }
  }

  /**
   * Update request status (e.g. Colleague Aceita/Recusa or Admin Aprova/Recusa)
   */
  public static async atualizarStatusSolicitacao(
    solicitacaoId: string,
    novoStatus: 'pendente_admin' | 'aprovado' | 'recusado',
    respostaAdmin?: string,
    adminNome?: string
  ): Promise<{ success: boolean; alreadyProcessed?: boolean; currentStatus?: string; respondidoPor?: string }> {
    let target: SolicitacaoEscala | null = null;

    // Checagem e busca em tempo real no banco de dados
    try {
      const { data: dbCheck, error: dbErr } = await supabase
        .from('escala_solicitacoes')
        .select('*')
        .eq('id', solicitacaoId)
        .maybeSingle();

      if (dbErr || !dbCheck) return { success: false };

      if (dbCheck.status === 'aprovado' || dbCheck.status === 'recusado') {
        return {
          success: false,
          alreadyProcessed: true,
          currentStatus: dbCheck.status,
          respondidoPor: dbCheck.respondido_por || dbCheck.resposta_admin || 'outro Administrador'
        };
      }
      target = dbCheck as SolicitacaoEscala;
    } catch (e) {
      return { success: false };
    }

    if (!target) return { success: false };

    const statusAnterior = target.status;
    const nowIso = new Date().toISOString();
    target.status = novoStatus;
    if (respostaAdmin) target.resposta_admin = respostaAdmin;
    if (adminNome) target.respondido_por = adminNome;
    target.respondido_em = nowIso;
    target.updated_at = nowIso;

    if (novoStatus === 'aprovado') {
      if (target.tipo === 'troca' && target.destinatario_nome && target.data_destino) {
        const [anoOrigem, mesOrigem, diaOrigem] = target.data_origem.split('-').map(Number);
        const [anoDestino, mesDestino, diaDestino] = target.data_destino.split('-').map(Number);

        const diaOrigemIdx = diaOrigem - 1;
        const diaDestinoIdx = diaDestino - 1;

        if (target.solicitante_nome && target.destinatario_nome) {
          const origMap = await this.loadEscalaMensal(anoOrigem, mesOrigem);
          const destMap = (anoOrigem === anoDestino && mesOrigem === mesDestino)
            ? origMap
            : await this.loadEscalaMensal(anoDestino, mesDestino);

          const t1 = origMap[target.solicitante_nome]?.[diaOrigemIdx] || '10-17';
          const t2 = destMap[target.destinatario_nome]?.[diaDestinoIdx] || '10-17';

          await this.salvarCelulaEscala(anoOrigem, mesOrigem, target.solicitante_nome, diaOrigemIdx, t2);
          await this.salvarCelulaEscala(anoDestino, mesDestino, target.destinatario_nome, diaDestinoIdx, t1);
        }
      } else if ((target.tipo === 'folga' || target.tipo === 'ferias') && target.solicitante_nome) {
        const valorTurno = target.tipo === 'folga' ? 'Folga' : 'Férias';
        const dStart = new Date(target.data_origem + 'T00:00:00');
        const dEnd = target.data_destino ? new Date(target.data_destino + 'T00:00:00') : dStart;

        for (let dt = new Date(dStart); dt <= dEnd; dt.setDate(dt.getDate() + 1)) {
          const curAno = dt.getFullYear();
          const curMes = dt.getMonth() + 1;
          const curDiaIdx = dt.getDate() - 1;
          await this.salvarCelulaEscala(curAno, curMes, target.solicitante_nome, curDiaIdx, valorTurno);
        }
      }
    }

    const finalRespostaAdmin = adminNome 
      ? (respostaAdmin && !respostaAdmin.includes(adminNome) ? `${respostaAdmin} (por ${adminNome})` : respostaAdmin || `Respondido por ${adminNome}`)
      : respostaAdmin;

    try {
      const { error: updateErr } = await supabase
        .from('escala_solicitacoes')
        .update({
          status: novoStatus,
          resposta_admin: finalRespostaAdmin,
          updated_at: nowIso
        })
        .eq('id', solicitacaoId);

      if (updateErr) {
        console.error('Erro ao atualizar solicitação no Supabase:', updateErr.message);
        return { success: false };
      }

      const tipoLabel = target.tipo === 'troca' ? 'Troca de Turno' : target.tipo === 'folga' ? 'Folga Semanal' : target.tipo === 'ferias' ? 'Férias' : 'Atendimento no Balcão';

      // 1. Cenário: Gestão aprova ou recusa uma solicitação criada pelo consultor (statusAnterior === 'pendente_admin')
      if (statusAnterior === 'pendente_admin') {
        if (target.solicitante_id) {
          const statusLabel = novoStatus === 'aprovado' ? 'Aprovada ✅' : novoStatus === 'recusado' ? 'Recusada ❌' : 'Atualizada';
          PushSenderService.sendToUser(target.solicitante_id, {
            title: `📅 Resposta da Escala: ${statusLabel}`,
            body: `Sua solicitação de ${tipoLabel.toLowerCase()} para ${formatarDataBR(target.data_origem)} foi ${statusLabel.toLowerCase()} pela gestão.`,
            url: '/#inbox'
          });
        }
      }
      // 2. Cenário: Consultor responde a uma proposta enviada pela gestão (statusAnterior === 'pendente_consultor')
      else if (statusAnterior === 'pendente_consultor') {
        const { data: allProfs } = await supabase.from('profiles').select('id, role');
        const admins = (allProfs || []).filter(a => (a.role || '').toLowerCase() === 'admin');
        if (admins && admins.length > 0) {
          const consultorNome = target.destinatario_nome || target.solicitante_nome || 'Consultor';
          const acaoLabel = novoStatus === 'aprovado' ? 'ACEITOU' : 'RECUSOU';

          for (const admin of admins) {
            PushSenderService.sendToUser(admin.id, {
              title: `🔄 Retorno de Proposta: ${consultorNome}`,
              body: `O consultor ${consultorNome} ${acaoLabel} a proposta de alteração de escala para ${formatarDataBR(target.data_origem)}.`,
              url: '/#inbox'
            });
          }
        }
      }
      // 3. Cenário: Colega responde solicitação de troca (statusAnterior === 'pendente_colega')
      else if (statusAnterior === 'pendente_colega') {
        if (novoStatus === 'pendente_admin') {
          // Colega aceitou a troca -> notifica Admins para aprovação final da gestão
          const { data: allProfs } = await supabase.from('profiles').select('id, role');
          const admins = (allProfs || []).filter(a => (a.role || '').toLowerCase() === 'admin');
          if (admins && admins.length > 0) {
            for (const admin of admins) {
              PushSenderService.sendToUser(admin.id, {
                title: `📅 Troca de Escala Aceita pelo Colega`,
                body: `${target.destinatario_nome || 'O colega'} aceitou trocar o turno com ${target.solicitante_nome} (${formatarDataBR(target.data_origem)}). Aguardando aprovação da gestão.`,
                url: '/#inbox'
              });
            }
          }
        } else if (novoStatus === 'recusado' && target.solicitante_id) {
          // Colega recusou a troca -> notifica o solicitante original
          PushSenderService.sendToUser(target.solicitante_id, {
            title: `📅 Troca de Turno Recusada`,
            body: `${target.destinatario_nome || 'O colega'} recusou sua solicitação de troca de turno para ${formatarDataBR(target.data_origem)}.`,
            url: '/#inbox'
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar status da solicitacao no Supabase:', e);
    }

    return { success: true };
  }
}

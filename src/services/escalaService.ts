import { supabase } from './supabase';
import { EscalaDiaria, SolicitacaoEscala, BancoFolgasItem, EventoEscalaItem, TurnoConfig } from '../types';
import { formatarDataBR } from '../utils/messageFormatter';
import { PushSenderService } from './pushSenderService';

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
  private static LOCAL_STORAGE_SOLICITACOES_KEY = 'paxflow_escala_solicitacoes_v1';
  private static LOCAL_STORAGE_BANCO_KEY = 'paxflow_escala_banco_folgas_v1';
  private static LOCAL_STORAGE_EVENTOS_KEY = 'paxflow_escala_eventos_v1';

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
   * Initial mock dataset matching Agatur interface for immediate rich demo
   */
  private static getInitialMockData() {
    const mockEmployeesSchedule: Record<string, string[]> = {
      "Marinna Morena": ["10", "14", "10-17", "10-17", "10-17", "10-17", "Folga", "F", "F", "10-17", "10-17", "10-17", "10-17", "10-17", "10", "14", "10-17", "10-17", "10-17", "10-17", "Folga", "F", "F", "10-17", "10-17", "10-17", "10-17", "10-17", "10", "14", "10-17"],
      "Guto Bassaroto": ["F", "F", "Folga", "10-17", "10-17", "13-20", "10-17", "10", "14", "10-17", "10-17", "10-17", "10-17", "12-19", "F", "F", "Folga", "15-22", "13-20", "13-20", "10-17", "10", "14", "13-20", "13-20", "13-20", "13-20", "Folga", "F", "F", "13-20"],
      "Maria Carvalho": ["F", "F", "10-17", "13-20", "13-20", "15-22", "13-20", "10", "14", "13-20", "13-20", "13-20", "13-20", "13-20", "F", "F", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Folga"],
      "Rafael Sousa": ["10", "14", "15-22", "15-22", "15-22", "Folga", "15-22", "F", "F", "15-22", "15-22", "15-22", "15-22", "15-22", "10", "14", "15-22", "Folga", "15-22", "15-22", "15-22", "F", "F", "15-22", "15-22", "15-22", "15-22", "15-22", "10", "14", "15-22"],
      "Eduardo Mariano": ["", "", "12-19", "-", "Reunião", "-", "11-18", "", "", "12-19", "-", "11-18", "-", "10-17", "", "", "13-20", "-", "10-17", "Reunião", "13-20", "", "", "12-19", "-", "12-19", "-", "12-19", "", "", "12-19"],
      "Laura Montu": ["", "", "12-19", "-", "Reunião", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "Férias", "12", "15", "11-18", "-", "-", "11-18", "11-18", "", "", "-"],
      "Fernanda Ganem": ["", "", "14-21", "14-21", "14-21", "-", "-", "", "", "Férias", "Férias", "Férias", "Férias", "Férias", "", "", "-", "12-19", "-", "Reunião", "-", "", "", "14-21", "-", "-", "14-21", "-", "", "", "14-21"]
    };

    const mockBancoFolgas: BancoFolgasItem[] = [
      { consultor_id: "c-1", consultor_nome: "Marinna Morena", equipe: "Equipe Agatur", saldo_dias: "1", detalhes_historico: "Meta Jun" },
      { consultor_id: "c-2", consultor_nome: "Maria Carvalho", equipe: "Equipe Agatur", saldo_dias: "10", detalhes_historico: "8mar26 – Folga ref 22/03 · Meta de Abril · Ref 05/04 · REF 03/05 · ref 17/05 · ref 14/06/26 · META JUNHO · REF 02/11/25" },
      { consultor_id: "c-3", consultor_nome: "Rafael Sousa", equipe: "Equipe Agatur", saldo_dias: "2", detalhes_historico: "1 Folga Meta Março – Domingo Extra 28/06" },
      { consultor_id: "c-4", consultor_nome: "Guto Bassaroto", equipe: "Equipe Agatur", saldo_dias: "—", detalhes_historico: "Sem saldo pendente" }
    ];

    const mockEventos: EventoEscalaItem[] = [
      { id: 'ev-1', data: "17/08", consultor_nome: "Eduardo Mariano", titulo: "SACFLOW às 14:30" },
      { id: 'ev-2', data: "18/08", consultor_nome: "Marinna Morena", titulo: "SACFLOW às 14:30" },
      { id: 'ev-3', data: "17/08", consultor_nome: "Rafael Sousa", titulo: "SACFLOW às 16:00" },
      { id: 'ev-4', data: "20/08", consultor_nome: "Equipe", titulo: "Reunião Franqueados Matriz" }
    ];

    return { mockEmployeesSchedule, mockBancoFolgas, mockEventos };
  }

  /**
   * Fetches full monthly schedule table
   */
  public static async loadEscalaMensal(ano: number, mes: number): Promise<Record<string, string[]>> {
    const initial = this.getInitialMockData();
    let loadedMap: Record<string, string[]> = {};
    let isFromDbOrStorage = false;

    const daysInMonth = new Date(ano, mes, 0).getDate();
    const monthStr = String(mes).padStart(2, '0');
    const lastDayStr = String(daysInMonth).padStart(2, '0');

    // 1. Busca os registros diretamente no banco de dados (Supabase: tabela escala_diaria)
    try {
      const { data, error } = await supabase
        .from('escala_diaria')
        .select('*')
        .gte('data', `${ano}-${monthStr}-01`)
        .lte('data', `${ano}-${monthStr}-${lastDayStr}`);

      if (!error && data && data.length > 0) {
        isFromDbOrStorage = true;
        data.forEach((row: any) => {
          const name = row.consultor_nome || 'Consultor';
          if (!loadedMap[name]) {
            loadedMap[name] = new Array(31).fill('');
          }
          const dayNum = parseInt(row.data.split('-')[2], 10) - 1;
          if (dayNum >= 0 && dayNum < 31) {
            loadedMap[name][dayNum] = row.turno_codigo || row.observacao_custom || '';
          }
        });
      }
    } catch (e) {
      console.warn('Erro/offline ao consultar escala no Supabase:', e);
    }

    // 2. Mescla com o cache de fallback local caso existam apontamentos não sincronizados
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_ESCALA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const key = `${ano}-${mes}`;
        if (parsed[key]) {
          const localMap = parsed[key] as Record<string, string[]>;
          if (isFromDbOrStorage) {
            // Se o banco retornou dados, mescla células locais preenchidas que estejam em branco no banco
            Object.keys(localMap).forEach(name => {
              if (!loadedMap[name]) {
                loadedMap[name] = [...localMap[name]];
              } else {
                localMap[name].forEach((val, idx) => {
                  if (val && !loadedMap[name][idx]) {
                    loadedMap[name][idx] = val;
                    // Sincroniza em segundo plano essa célula para o Supabase
                    this.salvarCelulaEscala(ano, mes, name, idx, val);
                  }
                });
              }
            });
          } else {
            loadedMap = localMap;
            isFromDbOrStorage = true;
          }
        }
      }
    } catch (e) {}

    let resultMap: Record<string, string[]> = {};

    // 3. Se o banco de dados (ou cache) tem dados para este mês: usa 100% o que está no Banco
    if (isFromDbOrStorage) {
      const allConsultants = Array.from(new Set([...Object.keys(initial.mockEmployeesSchedule), ...Object.keys(loadedMap)]));
      allConsultants.forEach(name => {
        resultMap[name] = loadedMap[name] !== undefined ? loadedMap[name] : new Array(31).fill('');
      });
    } else if (ano === 2026 && mes === 8) {
      // Mês inicial de demonstração (Agosto/2026) se NUNCA nada foi gravado no banco
      resultMap = { ...initial.mockEmployeesSchedule };
    } else {
      // Qualquer outro mês novo sem dados no banco inicia 100% em branco
      Object.keys(initial.mockEmployeesSchedule).forEach(name => {
        resultMap[name] = new Array(31).fill('');
      });
    }

    // Aplica a ordem salva dos consultores se existir
    const customOrder = this.loadOrdemConsultores();
    if (customOrder && customOrder.length > 0) {
      const orderedMap: Record<string, string[]> = {};
      customOrder.forEach(name => {
        if (resultMap[name]) {
          orderedMap[name] = resultMap[name];
        }
      });
      Object.keys(resultMap).forEach(name => {
        if (!orderedMap[name]) {
          orderedMap[name] = resultMap[name];
        }
      });
      return orderedMap;
    }

    return resultMap;
  }

  private static LOCAL_STORAGE_ORDEM_KEY = 'paxflow_escala_ordem_consultores_v1';

  public static loadOrdemConsultores(): string[] {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_ORDEM_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }

  public static async salvarOrdemConsultores(ordem: string[]): Promise<boolean> {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_ORDEM_KEY, JSON.stringify(ordem));
      try {
        await supabase.from('configuracoes').upsert({
          chave: 'escala_ordem_consultores',
          valor: JSON.stringify(ordem)
        });
      } catch (e) {}
      return true;
    } catch (e) {
      console.error('Erro ao salvar ordem dos consultores:', e);
      return false;
    }
  }

  /**
   * Save a single day cell edit for a consultant
   */
  public static async salvarCelulaEscala(
    ano: number,
    mes: number,
    consultorNome: string,
    diaIndex: number,
    valor: string
  ): Promise<boolean> {
    const dataFormatted = `${ano}-${String(mes).padStart(2, '0')}-${String(diaIndex + 1).padStart(2, '0')}`;

    try {
      const { error } = await supabase
        .from('escala_diaria')
        .upsert({
          consultor_nome: consultorNome,
          data: dataFormatted,
          turno_codigo: valor,
          updated_at: new Date().toISOString()
        }, { onConflict: 'consultor_nome,data' });

      if (error) {
        console.warn('Supabase upsert escala_diaria not configured yet:', error.message);
      }
    } catch (e) {
      console.warn('Salvo no modo fallback local:', e);
    }

    try {
      const key = `${ano}-${mes}`;
      const stored = localStorage.getItem(this.LOCAL_STORAGE_ESCALA_KEY);
      let dataMap: Record<string, Record<string, string[]>> = stored ? JSON.parse(stored) : {};
      
      if (!dataMap[key]) {
        // Carrega o mapa atual do mês para inicialização precisa
        const initialMap = await this.loadEscalaMensal(ano, mes);
        dataMap[key] = initialMap;
      }

      if (!dataMap[key][consultorNome]) {
        dataMap[key][consultorNome] = new Array(31).fill('');
      }

      dataMap[key][consultorNome][diaIndex] = valor;
      localStorage.setItem(this.LOCAL_STORAGE_ESCALA_KEY, JSON.stringify(dataMap));
      return true;
    } catch (e) {
      console.error('Erro ao salvar célula da escala:', e);
      return false;
    }
  }

  /**
   * Fetch Leave Bank balances
   */
  public static async loadBancoFolgas(): Promise<BancoFolgasItem[]> {
    try {
      const { data, error } = await supabase.from('escala_banco_folgas').select('*');
      if (!error && data && data.length > 0) {
        return data as BancoFolgasItem[];
      }
    } catch (e) {
      console.warn('Fallback local para banco de folgas:', e);
    }

    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_BANCO_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    const initial = this.getInitialMockData();
    return initial.mockBancoFolgas;
  }

  /**
   * Save / Update Leave Bank item
   */
  public static async salvarBancoFolgas(items: BancoFolgasItem[]): Promise<boolean> {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_BANCO_KEY, JSON.stringify(items));
      await supabase.from('escala_banco_folgas').upsert(items);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch Events
   */
  public static async loadEventosEscala(): Promise<EventoEscalaItem[]> {
    try {
      const { data, error } = await supabase.from('escala_eventos').select('*').order('data', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as EventoEscalaItem[];
      }
    } catch (e) {}

    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_EVENTOS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    const initial = this.getInitialMockData();
    return initial.mockEventos;
  }

  /**
   * Add a new Event
   */
  public static async adicionarEvento(evento: EventoEscalaItem): Promise<boolean> {
    const list = await this.loadEventosEscala();
    list.push({ ...evento, id: 'ev-' + Date.now() });
    try {
      localStorage.setItem(this.LOCAL_STORAGE_EVENTOS_KEY, JSON.stringify(list));
      await supabase.from('escala_eventos').insert(evento);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Delete an Event / Training
   */
  public static async deletarEvento(eventoId: string): Promise<boolean> {
    const list = await this.loadEventosEscala();
    const updated = list.filter(e => e.id !== eventoId);
    try {
      localStorage.setItem(this.LOCAL_STORAGE_EVENTOS_KEY, JSON.stringify(updated));
      await supabase.from('escala_eventos').delete().eq('id', eventoId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Auto-fill an entire month schedule for a consultant in batch
   */
  public static async preencherMesEmLote(
    ano: number,
    mes: number,
    consultorNome: string,
    turnoPadrao: string,
    diasFolgaSemanais: number[]
  ): Promise<boolean> {
    const daysInMonth = new Date(ano, mes, 0).getDate();
    for (let dayIdx = 0; dayIdx < daysInMonth; dayIdx++) {
      const dateObj = new Date(ano, mes - 1, dayIdx + 1);
      const dow = dateObj.getDay();
      const valor = diasFolgaSemanais.includes(dow) ? 'Folga' : turnoPadrao;
      await this.salvarCelulaEscala(ano, mes, consultorNome, dayIdx, valor);
    }
    return true;
  }

  /**
   * Fetch all Shift Change / Off requests
   */
  public static async loadSolicitacoes(): Promise<SolicitacaoEscala[]> {
    let localItems: SolicitacaoEscala[] = [];
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_SOLICITACOES_KEY);
      if (stored) localItems = JSON.parse(stored);
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('escala_solicitacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const map = new Map<string, SolicitacaoEscala>();
        (data as SolicitacaoEscala[]).forEach(item => map.set(item.id, item));
        localItems.forEach(item => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        localStorage.setItem(this.LOCAL_STORAGE_SOLICITACOES_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('Aviso ao carregar solicitações de escala do Supabase:', e);
    }

    return localItems;
  }

  /**
   * Create a new Shift Swap or Day Off Request
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

    const list = await this.loadSolicitacoes();
    list.unshift(newObj);
    localStorage.setItem(this.LOCAL_STORAGE_SOLICITACOES_KEY, JSON.stringify(list));

    const isValidUUID = (val: any) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
    const safeSolicitanteId = isValidUUID(newObj.solicitante_id) ? newObj.solicitante_id : null;
    const safeDestinatarioId = isValidUUID(newObj.destinatario_id) ? newObj.destinatario_id : null;

    try {
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
        console.warn('Erro ao salvar escala_solicitacoes no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Erro na chamada Supabase criarSolicitacao:', e);
    }

    // Criar lembretes na Inbox para garantir que Administradores recebam o alerta em tempo real em qualquer dispositivo
    try {
      if (newObj.status === 'pendente_admin') {
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
        if (admins && admins.length > 0) {
          const tipoLabel = newObj.tipo === 'troca' ? 'Troca de Turno' : newObj.tipo === 'folga' ? 'Folga Semanal' : newObj.tipo === 'ferias' ? 'Férias' : 'Atendimento no Balcão';
          for (const admin of admins) {
            await supabase.from('lembretes').insert({
              consultor_id: admin.id,
              criador_id: safeSolicitanteId,
              titulo: `Solicitação de Escala: ${tipoLabel}`,
              descricao: `${newObj.solicitante_nome} solicitou ${tipoLabel} (${formatarDataBR(newObj.data_origem)}). Motivo: ${newObj.motivo || 'Sem justificativa'}`,
              data_lembrete: newObj.data_origem,
              prioridade: 'alta',
              concluido: false,
              created_at: newObj.created_at
            });
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
   * Update request status (e.g. Colleague Aceita/Recusa or Admin Aprova/Recusa)
   */
  public static async atualizarStatusSolicitacao(
    solicitacaoId: string,
    novoStatus: 'pendente_admin' | 'aprovado' | 'recusado',
    respostaAdmin?: string
  ): Promise<{ success: boolean; alreadyProcessed?: boolean; currentStatus?: string }> {
    let list = await this.loadSolicitacoes();
    let target = list.find(s => s.id === solicitacaoId);

    // Checagem em tempo real no banco de dados para evitar corrida de concorrência entre admins
    try {
      const { data: dbCheck } = await supabase
        .from('escala_solicitacoes')
        .select('*')
        .eq('id', solicitacaoId)
        .maybeSingle();

      if (dbCheck) {
        if (dbCheck.status === 'aprovado' || dbCheck.status === 'recusado') {
          return {
            success: false,
            alreadyProcessed: true,
            currentStatus: dbCheck.status
          };
        }
      }
    } catch (e) {}

    if (!target) return { success: false };

    if (target.status === 'aprovado' || target.status === 'recusado') {
      return {
        success: false,
        alreadyProcessed: true,
        currentStatus: target.status
      };
    }

    target.status = novoStatus;
    if (respostaAdmin) target.resposta_admin = respostaAdmin;
    target.updated_at = new Date().toISOString();

    localStorage.setItem(this.LOCAL_STORAGE_SOLICITACOES_KEY, JSON.stringify(list));

    if (novoStatus === 'aprovado') {
      const [ano, mes, diaOrigem] = target.data_origem.split('-').map(Number);
      const diaOrigemIdx = diaOrigem - 1;

      if (target.tipo === 'troca' && target.destinatario_nome && target.data_destino) {
        const [_, __, diaDestino] = target.data_destino.split('-').map(Number);
        const diaDestinoIdx = diaDestino - 1;
        if (target.solicitante_nome && target.destinatario_nome) {
          const currentMap = await this.loadEscalaMensal(ano, mes);
          const t1 = currentMap[target.solicitante_nome]?.[diaOrigemIdx] || '10-17';
          const t2 = currentMap[target.destinatario_nome]?.[diaDestinoIdx] || '10-17';

          await this.salvarCelulaEscala(ano, mes, target.solicitante_nome, diaOrigemIdx, t2);
          await this.salvarCelulaEscala(ano, mes, target.destinatario_nome, diaDestinoIdx, t1);
        }
      } else if (target.tipo === 'folga' && target.solicitante_nome) {
        let diaFimIdx = diaOrigemIdx;
        if (target.data_destino) {
          const [_, __, diaDest] = target.data_destino.split('-').map(Number);
          if (!isNaN(diaDest) && diaDest >= diaOrigem) diaFimIdx = diaDest - 1;
        }
        for (let d = diaOrigemIdx; d <= diaFimIdx; d++) {
          await this.salvarCelulaEscala(ano, mes, target.solicitante_nome, d, 'Folga');
        }
        // Abatimento automático de 1 dia no Banco de Folgas
        try {
          const banco = await this.loadBancoFolgas();
          const member = banco.find(b => 
            b.consultor_nome.trim().toLowerCase() === target.solicitante_nome?.trim().toLowerCase()
          );
          if (member && member.saldo_dias && String(member.saldo_dias) !== '—') {
            const currentBalance = parseInt(String(member.saldo_dias), 10);
            if (!isNaN(currentBalance) && currentBalance > 0) {
              member.saldo_dias = String(currentBalance - 1);
              member.detalhes_historico = `${member.detalhes_historico || ''} · Folga ref ${diaOrigem}/${mes}`.trim();
              await this.salvarBancoFolgas(banco);
            }
          }
        } catch (e) {
          console.warn('Erro ao abater saldo do banco de folgas:', e);
        }
      } else if (target.tipo === 'ferias' && target.solicitante_nome) {
        let diaFimIdx = diaOrigemIdx;
        if (target.data_destino) {
          const [_, __, diaDest] = target.data_destino.split('-').map(Number);
          if (!isNaN(diaDest) && diaDest >= diaOrigem) diaFimIdx = diaDest - 1;
        }
        for (let d = diaOrigemIdx; d <= diaFimIdx; d++) {
          await this.salvarCelulaEscala(ano, mes, target.solicitante_nome, d, 'Férias');
        }
      }
    }

    try {
      await supabase
        .from('escala_solicitacoes')
        .update({ status: novoStatus, resposta_admin: respostaAdmin })
        .eq('id', solicitacaoId);

      // 1. Notifica o solicitante direto se houver
      if (target.solicitante_id) {
        const statusLabel = novoStatus === 'aprovado' ? 'Aprovada' : novoStatus === 'recusado' ? 'Recusada' : 'Atualizada';
        await supabase.from('lembretes').insert({
          consultor_id: target.solicitante_id,
          criador_id: target.solicitante_id,
          titulo: `Resposta da Escala: ${statusLabel}`,
          descricao: `Sua solicitação de escala foi ${statusLabel}. Observação: ${respostaAdmin || 'Sem observações'}`,
          data_lembrete: target.data_origem,
          prioridade: 'alta',
          concluido: false,
          created_at: new Date().toISOString()
        });
      }

      // 2. Notifica TODOS os Administradores da agência sobre o retorno do consultor
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins && admins.length > 0) {
        const consultorNome = target.destinatario_nome || target.solicitante_nome || 'Consultor';
        const resText = novoStatus === 'aprovado' 
          ? 'ACEITOU a proposta e a escala foi atualizada automaticamente!' 
          : 'RECUSOU a proposta de troca de horário.';

        for (const admin of admins) {
          await supabase.from('lembretes').insert({
            consultor_id: admin.id,
            criador_id: target.destinatario_id || target.solicitante_id || null,
            titulo: `🔄 Retorno de Escala: ${consultorNome} ${novoStatus === 'aprovado' ? 'Aprovou ✅' : 'Recusou ❌'}`,
            descricao: `O consultor ${consultorNome} ${resText} Data: ${formatarDataBR(target.data_origem)}. ${respostaAdmin ? `Observação: ${respostaAdmin}` : ''}`,
            data_lembrete: target.data_origem,
            prioridade: 'alta',
            concluido: false,
            created_at: new Date().toISOString()
          });

          PushSenderService.sendToUser(admin.id, {
            title: `🔄 Retorno da Escala: ${consultorNome}`,
            body: `O consultor ${consultorNome} ${novoStatus === 'aprovado' ? 'APROVOU' : 'RECUSOU'} a proposta de escala (${formatarDataBR(target.data_origem)})`,
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

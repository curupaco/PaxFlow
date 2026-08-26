import { supabase } from './supabase';
import { EscalaDiaria, SolicitacaoEscala, BancoFolgasItem, EventoEscalaItem, TurnoConfig } from '../types';

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

    try {
      const { data, error } = await supabase
        .from('escala_diaria')
        .select('*')
        .gte('data', `${ano}-${String(mes).padStart(2, '0')}-01`)
        .lte('data', `${ano}-${String(mes).padStart(2, '0')}-31`);

      if (!error && data && data.length > 0) {
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
      console.warn('Fallback para armazenamento local de escala:', e);
    }

    if (Object.keys(loadedMap).length === 0) {
      try {
        const stored = localStorage.getItem(this.LOCAL_STORAGE_ESCALA_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[`${ano}-${mes}`]) {
            loadedMap = parsed[`${ano}-${mes}`];
          }
        }
      } catch (e) {
        console.error('Erro ao ler localStorage de escala:', e);
      }
    }

    // Merge loadedMap com os dados mock iniciais para garantir roster completo do mês de Agosto
    const resultMap: Record<string, string[]> = { ...initial.mockEmployeesSchedule };
    Object.keys(loadedMap).forEach(name => {
      if (loadedMap[name] && loadedMap[name].some(val => val !== '')) {
        resultMap[name] = loadedMap[name];
      }
    });

    return resultMap;
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
        const initial = this.getInitialMockData();
        dataMap[key] = { ...initial.mockEmployeesSchedule };
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
      const { data, error } = await supabase.from('escala_solicitacoes').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const map = new Map<string, SolicitacaoEscala>();
        (data as SolicitacaoEscala[]).forEach(item => map.set(item.id, item));
        localItems.forEach(item => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (e) {}

    return localItems;
  }

  /**
   * Create a new Shift Swap or Day Off Request
   */
  public static async criarSolicitacao(sol: Omit<SolicitacaoEscala, 'id' | 'created_at'>): Promise<SolicitacaoEscala> {
    const newObj: SolicitacaoEscala = {
      ...sol,
      id: 'sol-' + Date.now(),
      created_at: new Date().toISOString()
    };

    const list = await this.loadSolicitacoes();
    list.unshift(newObj);
    localStorage.setItem(this.LOCAL_STORAGE_SOLICITACOES_KEY, JSON.stringify(list));

    try {
      await supabase.from('escala_solicitacoes').insert(newObj);
    } catch (e) {}

    return newObj;
  }

  /**
   * Update request status (e.g. Colleague Aceita/Recusa or Admin Aprova/Recusa)
   */
  public static async atualizarStatusSolicitacao(
    solicitacaoId: string,
    novoStatus: 'pendente_admin' | 'aprovado' | 'recusado',
    respostaAdmin?: string
  ): Promise<boolean> {
    const list = await this.loadSolicitacoes();
    const target = list.find(s => s.id === solicitacaoId);
    if (!target) return false;

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
        await this.salvarCelulaEscala(ano, mes, target.solicitante_nome, diaOrigemIdx, 'Folga');
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
        await this.salvarCelulaEscala(ano, mes, target.solicitante_nome, diaOrigemIdx, 'Férias');
      }
    }

    try {
      await supabase
        .from('escala_solicitacoes')
        .update({ status: novoStatus, resposta_admin: respostaAdmin })
        .eq('id', solicitacaoId);
    } catch (e) {}

    return true;
  }
}

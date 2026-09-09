import { describe, it, expect } from 'vitest';

export type ViagemKanbanColumn = 
  | 'planejamento' 
  | 'reservas_confirmadas' 
  | 'documentacao_enviada' 
  | 'embarque_proximo' 
  | 'em_viagem' 
  | 'pos_viagem';

export interface ViagemMock {
  id: string;
  codigo?: string;
  status: string;
  data_inicio?: string;
  consultor_id?: string;
  cliente?: { nome: string };
  destino?: string;
}

export function agruparViagensPorColuna(viagens: ViagemMock[]): Record<ViagemKanbanColumn, ViagemMock[]> {
  const colunas: Record<ViagemKanbanColumn, ViagemMock[]> = {
    planejamento: [],
    reservas_confirmadas: [],
    documentacao_enviada: [],
    embarque_proximo: [],
    em_viagem: [],
    pos_viagem: []
  };

  viagens.forEach(v => {
    const st = (v.status || 'planejamento') as ViagemKanbanColumn;
    if (colunas[st]) {
      colunas[st].push(v);
    } else {
      colunas['planejamento'].push(v);
    }
  });

  return colunas;
}

export function calcularUrgenciaEmbarque(dataInicioStr?: string, status?: string, refDateMs: number = Date.now()): 'urgente' | 'alerta' | 'normal' {
  if (!dataInicioStr || status === 'pos_viagem' || status === 'em_viagem') {
    return 'normal';
  }

  const dataEmbarque = new Date(dataInicioStr).getTime();
  const diffHoras = (dataEmbarque - refDateMs) / (1000 * 3600);

  if (diffHoras <= 48 && diffHoras >= 0) {
    return 'urgente';
  } else if (diffHoras > 48 && diffHoras <= 168) { // até 7 dias
    return 'alerta';
  }

  return 'normal';
}

export function filtrarViagensOperacionais(
  viagens: ViagemMock[],
  filtros: { consultorId?: string; busca?: string; apenasAtivas?: boolean }
): ViagemMock[] {
  return viagens.filter(v => {
    // Filtro por consultor
    if (filtros.consultorId && v.consultor_id !== filtros.consultorId) {
      return false;
    }

    // Filtro apenas ativas (exclui pos_viagem)
    if (filtros.apenasAtivas && v.status === 'pos_viagem') {
      return false;
    }

    // Filtro por busca
    if (filtros.busca && filtros.busca.trim()) {
      const b = filtros.busca.toLowerCase().trim();
      const nomeCli = v.cliente?.nome?.toLowerCase() || '';
      const cod = v.codigo?.toLowerCase() || '';
      const dest = v.destino?.toLowerCase() || '';
      const match = nomeCli.includes(b) || cod.includes(b) || dest.includes(b);
      if (!match) return false;
    }

    return true;
  });
}

describe('DashboardController - Testes Subcutâneos', () => {
  it('deve distribuir viagens nas 6 colunas do Kanban operacional', () => {
    // Setup
    const viagens: ViagemMock[] = [
      { id: '1', status: 'planejamento' },
      { id: '2', status: 'reservas_confirmadas' },
      { id: '3', status: 'documentacao_enviada' },
      { id: '4', status: 'embarque_proximo' },
      { id: '5', status: 'em_viagem' },
      { id: '6', status: 'pos_viagem' },
      { id: '7', status: 'status_invalido' } // deve cair em planejamento por fallback
    ];

    // Action
    const kanban = agruparViagensPorColuna(viagens);

    // Assert
    expect(kanban.planejamento).toHaveLength(2); // id 1 e id 7
    expect(kanban.reservas_confirmadas).toHaveLength(1);
    expect(kanban.documentacao_enviada).toHaveLength(1);
    expect(kanban.embarque_proximo).toHaveLength(1);
    expect(kanban.em_viagem).toHaveLength(1);
    expect(kanban.pos_viagem).toHaveLength(1);
  });

  it('deve classificar urgência do SLA de embarque baseado na proximidade da data', () => {
    // Setup
    const refDate = new Date('2026-09-09T12:00:00.000Z').getTime();
    const data40Horas = new Date(refDate + 40 * 3600 * 1000).toISOString();
    const data4Dias = new Date(refDate + 4 * 24 * 3600 * 1000).toISOString();
    const data20Dias = new Date(refDate + 20 * 24 * 3600 * 1000).toISOString();

    // Action & Assert
    // < 48 horas = urgente
    expect(calcularUrgenciaEmbarque(data40Horas, 'planejamento', refDate)).toBe('urgente');
    // Entre 48h e 7 dias = alerta
    expect(calcularUrgenciaEmbarque(data4Dias, 'embarque_proximo', refDate)).toBe('alerta');
    // > 7 dias = normal
    expect(calcularUrgenciaEmbarque(data20Dias, 'planejamento', refDate)).toBe('normal');
    // Pós viagem ou em viagem nunca aciona alerta pré-embarque
    expect(calcularUrgenciaEmbarque(data40Horas, 'em_viagem', refDate)).toBe('normal');
    expect(calcularUrgenciaEmbarque(data40Horas, 'pos_viagem', refDate)).toBe('normal');
  });

  it('deve filtrar viagens por consultor, texto de busca e status de atividade', () => {
    // Setup
    const viagens: ViagemMock[] = [
      { id: '1', consultor_id: 'c1', status: 'planejamento', cliente: { nome: 'João Lima' }, destino: 'Paris', codigo: 'TRIP-1' },
      { id: '2', consultor_id: 'c2', status: 'planejamento', cliente: { nome: 'Ana Paula' }, destino: 'Roma', codigo: 'TRIP-2' },
      { id: '3', consultor_id: 'c1', status: 'pos_viagem', cliente: { nome: 'João Lima' }, destino: 'Nova York', codigo: 'TRIP-3' }
    ];

    // Action
    const apenasC1 = filtrarViagensOperacionais(viagens, { consultorId: 'c1' });
    const apenasAtivasC1 = filtrarViagensOperacionais(viagens, { consultorId: 'c1', apenasAtivas: true });
    const buscaRoma = filtrarViagensOperacionais(viagens, { busca: 'roma' });

    // Assert
    expect(apenasC1).toHaveLength(2);
    expect(apenasAtivasC1).toHaveLength(1);
    expect(apenasAtivasC1[0].id).toBe('1');
    expect(buscaRoma).toHaveLength(1);
    expect(buscaRoma[0].id).toBe('2');
  });
});

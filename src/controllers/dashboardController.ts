/**
 * DashboardController
 * Funções puras de controle e regras operacionais para o Dashboard e Kanban.
 */

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

export function calcularUrgenciaEmbarque(
  dataInicioStr?: string,
  status?: string,
  refDateMs: number = Date.now()
): 'urgente' | 'alerta' | 'normal' {
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

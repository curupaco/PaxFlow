/**
 * ClientesController
 * Funções puras de controle e regras de negócio para Gestão de Clientes e Passaportes.
 */
import { ClientePassaporte } from '../types';

export function normalizarPassaportesCliente(d: any): ClientePassaporte[] {
  if (Array.isArray(d.passaportes) && d.passaportes.length > 0) {
    return d.passaportes;
  }
  const num = d.passaporte_numero || d.passaporteNumero;
  if (num) {
    return [{
      nome: d.nome || 'Passageiro Titular',
      numero: num,
      validade: d.passaporte_validade || d.passaporteValidade || ''
    }];
  }
  return [];
}

export function verificarAlertaValidadePassaporte(
  validadeIsoStr: string,
  refDateMs: number = Date.now()
): 'vencido' | 'expirando_em_breve' | 'valido' {
  if (!validadeIsoStr) return 'valido';
  const dataValidade = new Date(validadeIsoStr).getTime();
  const diffDias = (dataValidade - refDateMs) / (1000 * 3600 * 24);

  if (diffDias <= 0) {
    return 'vencido';
  } else if (diffDias <= 180) { // menos de 6 meses (regra de viagem internacional)
    return 'expirando_em_breve';
  }
  return 'valido';
}

export function filtrarClientesCarteira(
  clientes: any[],
  userId: string,
  userRole: string,
  temBusca: boolean
): any[] {
  // Se estiver buscando por texto, permite buscar em toda a agência para evitar duplicações
  if (temBusca) {
    return clientes;
  }
  // Sem busca: admin vê tudo, consultor vê apenas clientes da sua carteira
  if (userRole === 'admin') {
    return clientes;
  }
  return clientes.filter(c => (c.consultor_responsavel_id || c.consultorResponsavelId) === userId);
}

export function gerenciarSelecaoEmMassa(
  selecionados: Set<string>,
  acao: 'toggle' | 'selecionar_todos' | 'limpar',
  idOuIds?: string | string[]
): Set<string> {
  const novoSet = new Set(selecionados);

  if (acao === 'toggle' && typeof idOuIds === 'string') {
    if (novoSet.has(idOuIds)) {
      novoSet.delete(idOuIds);
    } else {
      novoSet.add(idOuIds);
    }
  } else if (acao === 'selecionar_todos' && Array.isArray(idOuIds)) {
    idOuIds.forEach(id => novoSet.add(id));
  } else if (acao === 'limpar') {
    novoSet.clear();
  }

  return novoSet;
}

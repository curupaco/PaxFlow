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

export interface CompletudeCadastralInfo {
  porcentagem: number;
  nivel: 'baixo' | 'medio' | 'alto';
  concluidos: string[];
  pendencias: string[];
  corBadge: string;
}

/**
 * Calcula a completude cadastral da ficha do cliente
 */
export function calcularCompletudeCadastral(cliente: any): CompletudeCadastralInfo {
  if (!cliente) {
    return {
      porcentagem: 0,
      nivel: 'baixo',
      concluidos: [],
      pendencias: ['Nome Completo', 'E-mail de Contato', 'Telefone/WhatsApp', 'CPF ou CNPJ', 'Data de Nascimento', 'Passaporte e Validade'],
      corBadge: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50'
    };
  }

  const concluidos: string[] = [];
  const pendencias: string[] = [];
  let score = 0;

  // 1. Nome (20%)
  if (cliente.nome && cliente.nome.trim() && cliente.nome !== 'NULL') {
    concluidos.push('Nome Completo');
    score += 20;
  } else {
    pendencias.push('Nome Completo');
  }

  // 2. E-mail (20%)
  if (cliente.email && cliente.email.trim() && cliente.email !== 'NULL') {
    concluidos.push('E-mail de Contato');
    score += 20;
  } else {
    pendencias.push('E-mail de Contato');
  }

  // 3. Telefone (20%)
  if (cliente.telefone && cliente.telefone.trim() && cliente.telefone !== 'NULL') {
    concluidos.push('Telefone/WhatsApp');
    score += 20;
  } else {
    pendencias.push('Telefone/WhatsApp');
  }

  // 4. Documento (15%)
  const doc = (cliente.documento || cliente.documento_limpo || '').trim();
  if (doc && doc !== 'NULL') {
    concluidos.push('CPF ou CNPJ');
    score += 15;
  } else {
    pendencias.push('CPF ou CNPJ');
  }

  // 5. Data de Nascimento (10%)
  const dataNasc = cliente.dataNascimento || cliente.data_nascimento;
  if (dataNasc && String(dataNasc).trim() !== '' && String(dataNasc) !== 'NULL') {
    concluidos.push('Data de Nascimento');
    score += 10;
  } else {
    pendencias.push('Data de Nascimento');
  }

  // 6. Passaporte e Validade (15%)
  const temPassaporte = (cliente.passaporteNumero && cliente.passaporteNumero.trim()) ||
    (Array.isArray(cliente.passaportes) && cliente.passaportes.some((p: any) => p.numero && p.numero.trim()));
  const temValidade = (cliente.passaporteValidade && cliente.passaporteValidade.trim()) ||
    (Array.isArray(cliente.passaportes) && cliente.passaportes.some((p: any) => p.validade && p.validade.trim()));

  if (temPassaporte && temValidade) {
    concluidos.push('Passaporte e Validade');
    score += 15;
  } else if (temPassaporte) {
    concluidos.push('Passaporte');
    pendencias.push('Data de Validade do Passaporte');
    score += 8;
  } else {
    pendencias.push('Passaporte e Validade');
  }

  let nivel: 'baixo' | 'medio' | 'alto' = 'baixo';
  let corBadge = 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50';

  if (score >= 80) {
    nivel = 'alto';
    corBadge = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
  } else if (score >= 50) {
    nivel = 'medio';
    corBadge = 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
  }

  return {
    porcentagem: score,
    nivel,
    concluidos,
    pendencias,
    corBadge
  };
}

export interface TimelineEvent {
  id: string;
  data: string;
  dataIso: string;
  titulo: string;
  descricao: string;
  icone: string;
  tipo: 'cadastro' | 'orcamento' | 'viagem' | 'documento' | 'nps' | 'contato';
  badgeCor: string;
}

/**
 * Consolida a história completa do cliente em ordem cronológica decrescente (Customer 360)
 */
export function consolidarLinhaDoTempoCliente(params: {
  cliente: any;
  viagens?: any[];
  orcamentos?: any[];
  anexos?: any[];
  feedbacks?: any[];
}): TimelineEvent[] {
  const eventos: TimelineEvent[] = [];
  const { cliente, viagens = [], orcamentos = [], anexos = [], feedbacks = [] } = params;

  if (!cliente) return eventos;

  // 1. Evento de Cadastro do Cliente
  if (cliente.createdAt || cliente.created_at) {
    const dt = cliente.createdAt || cliente.created_at;
    eventos.push({
      id: `cad-${cliente.id || 'new'}`,
      data: new Date(dt).toLocaleDateString('pt-BR'),
      dataIso: dt,
      titulo: 'Cliente Cadastrado no PaxFlow',
      descricao: `Ficha inicial criada na base com canal de origem ${cliente.classificacoes?.[0] || 'Geral'}.`,
      icone: '👤',
      tipo: 'cadastro',
      badgeCor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'
    });
  }

  // 2. Orçamentos
  orcamentos.forEach((o: any) => {
    const dt = o.created_at || o.createdAt || new Date().toISOString();
    const statusLabel = o.status === 'CONCLUIDO' ? (o.sub_status === 'ACEITO' || o.subStatus === 'ACEITO' ? 'Venda Fechada 🏆' : 'Desistência 🚫') : (o.status || 'Solicitado');
    eventos.push({
      id: `orc-${o.id}`,
      data: new Date(dt).toLocaleDateString('pt-BR'),
      dataIso: dt,
      titulo: `Orçamento: ${o.destino || 'Destino a Definir'}`,
      descricao: `Status: ${statusLabel} | Proposta: R$ ${Number(o.valor_proposta || o.valorProposta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: '📋',
      tipo: 'orcamento',
      badgeCor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200'
    });
  });

  // 3. Viagens
  viagens.forEach((v: any) => {
    const dt = v.created_at || v.data_ida || new Date().toISOString();
    const statusMap: { [k: string]: string } = {
      fechado: 'Fechado',
      pos_venda: 'Pós-Venda',
      pre_embarque: 'Pré-Embarque',
      pos_viagem: 'Pós-Viagem',
      reembolso_solicitado: 'Reembolso'
    };
    eventos.push({
      id: `via-${v.id}`,
      data: new Date(dt).toLocaleDateString('pt-BR'),
      dataIso: dt,
      titulo: `Viagem: ${v.destino || 'Viagem'}`,
      descricao: `Fase: ${statusMap[v.status] || v.status} | LOC: ${v.codigo_localizador || 'Sem LOC'} | Valor: R$ ${Number(v.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: '✈️',
      tipo: 'viagem',
      badgeCor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
    });
  });

  // 4. Anexos e Documentos
  anexos.forEach((a: any) => {
    const dt = a.created_at || new Date().toISOString();
    eventos.push({
      id: `anx-${a.id}`,
      data: new Date(dt).toLocaleDateString('pt-BR'),
      dataIso: dt,
      titulo: `Documento Anexado: ${a.rotulo || a.tipo_documento}`,
      descricao: `Tipo: ${a.tipo_documento} | Arquivado com segurança no PaxFlow Drive.`,
      icone: '🪪',
      tipo: 'documento',
      badgeCor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200'
    });
  });

  // 5. Feedbacks NPS
  feedbacks.forEach((f: any) => {
    const dt = f.created_at || new Date().toISOString();
    eventos.push({
      id: `nps-${f.id}`,
      data: new Date(dt).toLocaleDateString('pt-BR'),
      dataIso: dt,
      titulo: `Avaliação NPS: Nota ${f.nota || 10}/10 ⭐`,
      descricao: f.comentario ? `"${f.comentario}"` : 'Feedback positivo recebido do viajante.',
      icone: '⭐',
      tipo: 'nps',
      badgeCor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200'
    });
  });

  // Ordenar decrescente por data
  return eventos.sort((a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime());
}

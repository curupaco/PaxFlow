/**
 * Módulo de parsing e regras de migração para os embarques da Malta Viagens.
 * Garante parsing seguro, deduplicação por ID, formatação de contatos e cálculo de status.
 */

export interface RegistroLegadoRaw {
  agencia: string;
  idLegado: number;
  dataAbertura: string;
  consultorLegado: string;
  valorVendaRaw: string | number;
  dataEmbarque: string;
  dataRetorno?: string;
  destinoEServicos: string;
  clienteIdLegado: number;
  nomeCliente: string;
  telefones?: string;
  email?: string;
  estrangeiro?: string;
  observacao?: string;
  contatoEmbarque?: string;
  contatoRetorno?: string;
  categoriasCliente?: string;
  categoriasAtendimento?: string;
}

export interface ClienteFormatado {
  nome: string;
  email: string | null;
  telefone: string | null;
  telefonesSecundarios: string[];
  observacoes: string;
  classificacoes: string[];
  clienteIdLegado: number;
}

export interface ViagemFormatada {
  codigoLocalizador: string;
  destino: string;
  dataIda: string;
  dataVolta: string;
  valorTotal: number;
  status: 'pre_embarque' | 'pos_venda';
  dataFinanceiro: string | null;
  consultorNomeLegado: string;
  origem: string;
  observacoes: string;
  clienteIdLegado: number;
}

export const TAG_MIGRACAO = 'MIGRACAO_MALTA_20260909';

/**
 * Converte valor monetário brasileiro (string ou número) para número decimal puro.
 * Ex: "56.874,09" -> 56874.09, "9500" -> 9500, 0 -> 0
 */
export function parseValorMonetario(valor: string | number | undefined | null): number {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  const str = valor.toString().trim();
  if (!str) return 0;

  // Remove pontos de milhar e substitui vírgula decimal por ponto
  const limpo = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Extrai o destino limpo e a lista de serviços do campo "Destino e serviços".
 * Ex:
 * "* Barcelona:\nAGAXTUR - Hotel" -> { destino: "Barcelona", servicos: "AGAXTUR - Hotel" }
 */
export function parseDestinoEServicos(raw: string): { destino: string; servicos: string } {
  if (!raw) return { destino: 'Não informado', servicos: '' };

  const linhas = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let destino = 'Não informado';
  const servicos: string[] = [];

  for (const linha of linhas) {
    if (linha.startsWith('*')) {
      // Ex: "* Barcelona:" ou "* Penha (Beto Carrero):"
      const match = linha.replace(/^\*\s*/, '').replace(/:$/, '').trim();
      if (match) {
        destino = match;
      }
    } else {
      servicos.push(linha);
    }
  }

  // Se por acaso a primeira linha não tinha asterisco mas era o destino
  if (destino === 'Não informado' && linhas.length > 0) {
    destino = linhas[0].replace(/:$/, '').trim();
    servicos.push(...linhas.slice(1));
  }

  return {
    destino,
    servicos: servicos.join('\n')
  };
}

/**
 * Normaliza e separa múltiplos telefones (ex: "11 98429-1338, 11 98419-1907").
 * Retorna o principal formatado e eventuais secundários.
 */
export function parseTelefones(rawTelefones?: string | null): { principal: string | null; secundarios: string[] } {
  if (!rawTelefones) return { principal: null, secundarios: [] };

  const partes = rawTelefones.split(',').map(t => t.trim()).filter(Boolean);
  if (partes.length === 0) return { principal: null, secundarios: [] };

  const principal = partes[0];
  const secundarios = partes.slice(1);

  return { principal, secundarios };
}

/**
 * Calcula o status dinâmico da viagem com base na data de ida e retorno em relação à data de referência.
 * Janela de 7 dias de antecedência ou viagens já iniciadas entram como 'pre_embarque'.
 */
export function calcularStatusViagem(
  dataIdaStr: string,
  dataVoltaStr: string,
  dataReferencia: Date = new Date('2026-09-09')
): 'pre_embarque' | 'pos_venda' {
  const [anoIda, mesIda, diaIda] = dataIdaStr.split('-').map(Number);
  const dataIda = new Date(Date.UTC(anoIda, mesIda - 1, diaIda));

  const [anoRef, mesRef, diaRef] = [
    dataReferencia.getUTCFullYear(),
    dataReferencia.getUTCMonth(),
    dataReferencia.getUTCDate()
  ];
  const dataRefUTC = new Date(Date.UTC(anoRef, mesRef, diaRef));

  const diffDias = Math.floor((dataIda.getTime() - dataRefUTC.getTime()) / (1000 * 60 * 60 * 24));

  // Se a viagem já iniciou ou embarca nos próximos 7 dias
  if (diffDias <= 7) {
    return 'pre_embarque';
  }

  return 'pos_venda';
}

/**
 * Monta o bloco formatado de observações da viagem.
 */
export function montarObservacoesViagem(registro: RegistroLegadoRaw, servicosTexto: string, dataVoltaAssumida: boolean): string {
  const linhas: string[] = [
    `=== [${TAG_MIGRACAO}] HISTÓRICO DE MIGRAÇÃO ===`,
    `• Venda Original Legada: #${registro.idLegado}`,
    `• Consultor Original: ${registro.consultorLegado || 'Não informado'}`,
    `• Data Abertura Legada: ${registro.dataAbertura || 'Não informada'}`,
  ];

  if (registro.categoriasAtendimento) {
    linhas.push(`• Canal/Atendimento: ${registro.categoriasAtendimento}`);
  }

  if (servicosTexto) {
    linhas.push(`• Serviços Contratados:`);
    servicosTexto.split('\n').forEach(s => linhas.push(`  - ${s}`));
  }

  if (dataVoltaAssumida) {
    linhas.push(`• Observação Operacional: Data de retorno não constava na planilha original (assumida mesma data de embarque).`);
  }

  if (registro.contatoEmbarque) {
    linhas.push(`• Contato Pré-Embarque Legado: ${registro.contatoEmbarque}`);
  }

  if (registro.contatoRetorno) {
    linhas.push(`• Contato Pós-Viagem Legado: ${registro.contatoRetorno}`);
  }

  if (registro.observacao) {
    linhas.push(`• Observações Gerais Legadas: ${registro.observacao}`);
  }

  linhas.push('================================================');

  return linhas.join('\n');
}

/**
 * Processa a lista bruta de registros, realizando a deduplicação de ID legado (privilegiando dados mais completos),
 * formatação de clientes e montagem das viagens.
 */
export function processarRegistrosLegados(
  registros: RegistroLegadoRaw[],
  dataReferencia: Date = new Date('2026-09-09')
): { clientesMap: Map<number, ClienteFormatado>; viagens: ViagemFormatada[] } {
  // Deduplicação por ID legado (mantendo a versão que possui notas ou a mais recente)
  const mapaPorId = new Map<number, RegistroLegadoRaw>();

  for (const reg of registros) {
    if (!mapaPorId.has(reg.idLegado)) {
      mapaPorId.set(reg.idLegado, reg);
    } else {
      const existente = mapaPorId.get(reg.idLegado)!;
      // Se o novo registro tiver mais informações de contato, substitui
      const pontosNovo = (reg.contatoEmbarque ? 2 : 0) + (reg.contatoRetorno ? 2 : 0) + (reg.observacao ? 1 : 0);
      const pontosExistente = (existente.contatoEmbarque ? 2 : 0) + (existente.contatoRetorno ? 2 : 0) + (existente.observacao ? 1 : 0);

      if (pontosNovo > pontosExistente) {
        mapaPorId.set(reg.idLegado, reg);
      }
    }
  }

  const clientesMap = new Map<number, ClienteFormatado>();
  const viagens: ViagemFormatada[] = [];

  for (const reg of mapaPorId.values()) {
    // 1. Processa Cliente
    const { principal: telefonePrincipal, secundarios: telefonesSecundarios } = parseTelefones(reg.telefones);
    const emailLimpo = reg.email ? reg.email.trim().toLowerCase() : null;

    if (!clientesMap.has(reg.clienteIdLegado)) {
      let obsCliente = `Importado da migração #${TAG_MIGRACAO} (Ref Legada: #${reg.clienteIdLegado})`;
      if (telefonesSecundarios.length > 0) {
        obsCliente += ` | Telefones adicionais: ${telefonesSecundarios.join(', ')}`;
      }

      clientesMap.set(reg.clienteIdLegado, {
        nome: reg.nomeCliente.trim(),
        email: emailLimpo || null,
        telefone: telefonePrincipal || null,
        telefonesSecundarios,
        observacoes: obsCliente,
        classificacoes: [TAG_MIGRACAO],
        clienteIdLegado: reg.clienteIdLegado
      });
    }

    // 2. Processa Viagem
    const { destino, servicos } = parseDestinoEServicos(reg.destinoEServicos);
    const dataIda = reg.dataEmbarque.trim();
    const dataVoltaAssumida = !reg.dataRetorno || reg.dataRetorno.trim() === '';
    const dataVolta = dataVoltaAssumida ? dataIda : reg.dataRetorno!.trim();
    const valorTotal = parseValorMonetario(reg.valorVendaRaw);
    const status = calcularStatusViagem(dataIda, dataVolta, dataReferencia);
    const dataFinanceiro = reg.dataAbertura ? reg.dataAbertura.split(' ')[0] : null;
    const observacoes = montarObservacoesViagem(reg, servicos, dataVoltaAssumida);

    viagens.push({
      codigoLocalizador: `#${reg.idLegado}`,
      destino,
      dataIda,
      dataVolta,
      valorTotal,
      status,
      dataFinanceiro,
      consultorNomeLegado: reg.consultorLegado ? reg.consultorLegado.trim() : 'Malta',
      origem: TAG_MIGRACAO,
      observacoes,
      clienteIdLegado: reg.clienteIdLegado
    });
  }

  return { clientesMap, viagens };
}

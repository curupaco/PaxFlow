/**
 * Parser especializado para arquivos OFX (Open Financial Exchange).
 * Converte extratos bancários brutos (.ofx) em transações estruturadas.
 */

export interface TransacaoOFX {
  id: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  documentoRef?: string;
  documento?: string;
  fitid?: string;
  tipo: 'CREDITO' | 'DEBITO' | 'CREDIT' | 'DEBIT';
  valor: number; // Positivo para créditos, negativo ou absoluto dependendo do contexto
  valorOriginal?: number;
}

export interface ExtratoOFXResult {
  bancoId?: string;
  contaId?: string;
  moeda?: string;
  saldoFinal?: number;
  dataInicio?: string;
  dataFim?: string;
  transacoes: TransacaoOFX[];
}

/**
 * Converte data no formato OFX (ex: 20261015120000[-03:EST] ou 20261015) para YYYY-MM-DD
 */
export function formatarDataOFX(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  const cleaned = rawDate.trim().replace(/\[.*\]/, '');
  if (cleaned.length >= 8) {
    const ano = cleaned.substring(0, 4);
    const mes = cleaned.substring(4, 6);
    const dia = cleaned.substring(6, 8);
    return `${ano}-${mes}-${dia}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Faz o parsing do conteúdo textual de um arquivo OFX
 */
export function parseOFX(conteudo: string): ExtratoOFXResult {
  const transacoes: TransacaoOFX[] = [];
  
  if (!conteudo) {
    return { transacoes: [] };
  }

  // Moeda e Saldo
  const curdefMatch = /<CURDEF>([^<\r\n]+)/i.exec(conteudo);
  const moeda = curdefMatch ? curdefMatch[1].trim() : 'BRL';

  const balamtMatch = /<BALAMT>([^<\r\n]+)/i.exec(conteudo);
  const saldoFinal = balamtMatch ? parseFloat(balamtMatch[1].trim().replace(',', '.')) : undefined;

  const bancoIdMatch = /<BANKID>([^<\r\n]+)/i.exec(conteudo);
  const bancoId = bancoIdMatch ? bancoIdMatch[1].trim() : undefined;

  const acctIdMatch = /<ACCTID>([^<\r\n]+)/i.exec(conteudo);
  const contaId = acctIdMatch ? acctIdMatch[1].trim() : undefined;

  // Extrai blocos <STMTTRN>...</STMTTRN> (ou sem fechamento de tag padrão OFX 1.0)
  const regexTransacao = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|$))/gi;
  let match: RegExpExecArray | null;

  while ((match = regexTransacao.exec(conteudo)) !== null) {
    const bloco = match[1];

    const trntypeMatch = /<TRNTYPE>([^<\r\n]+)/i.exec(bloco);
    const dtpostedMatch = /<DTPOSTED>([^<\r\n]+)/i.exec(bloco);
    const trnamtMatch = /<TRNAMT>([^<\r\n]+)/i.exec(bloco);
    const fitidMatch = /<FITID>([^<\r\n]+)/i.exec(bloco);
    const memoMatch = /<MEMO>([^<\r\n]+)/i.exec(bloco);
    const nameMatch = /<NAME>([^<\r\n]+)/i.exec(bloco);
    const checknumMatch = /<CHECKNUM>([^<\r\n]+)/i.exec(bloco);

    const rawValor = trnamtMatch ? trnamtMatch[1].trim().replace(',', '.') : '0';
    const valorNumerico = parseFloat(rawValor) || 0;
    
    // Tipo: normalizado para CREDITO/DEBITO ou CREDIT/DEBIT
    const trnTypeVal = trntypeMatch ? trntypeMatch[1].trim().toUpperCase() : '';
    let tipo: 'CREDITO' | 'DEBITO' | 'CREDIT' | 'DEBIT';
    if (trnTypeVal === 'CREDIT' || trnTypeVal === 'CREDITO') {
      tipo = 'CREDITO';
    } else if (trnTypeVal === 'DEBIT' || trnTypeVal === 'DEBITO') {
      tipo = 'DEBITO';
    } else {
      tipo = valorNumerico >= 0 ? 'CREDITO' : 'DEBITO';
    }

    const valorAbsoluto = Math.abs(valorNumerico);
    const descricao = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Lançamento Bancário')).trim();
    const dataFormatada = dtpostedMatch ? formatarDataOFX(dtpostedMatch[1]) : new Date().toISOString().split('T')[0];
    const docRef = (checknumMatch ? checknumMatch[1] : (fitidMatch ? fitidMatch[1] : '')).trim();
    const fitid = fitidMatch ? fitidMatch[1].trim() : undefined;
    const checknum = checknumMatch ? checknumMatch[1].trim() : undefined;
    const idUnico = fitid || `trn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    transacoes.push({
      id: idUnico,
      data: dataFormatada,
      descricao: descricao || 'Lançamento sem descrição',
      documentoRef: docRef,
      documento: checknum || docRef,
      fitid,
      tipo,
      valor: valorAbsoluto,
      valorOriginal: valorNumerico
    });
  }

  // Ordena por data (mais recente primeiro)
  transacoes.sort((a, b) => b.data.localeCompare(a.data));

  const dataInicio = transacoes.length > 0 ? transacoes[transacoes.length - 1].data : undefined;
  const dataFim = transacoes.length > 0 ? transacoes[0].data : undefined;

  return {
    bancoId,
    contaId,
    moeda,
    saldoFinal,
    dataInicio,
    dataFim,
    transacoes
  };
}

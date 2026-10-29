import { TransacaoOFX } from './ofxParser';

/**
 * Normaliza e converte strings monetárias de extratos bancários brasileiros e internacionais.
 * Suporta formatos:
 * - "R$ 0,40", "-R$ 300,00", "-R$ 1.402,34", "R$ 13.609,16"
 * - "-R$ 4.614,01", "R$ 10.000,00"
 * - "1.250,50", "-25,00", "5200.00", "-45.00"
 * - "(1.402,34)", "1.402,34 D", "1.402,34 C", "1.402,34-"
 */
export function parseValorMonetario(raw: string): number | null {
  if (raw === undefined || raw === null) return null;
  const texto = String(raw).trim();
  if (!texto) return null;

  // Detecta se é negativo por parênteses: (1.250,00) ou (R$ 1.250,00)
  const isParentesesNegativo = /^\(.*\)$/.test(texto);

  // Detecta sufixo de débito (D ou -) ou crédito (C ou +)
  const isDebitoSufixo = /[0-9\s]+(D|-)$/i.test(texto);
  const isSinalMenos = texto.includes('-');

  const isNegativo = isParentesesNegativo || isDebitoSufixo || isSinalMenos;

  // Deixa apenas números, pontos e vírgulas
  const limpo = texto.replace(/[^0-9,.]/g, '').trim();
  if (!limpo) return null;

  let valorFinal: number | null = null;


  // Possui vírgula e ponto: decide com base em qual aparece por último
  if (limpo.includes(',') && limpo.includes('.')) {
    const lastComma = limpo.lastIndexOf(',');
    const lastDot = limpo.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.402,34 -> remove pontos, troca vírgula por ponto
      const normalizado = limpo.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(normalizado);
      valorFinal = isNaN(parsed) ? null : parsed;
    } else {
      // Padrão internacional: 1,402.34 -> remove vírgulas
      const normalizado = limpo.replace(/,/g, '');
      const parsed = parseFloat(normalizado);
      valorFinal = isNaN(parsed) ? null : parsed;
    }
  } else if (limpo.includes(',')) {
    // Formato brasileiro com vírgula decimal (ex: 1402,34 ou 0,40)
    const semPontos = limpo.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(semPontos);
    valorFinal = isNaN(parsed) ? null : parsed;
  } else if (/^\d+(\.\d+)?$/.test(limpo)) {
    // Formato numérico simples com ponto decimal ou inteiro
    const parsed = parseFloat(limpo);
    valorFinal = isNaN(parsed) ? null : parsed;
  }

  if (valorFinal === null) return null;
  return isNegativo ? -Math.abs(valorFinal) : Math.abs(valorFinal);
}

/**
 * Converte data em vários formatos (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) para YYYY-MM-DD
 */
export function normalizarDataExtrato(raw: string): string | null {
  if (!raw) return null;
  const limpo = raw.trim();

  // DD/MM/YYYY ou DD-MM-YYYY
  const matchBR = limpo.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (matchBR) {
    const [, dia, mes, ano] = matchBR;
    return `${ano}-${mes}-${dia}`;
  }

  // YYYY-MM-DD ou YYYY/MM/DD
  const matchISO = limpo.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (matchISO) {
    const [, ano, mes, dia] = matchISO;
    return `${ano}-${mes}-${dia}`;
  }

  return null;
}

/**
 * Divide uma linha CSV respeitando aspas duplas
 */
export function splitLinhaCSV(linha: string, delimitador: string): string[] {
  const colunas: string[] = [];
  let buffer = '';
  let emAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      emAspas = !emAspas;
    } else if (ch === delimitador && !emAspas) {
      colunas.push(buffer.trim().replace(/^["']|["']$/g, ''));
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  colunas.push(buffer.trim().replace(/^["']|["']$/g, ''));
  return colunas;
}

/**
 * Detecta o delimitador CSV mais provável analisando as primeiras linhas não vazias
 */
function detectarDelimitadorCSV(linhas: string[]): string {
  const delimitadores = [';', ',', '\t', '|'];
  const pontuacao: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };

  const amostra = linhas.slice(0, 15);
  for (const linha of amostra) {
    for (const d of delimitadores) {
      // Conta ocorrências fora de aspas
      const cols = splitLinhaCSV(linha, d);
      if (cols.length > 1) {
        pontuacao[d] += cols.length;
      }
    }
  }

  let melhorDelimitador = ';';
  let maxPontos = -1;
  for (const d of delimitadores) {
    if (pontuacao[d] > maxPontos) {
      maxPontos = pontuacao[d];
      melhorDelimitador = d;
    }
  }

  return melhorDelimitador;
}

interface MapeamentoColunas {
  linhaCabecalhoIdx: number;
  colData: number;
  colDescricao: number;
  colValor: number;
  colDocumento: number;
  colCredito: number;
  colDebito: number;
  colSaldo: number;
}

/**
 * Normaliza string para comparação de cabeçalhos
 */
function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Localiza a linha de cabeçalho e mapeia as colunas por sinônimos
 */
function identificarCabecalho(linhas: string[], delimitador: string): MapeamentoColunas | null {
  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const colunas = splitLinhaCSV(linhas[i], delimitador).map(normalizarTexto);
    if (colunas.length < 2) continue;

    let colData = -1;
    let colDescricao = -1;
    let colValor = -1;
    let colDocumento = -1;
    let colCredito = -1;
    let colDebito = -1;
    let colSaldo = -1;

    for (let c = 0; c < colunas.length; c++) {
      const col = colunas[c];

      // Status / Situação (ignora)
      if (col.includes('status') || col.includes('situacao')) {
        continue;
      }

      // Saldo (deve ser checado antes de valor para evitar falsos positivos)
      if (col.includes('saldo') || col.includes('balance')) {
        colSaldo = c;
        continue;
      }

      // Data
      if (
        col === 'data' ||
        col.startsWith('data') ||
        col === 'dt' ||
        col === 'date' ||
        col.includes('data da transacao') ||
        col.includes('data lancamento') ||
        col.includes('data movimento')
      ) {
        colData = c;
        continue;
      }

      // Descrição / Histórico
      if (
        col === 'descricao' ||
        col === 'historico' ||
        col.startsWith('descricao') ||
        col.startsWith('historico') ||
        col.includes('lancamento') ||
        col.includes('detalhe') ||
        col.includes('memo') ||
        col.includes('favorecido')
      ) {
        colDescricao = c;
        continue;
      }

      // Documento
      if (
        col.includes('documento') ||
        col === 'doc' ||
        col === 'docto' ||
        col.includes('nº doc') ||
        col.includes('num doc')
      ) {
        colDocumento = c;
        continue;
      }

      // Crédito
      if (col.includes('credito') || col.includes('entradas') || col === 'credit') {
        colCredito = c;
        continue;
      }

      // Débito
      if (col.includes('debito') || col.includes('saidas') || col === 'debit') {
        colDebito = c;
        continue;
      }

      // Valor
      if (
        col.includes('valor') ||
        col.includes('amount') ||
        col.includes('montante')
      ) {
        colValor = c;
        continue;
      }
    }

    // Valida se encontramos ao menos Data e (Valor ou Crédito/Débito)
    const temData = colData !== -1;
    const temValor = colValor !== -1 || (colCredito !== -1 && colDebito !== -1);
    const temDescricao = colDescricao !== -1;

    if (temData && (temValor || temDescricao)) {
      return {
        linhaCabecalhoIdx: i,
        colData,
        colDescricao,
        colValor,
        colDocumento,
        colCredito,
        colDebito,
        colSaldo
      };
    }
  }

  return null;
}

/**
 * Parser inteligente de extratos bancários em formato CSV / TSV / Texto delimitado.
 * Suporta formatos dos principais bancos brasileiros (Santander, XP Empresas, Itaú, Bradesco, Inter, Nubank, Banco do Brasil, C6).
 */
export function parseCSVExtrato(conteudo: string): { transacoes: TransacaoOFX[]; dataInicio?: string; dataFim?: string } {
  const transacoes: TransacaoOFX[] = [];
  if (!conteudo) return { transacoes: [] };

  const linhas = conteudo.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (linhas.length === 0) return { transacoes: [] };

  const delimitador = detectarDelimitadorCSV(linhas);
  const cabecalho = identificarCabecalho(linhas, delimitador);

  const startIdx = cabecalho ? cabecalho.linhaCabecalhoIdx + 1 : 0;

  for (let i = startIdx; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const colunas = splitLinhaCSV(linha, delimitador);
    if (colunas.length < 2) continue;

    let dataIso: string | null = null;
    let descricao: string = '';
    let docRef: string = '';
    let valorFinal: number | null = null;

    if (cabecalho) {
      // 1. EXTRAÇÃO VIA CABEÇALHO MAPEADO
      if (cabecalho.colData !== -1 && colunas[cabecalho.colData]) {
        dataIso = normalizarDataExtrato(colunas[cabecalho.colData]);
      }

      if (cabecalho.colDescricao !== -1 && colunas[cabecalho.colDescricao]) {
        descricao = colunas[cabecalho.colDescricao].trim();
      }

      if (cabecalho.colDocumento !== -1 && colunas[cabecalho.colDocumento]) {
        docRef = colunas[cabecalho.colDocumento].trim();
      }

      if (cabecalho.colValor !== -1 && colunas[cabecalho.colValor] !== undefined) {
        valorFinal = parseValorMonetario(colunas[cabecalho.colValor]);
      } else if (cabecalho.colCredito !== -1 || cabecalho.colDebito !== -1) {
        const valCredito = cabecalho.colCredito !== -1 ? parseValorMonetario(colunas[cabecalho.colCredito]) : null;
        const valDebito = cabecalho.colDebito !== -1 ? parseValorMonetario(colunas[cabecalho.colDebito]) : null;

        if (valCredito !== null && valCredito > 0) {
          valorFinal = valCredito;
        } else if (valDebito !== null && valDebito !== 0) {
          valorFinal = -Math.abs(valDebito);
        }
      }
    }

    // 2. FALLBACK HEURÍSTICO (se não houve cabeçalho mapeado ou se a linha não casou)
    if (!dataIso || valorFinal === null) {
      let dataAchada: string | null = null;
      let valorAchado: number | null = null;
      let descAchada: string = '';
      let docAchado: string = '';

      for (let c = 0; c < colunas.length; c++) {
        const col = colunas[c].trim();
        if (!col) continue;

        // Se tiver cabeçalho e esta coluna for o Saldo, pula categoricamente
        if (cabecalho && c === cabecalho.colSaldo) continue;

        // Tenta data
        if (!dataAchada) {
          const dt = normalizarDataExtrato(col);
          if (dt) {
            dataAchada = dt;
            continue;
          }
        }

        // Tenta valor monetário: verifica se tem cara de moeda (R$, vírgula decimal, sinal negativo ou decimal explícito)
        const temSinalMoeda = col.includes('R$') || col.includes(',') || col.includes('-');
        const parsedVal = parseValorMonetario(col);

        // Não aceita como valor colunas que sejam número inteiro sem pontuação monetária (ex: 194731 ou 0000000000)
        // a não ser que tenha R$ ou seja precedido de menos
        const ehDocumentoPuro = /^\d{4,15}$/.test(col) && !temSinalMoeda;

        if (valorAchado === null && parsedVal !== null && !ehDocumentoPuro) {
          valorAchado = parsedVal;
          continue;
        }

        if (ehDocumentoPuro && !docAchado) {
          docAchado = col;
          continue;
        }

        // Se tem mais de 2 letras e não foi consumido, assume como descrição
        if (!descAchada && col.length >= 2 && !/^\d{2,4}[-\/]\d{2}[-\/]\d{2,4}$/.test(col)) {
          descAchada = col;
        } else if (!docAchado && /^[A-Za-z0-9\-_]{4,20}$/.test(col)) {
          docAchado = col;
        }
      }

      if (dataAchada && valorAchado !== null) {
        dataIso = dataAchada;
        valorFinal = valorAchado;
        if (!descricao) descricao = descAchada;
        if (!docRef) docRef = docAchado;
      }
    }

    // Ignora linhas de saldo isolado ou cabeçalhos residuais
    if (descricao && /^(saldo\s*(do\s*dia|anterior|final|bloqueado|disponivel)?|total\s*(entradas|saidas)?)$/i.test(descricao)) {
      continue;
    }

    if (dataIso && valorFinal !== null) {
      const tipo: 'CREDITO' | 'DEBITO' = valorFinal >= 0 ? 'CREDITO' : 'DEBITO';
      transacoes.push({
        id: `extrato-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
        data: dataIso,
        descricao: descricao || 'Lançamento bancário',
        documentoRef: docRef,
        documento: docRef,
        tipo,
        valor: Math.abs(valorFinal),
        valorOriginal: valorFinal
      });
    }
  }

  // Ordena por data decrescente
  transacoes.sort((a, b) => b.data.localeCompare(a.data));
  const dataInicio = transacoes.length > 0 ? transacoes[transacoes.length - 1].data : undefined;
  const dataFim = transacoes.length > 0 ? transacoes[0].data : undefined;

  return {
    transacoes,
    dataInicio,
    dataFim
  };
}


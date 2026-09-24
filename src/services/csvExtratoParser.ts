import { TransacaoOFX } from './ofxParser';

/**
 * Converte strings monetárias variadas (brasileiras: 1.250,50 ou internacionais: 1,250.50 ou simples: 5200.00) em number
 */
function parseValorMonetario(raw: string): number | null {
  if (!raw) return null;
  const limpo = raw.replace(/[R$\s"']/g, '').trim();
  if (!limpo) return null;

  // Possui vírgula e ponto: decide com base em qual aparece por último
  if (limpo.includes(',') && limpo.includes('.')) {
    const lastComma = limpo.lastIndexOf(',');
    const lastDot = limpo.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.250,50 -> remove pontos, troca vírgula por ponto
      const normalizado = limpo.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(normalizado);
      return isNaN(parsed) ? null : parsed;
    } else {
      // Padrão internacional: 1,250.50 -> remove vírgulas
      const normalizado = limpo.replace(/,/g, '');
      const parsed = parseFloat(normalizado);
      return isNaN(parsed) ? null : parsed;
    }
  }

  // Formato brasileiro com apenas vírgula decimal (ex: 1250,50 ou -25,00)
  if (limpo.includes(',')) {
    const semPontos = limpo.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(semPontos);
    return isNaN(parsed) ? null : parsed;
  }

  // Formato simples ou com ponto decimal (ex: 5200.00 ou -45.00 ou 1000)
  if (/^-?\d+(\.\d+)?$/.test(limpo)) {
    const parsed = parseFloat(limpo);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Parser inteligente de extratos bancários em formato CSV / TSV / Texto delimitado.
 * Suporta formatos dos principais bancos brasileiros (Itaú, Bradesco, Santander, Inter, Nubank, Banco do Brasil, C6).
 */
export function parseCSVExtrato(conteudo: string): { transacoes: TransacaoOFX[]; dataInicio?: string; dataFim?: string } {
  const transacoes: TransacaoOFX[] = [];
  if (!conteudo) return { transacoes: [] };

  const linhas = conteudo.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (linhas.length === 0) return { transacoes: [] };

  // Detecta o delimitador mais provável (; , \t)
  const primeiraLinha = linhas[0];
  const countPontoVirgula = (primeiraLinha.match(/;/g) || []).length;
  const countVirgula = (primeiraLinha.match(/,/g) || []).length;
  const countTab = (primeiraLinha.match(/\t/g) || []).length;

  let delimitador = ';';
  if (countTab > countPontoVirgula && countTab > countVirgula) delimitador = '\t';
  else if (countVirgula > countPontoVirgula) delimitador = ',';

function splitLinhaCSV(linha: string, delimitador: string): string[] {
  if (delimitador !== ',') {
    return linha.split(delimitador).map(c => c.trim().replace(/^["']|["']$/g, ''));
  }

  const colunas: string[] = [];
  let buffer = '';
  let emAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      emAspas = !emAspas;
    } else if (ch === ',' && !emAspas) {
      colunas.push(buffer.trim().replace(/^["']|["']$/g, ''));
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  colunas.push(buffer.trim().replace(/^["']|["']$/g, ''));
  return colunas;
}

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const colunas = splitLinhaCSV(linha, delimitador);
    if (colunas.length < 2) continue;

    // Tenta encontrar coluna de data, descrição e valor
    let dataVal: string | null = null;
    let descVal: string | null = null;
    let valorVal: number | null = null;
    let docRef: string = '';

    for (let c = 0; c < colunas.length; c++) {
      const col = colunas[c];

      // Testa se é data DD/MM/AAAA ou AAAA-MM-DD
      if (!dataVal) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(col)) {
          const parts = col.split('/');
          dataVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
          continue;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(col)) {
          dataVal = col;
          continue;
        }
      }

      // Testa se é valor monetário
      const valorParsed = parseValorMonetario(col);
      if (valorVal === null && valorParsed !== null && valorParsed !== 0) {
        valorVal = valorParsed;
        continue;
      }

      // Se tem mais de 2 caracteres e não é número, assume descrição
      if (!descVal && col.length >= 2 && valorParsed === null && !/^\d{2,4}[-/]\d{2}[-/]\d{2,4}$/.test(col)) {
        descVal = col;
      } else if (!docRef && /^\w{4,20}$/.test(col)) {
        docRef = col;
      }
    }

    if (dataVal && valorVal !== null) {
      const tipo: 'CREDITO' | 'DEBITO' = valorVal >= 0 ? 'CREDITO' : 'DEBITO';
      transacoes.push({
        id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
        data: dataVal,
        descricao: descVal || 'Lançamento bancário',
        documentoRef: docRef,
        documento: docRef,
        tipo,
        valor: Math.abs(valorVal),
        valorOriginal: valorVal
      });
    }
  }

  transacoes.sort((a, b) => b.data.localeCompare(a.data));
  const dataInicio = transacoes.length > 0 ? transacoes[transacoes.length - 1].data : undefined;
  const dataFim = transacoes.length > 0 ? transacoes[0].data : undefined;

  return {
    transacoes,
    dataInicio,
    dataFim
  };
}

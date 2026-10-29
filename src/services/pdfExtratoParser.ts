import { TransacaoOFX } from './ofxParser';
import { normalizarDataExtrato, parseValorMonetario } from './csvExtratoParser';

/**
 * Parser de texto extraído de extratos em PDF (Santander Empresas, XP Empresas, Itaú, Bradesco, etc.)
 */
export function parseTextoExtratoBancario(texto: string): { transacoes: TransacaoOFX[]; dataInicio?: string; dataFim?: string } {
  const transacoes: TransacaoOFX[] = [];
  if (!texto) return { transacoes: [] };

  const linhas = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let dataSecaoAtual: string | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Ignora linhas de cabeçalho corporativo, rodapé ou saldos consolidados
    if (
      /^(extrato|saldo\s*do\s*dia|saldo\s*disponivel|saldo\s*inicial|saldo\s*final|entradas|saidas|periodo|cliente|agencia|conta|emitido|fale\s*conosco|sac\b|ouvidoria|\d+\/\d+$)/i.test(linha) ||
      /^per[ií]odo\s*de\s*visualiza[cç][aã]o/i.test(linha) ||
      /^central\s*de\s*atendimento/i.test(linha) ||
      /^entenda\s*a\s*composi[cç][aã]o/i.test(linha) ||
      /^[a-j]\s*[–-]\s*saldo/i.test(linha)
    ) {
      continue;
    }

    // 1. Detecta cabeçalho de data em bloco (Padrão XP PDF: "03/08/2026 Valor" ou "03/08/2026")
    const matchDataBloco = linha.match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+valor)?$/i);
    if (matchDataBloco) {
      dataSecaoAtual = normalizarDataExtrato(matchDataBloco[1]);
      continue;
    }

    // 2. Linha com data no início (Padrão Santander PDF: "31/08/2026 Rendimento... 0,40 70.928,42")
    const matchLinhaComData = linha.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+)$/);
    if (matchLinhaComData) {
      const dataIso = normalizarDataExtrato(matchLinhaComData[1]);
      const restante = matchLinhaComData[2].trim();

      // Procura valores no final: opcionalmente saldo no final e valor da transação antes
      // Ex: "PIX ENVIADO ... -300,00 70.928,02" ou "PIX RECEBIDO ... 13.609,16 90.833,32" ou apenas "PIX... -R$ 300,00"
      const matchValores = restante.match(/(-?R?\$?\s*[\d.]+,\d{2})\s+(-?R?\$?\s*[\d.]+,\d{2})$/i) ||
                           restante.match(/(-?R?\$?\s*[\d.]+,\d{2})$/i);

      if (matchValores && dataIso) {
        // Se pegou 2 valores, o primeiro é o valor da transação e o segundo é o saldo
        const rawValor = matchValores[1];
        const valorFinal = parseValorMonetario(rawValor);

        if (valorFinal !== null) {
          // Extrai a descrição (tudo antes dos valores)
          let desc = restante.substring(0, restante.lastIndexOf(rawValor)).trim();
          let doc = '';

          // Verifica se sobrou número de documento no fim da descrição (ex: 213530 ou 0000000000)
          const matchDoc = desc.match(/\s+(\d{6,15})$/);
          if (matchDoc) {
            doc = matchDoc[1];
            desc = desc.substring(0, desc.lastIndexOf(doc)).trim();
          }

          const tipo: 'CREDITO' | 'DEBITO' = valorFinal >= 0 ? 'CREDITO' : 'DEBITO';
          transacoes.push({
            id: `pdf-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
            data: dataIso,
            descricao: desc || 'Lançamento bancário',
            documentoRef: doc,
            documento: doc,
            tipo,
            valor: Math.abs(valorFinal),
            valorOriginal: valorFinal
          });
          continue;
        }
      }
    }

    // 3. Linha pertencente ao bloco de data atual (Padrão XP PDF: "Pix enviado para Agaxtur... -R$ 4.614,01")
    if (dataSecaoAtual) {
      const matchLinhaBloco = linha.match(/^(.+?)\s+(-?R\$\s*[\d.]+,\d{2})$/i) ||
                             linha.match(/^(.+?)\s+(-?[\d.]+,\d{2}\s*[DC]?)$/i);

      if (matchLinhaBloco) {
        const desc = matchLinhaBloco[1].trim();
        const rawValor = matchLinhaBloco[2].trim();
        const valorFinal = parseValorMonetario(rawValor);

        if (valorFinal !== null && !/^(saldo|total)/i.test(desc)) {
          const tipo: 'CREDITO' | 'DEBITO' = valorFinal >= 0 ? 'CREDITO' : 'DEBITO';
          transacoes.push({
            id: `pdf-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
            data: dataSecaoAtual,
            descricao: desc || 'Lançamento bancário',
            documentoRef: '',
            documento: '',
            tipo,
            valor: Math.abs(valorFinal),
            valorOriginal: valorFinal
          });
        }
      }
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

/**
 * Lê arquivo PDF de extrato bancário usando pdfjs-dist e extrai as transações
 */
export async function parsePDFExtrato(file: File): Promise<{ transacoes: TransacaoOFX[]; dataInicio?: string; dataFim?: string }> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      } catch {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const linhasTotais: string[] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();

      // Agrupa itens de texto por coordenada vertical Y aproximada
      const itensPorLinha: Map<number, { x: number; str: string }[]> = new Map();

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);

        // Encontra linha Y mais próxima dentro de tolerância de 3px
        let chaveY = y;
        for (const k of itensPorLinha.keys()) {
          if (Math.abs(k - y) <= 3) {
            chaveY = k;
            break;
          }
        }

        if (!itensPorLinha.has(chaveY)) {
          itensPorLinha.set(chaveY, []);
        }
        itensPorLinha.get(chaveY)!.push({ x, str: item.str });
      }

      // Ordena linhas de cima para baixo (Y decrescente)
      const chavesOrdenadas = Array.from(itensPorLinha.keys()).sort((a, b) => b - a);
      for (const k of chavesOrdenadas) {
        const itens = itensPorLinha.get(k)!;
        // Ordena itens da esquerda para a direita (X crescente)
        itens.sort((a, b) => a.x - b.x);
        const linhaTexto = itens.map(i => i.str.trim()).join(' ');
        if (linhaTexto) {
          linhasTotais.push(linhaTexto);
        }
      }
    }

    const textoCompleto = linhasTotais.join('\n');
    return parseTextoExtratoBancario(textoCompleto);
  } catch (err) {
    console.error('[PDFExtratoParser] Erro ao extrair texto do PDF:', err);
    throw new Error('Falha ao processar o extrato em PDF. Certifique-se de que o arquivo não possui senha.');
  }
}

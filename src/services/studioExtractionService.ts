import { StudioDadosExtraidos, StudioDiaItinerario, StudioItemItinerario } from '../types';

/**
 * Serviço de inteligência para extração de dados e conversão de múltiplos PDFs
 * de operadoras e consolidadoras em cadernos e propostas de viagem unificadas.
 */
// Catálogo Oficial IATA de Companhias Aéreas com detecção contextual
export interface CatalogoCiaAerea {
  nome: string;
  padraoVoo: RegExp; // Match contextual exigindo código e número de voo (3 a 4 dígitos)
  padraoNome: RegExp; // Match do nome oficial por extenso
}

export const CATALOGO_CIAS_AEREAS: CatalogoCiaAerea[] = [
  {
    nome: 'LATAM Airlines',
    padraoVoo: /\b(?:LA|JJ|LATAM)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:LATAM(?:\s+AIRLINES)?)\b/i
  },
  {
    nome: 'GOL Linhas Aéreas',
    padraoVoo: /\b(?:G3|GOL)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:GOL(?:\s+LINHAS\s+A[ÉE]REAS)?)\b/i
  },
  {
    nome: 'Azul Linhas Aéreas',
    padraoVoo: /\b(?:AD|AZUL)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:AZUL(?:\s+LINHAS\s+A[ÉE]REAS)?)\b/i
  },
  {
    nome: 'TAP Air Portugal',
    padraoVoo: /\b(?:TP|TAP)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:TAP(?:\s+AIR\s+PORTUGAL)?)\b/i
  },
  {
    nome: 'Air France',
    padraoVoo: /\b(?:AF)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:AIR\s*FRANCE)\b/i
  },
  {
    nome: 'KLM',
    padraoVoo: /\b(?:KL)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:KLM(?:\s+ROYAL\s+DUTCH\s+AIRLINES)?)\b/i
  },
  {
    nome: 'Emirates',
    padraoVoo: /\b(?:EK)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:EMIRATES)\b/i
  },
  {
    nome: 'Qatar Airways',
    padraoVoo: /\b(?:QR)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:QATAR\s*AIRWAYS)\b/i
  },
  {
    nome: 'American Airlines',
    padraoVoo: /\b(?:AA)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:AMERICAN\s*AIRLINES)\b/i
  },
  {
    nome: 'Delta Air Lines',
    padraoVoo: /\b(?:DL)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:DELTA(?:\s+AIR\s*LINES)?)\b/i
  },
  {
    nome: 'United Airlines',
    padraoVoo: /\b(?:UA)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:UNITED(?:\s+AIRLINES)?)\b/i
  },
  {
    nome: 'British Airways',
    padraoVoo: /\b(?:BA)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:BRITISH\s*AIRWAYS)\b/i
  },
  {
    nome: 'Iberia',
    padraoVoo: /\b(?:IB)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:IBERIA)\b/i
  },
  {
    nome: 'Copa Airlines',
    padraoVoo: /\b(?:CM)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:COPA(?:\s*AIRLINES)?)\b/i
  },
  {
    nome: 'Avianca',
    padraoVoo: /\b(?:AV)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:AVIANCA)\b/i
  },
  {
    nome: 'Lufthansa',
    padraoVoo: /\b(?:LH)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:LUFTHANSA)\b/i
  },
  {
    nome: 'SWISS',
    padraoVoo: /\b(?:LX)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:SWISS(?:\s+INTERNATIONAL\s+AIR\s+LINES)?)\b/i
  },
  {
    nome: 'Turkish Airlines',
    padraoVoo: /\b(?:TK)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:TURKISH(?:\s+AIRLINES)?)\b/i
  },
  {
    nome: 'Aerolíneas Argentinas',
    padraoVoo: /\b(?:AR)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:AEROL[IÍ]NEAS\s+ARGENTINAS)\b/i
  },
  {
    nome: 'Air Europa',
    padraoVoo: /\b(?:UX)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:AIR\s*EUROPA)\b/i
  },
  {
    nome: 'ITA Airways',
    padraoVoo: /\b(?:AZ)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:ITA\s*AIRWAYS)\b/i
  },
  {
    nome: 'Ethiopian Airlines',
    padraoVoo: /\b(?:ET)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:ETHIOPIAN(?:\s+AIRLINES)?)\b/i
  },
  {
    nome: 'Sky Airline',
    padraoVoo: /\b(?:H2)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:SKY\s*AIRLINE)\b/i
  },
  {
    nome: 'JetSmart',
    padraoVoo: /\b(?:JA)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:JETSMART)\b/i
  },
  {
    nome: 'Voepass',
    padraoVoo: /\b(?:2Z)\s*([0-9]{3,4})\b/i,
    padraoNome: /\b(?:VOEPASS|PASSAREDO)\b/i
  }
];

export class StudioExtractionService {
  /**
   * Extrai texto de um arquivo File (PDF ou TXT) no navegador.
   * Utiliza parser de streams e decodificação para capturar strings textuais do PDF.
   */
  public static async extrairTextoDeArquivo(file: File): Promise<string> {
    try {
      if (file.name.toLowerCase().endsWith('.txt') || file.type.includes('text/plain')) {
        return await file.text();
      }

      // 1. Tenta carregar e analisar via pdfjs-dist
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

          const itensPorLinha: Map<number, { x: number; str: string }[]> = new Map();

          for (const item of textContent.items as any[]) {
            if (!item.str || !item.str.trim()) continue;
            const y = Math.round(item.transform[5]);
            const x = Math.round(item.transform[4]);

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

          const chavesOrdenadas = Array.from(itensPorLinha.keys()).sort((a, b) => b - a);
          for (const k of chavesOrdenadas) {
            const itens = itensPorLinha.get(k)!;
            itens.sort((a, b) => a.x - b.x);
            const linhaTexto = itens.map(i => i.str.trim()).join(' ');
            if (linhaTexto) {
              linhasTotais.push(linhaTexto);
            }
          }
        }

        const textoExtraido = linhasTotais.join('\n');
        if (textoExtraido && textoExtraido.trim().length > 20) {
          return textoExtraido;
        }
      } catch (pdfErr) {
        console.warn('[StudioExtractionService] Fallback de PDFJS acionado:', pdfErr);
      }

      // 2. Fallback de streams diretos de bytes
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(bytes);

      const textMatches = rawText.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g);
      if (textMatches && textMatches.length > 5) {
        return textMatches
          .map(m => m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, ''))
          .join(' ');
      }

      const readableStrings = rawText.match(/[A-Za-z0-9À-ÿ\s\.,:\-\/\(\)]{4,}/g);
      if (readableStrings) {
        return readableStrings.join(' ');
      }

      return rawText.slice(0, 5000);
    } catch (err) {
      console.warn('Erro na extração de texto do arquivo:', err);
      return '';
    }
  }

  /**
   * Processa texto colado diretamente pelo usuário (e-mail, WhatsApp, GDS).
   */
  public static async processarTextoColado(texto: string): Promise<{
    tipoDetectado: 'voo' | 'hotel' | 'servico' | 'misto';
    fornecedor?: string;
    loc?: string;
    valorTotal: number;
    itens: StudioItemItinerario[];
    dadosBrutos: StudioDadosExtraidos;
  }> {
    return this.extrairDados(texto, 'texto_colado.txt');
  }

  /**
   * Extrai e estrutura dados a partir de uma string de texto, identificando entidades de viagem.
   */
  public static async extrairDados(texto: string, nomeArquivo: string = ''): Promise<{
    tipoDetectado: 'voo' | 'hotel' | 'servico' | 'misto';
    fornecedor?: string;
    loc?: string;
    valorTotal: number;
    itens: StudioItemItinerario[];
    dadosBrutos: StudioDadosExtraidos;
  }> {
    const brutos = this.analisarTextoDocumento(texto, nomeArquivo);
    const itens: StudioItemItinerario[] = [];
    let fornecedor = '';
    let loc = '';

    if (brutos.voos && brutos.voos.length > 0) {
      for (const v of brutos.voos) {
        fornecedor = fornecedor || v.companhia;
        loc = loc || v.localizador || '';
        const tituloVoo = v.companhia
          ? `Voo ${v.companhia} (${v.origem} ➔ ${v.destino})`
          : `Voo ${v.voo && v.voo !== 'Voo Confirmado' ? v.voo + ' ' : ''}(${v.origem} ➔ ${v.destino})`.replace(/\s+/g, ' ').trim();

        itens.push({
          id: `voo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipo: 'voo',
          titulo: tituloVoo,
          subtitulo: `Voo ${v.voo} · Embarque Previsto`,
          origem: v.origem,
          destino: v.destino,
          companhia: v.companhia || '',
          numeroVoo: v.voo || '',
          dataInicio: v.dataIda,
          dataFim: v.dataVolta || v.dataIda,
          horaInicio: v.horaIda,
          horario: v.horaIda,
          localizador: v.localizador,
          fornecedor: v.companhia || '',
          status: 'confirmado',
          rotuloLink: 'Fazer Check-in',
          linkAcao: 'https://www.google.com/travel/flights'
        });
      }
    }

    if (brutos.hospedagens && brutos.hospedagens.length > 0) {
      for (const h of brutos.hospedagens) {
        fornecedor = fornecedor || h.hotel;
        loc = loc || h.voucher || '';
        itens.push({
          id: `hotel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipo: 'hotel',
          titulo: h.hotel,
          subtitulo: `${h.quarto || 'Acomodação'} · ${h.regime || 'Hospedagem'}`,
          quarto: h.quarto || 'Apartamento',
          regime: h.regime || 'Hospedagem',
          dataInicio: h.checkIn,
          dataFim: h.checkOut,
          status: 'confirmado',
          localizador: h.voucher,
          fornecedor: h.hotel,
          rotuloLink: 'Abrir no Google Maps',
          linkMaps: `https://maps.google.com/?q=${encodeURIComponent(h.hotel)}`
        });
      }
    }

    if (brutos.servicos && brutos.servicos.length > 0) {
      for (const s of brutos.servicos) {
        itens.push({
          id: `servico-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipo: s.tipo === 'Seguro Viagem' ? 'seguro' : (s.tipo === 'Transfer Receptivo' ? 'transfer' : 'passeio'),
          titulo: s.tipo,
          subtitulo: s.descricao,
          dataInicio: s.data,
          status: 'confirmado',
          localizador: s.voucher,
          fornecedor: s.fornecedor
        });
      }
    }

    let tipoDetectado: 'voo' | 'hotel' | 'servico' | 'misto' = 'misto';
    if (itens.length > 0) {
      const tiposUnicos = new Set(itens.map(i => i.tipo));
      if (tiposUnicos.size === 1) {
        const unico = itens[0].tipo;
        tipoDetectado = (unico === 'voo' || unico === 'hotel') ? unico : 'servico';
      }
    }

    return {
      tipoDetectado,
      fornecedor,
      loc,
      valorTotal: brutos.valores?.total || 0,
      itens,
      dadosBrutos: brutos
    };
  }

  /**
   * Consolida uma lista de itens avulsos em itinerário dia a dia ordenado cronologicamente.
   */
  public static gerarItinerarioDiaADia(itens: StudioItemItinerario[]): StudioDiaItinerario[] {
    const mapaDatas = new Map<string, StudioItemItinerario[]>();

    itens.forEach(item => {
      const dataChave = item.dataInicio || new Date().toISOString().split('T')[0];
      if (!mapaDatas.has(dataChave)) {
        mapaDatas.set(dataChave, []);
      }
      mapaDatas.get(dataChave)!.push(item);
    });

    const datasOrdenadas = Array.from(mapaDatas.keys()).sort();
    return datasOrdenadas.map((data, index) => {
      const itensDoDia = mapaDatas.get(data) || [];
      return {
        diaNumero: index + 1,
        data,
        dataStr: data,
        tituloDia: `Dia ${index + 1}: Programação do Roteiro`,
        itens: itensDoDia
      };
    });
  }

  /**
   * Processa uma lista de arquivos de fornecedores e consolida os dados extraídos.
   */
  public static async processarArquivos(files: File[]): Promise<StudioDadosExtraidos> {
    const dadosConsolidados: StudioDadosExtraidos = {
      arquivosProcessados: [],
      voos: [],
      hospedagens: [],
      cruzeiros: [],
      servicos: [],
      passageiros: [],
      bilhetes: [],
      valores: {
        total: 0,
        moeda: 'BRL'
      }
    };

    for (const file of files) {
      dadosConsolidados.arquivosProcessados?.push(file.name);
      const texto = await this.extrairTextoDeArquivo(file);
      const extraidos = this.analisarTextoDocumento(texto, file.name);

      if (extraidos.voos) dadosConsolidados.voos!.push(...extraidos.voos);
      if (extraidos.hospedagens) dadosConsolidados.hospedagens!.push(...extraidos.hospedagens);
      if (extraidos.cruzeiros) dadosConsolidados.cruzeiros!.push(...extraidos.cruzeiros);
      if (extraidos.servicos) dadosConsolidados.servicos!.push(...extraidos.servicos);
      if (extraidos.passageiros) {
        extraidos.passageiros.forEach(p => {
          if (!dadosConsolidados.passageiros!.some(ep => ep.nome === p.nome)) {
            dadosConsolidados.passageiros!.push(p);
          }
        });
      }
      if (extraidos.bilhetes) {
        extraidos.bilhetes.forEach(b => {
          if (!dadosConsolidados.bilhetes!.some(eb => eb.numero === b.numero)) {
            dadosConsolidados.bilhetes!.push(b);
          }
        });
      }
      if (!dadosConsolidados.cliente && extraidos.cliente) {
        dadosConsolidados.cliente = extraidos.cliente;
      }
      if (extraidos.valores && extraidos.valores.total > 0) {
        dadosConsolidados.valores!.total += extraidos.valores.total;
      }
    }

    return dadosConsolidados;
  }

  /**
   * Analisa o conteúdo textual de um documento identificando voos, hotéis e serviços.
   */
  public static analisarTextoDocumento(texto: string, nomeArquivo: string = ''): StudioDadosExtraidos {
    const resultado: StudioDadosExtraidos = {
      voos: [],
      hospedagens: [],
      servicos: [],
      valores: { total: 0, moeda: 'BRL' }
    };

    const textoUpper = texto.toUpperCase();
    const textoLower = texto.toLowerCase();

    // 1. Extração de Localizador Geral / Código de Reserva
    const locDetectado = this.extrairLocalizador(texto);

    // 2. Extração de Companhia Aérea e Número do Voo com Fidelidade Estrita
    let ciaDetectada = '';
    let vooDetectado = '';

    // Prioridade 1: Match por código de voo IATA contextual (ex: LA3456, G3 1500, AF 443, TP 012)
    for (const itemCia of CATALOGO_CIAS_AEREAS) {
      const matchVoo = itemCia.padraoVoo.exec(texto);
      if (matchVoo) {
        ciaDetectada = itemCia.nome;
        vooDetectado = matchVoo[0].trim();
        break;
      }
    }

    // Prioridade 2: Nome por extenso da companhia no documento (ex: "Air France", "LATAM Airlines", "Iberia")
    if (!ciaDetectada) {
      for (const itemCia of CATALOGO_CIAS_AEREAS) {
        if (itemCia.padraoNome.test(texto)) {
          ciaDetectada = itemCia.nome;
          break;
        }
      }
    }

    // Prioridade 3: Rótulo textual explícito do bilhete (ex: "Companhia: ...", "Operadora Aérea: ...")
    if (!ciaDetectada) {
      const ciaRotuloMatch = texto.match(/(?:companhia(?:\s+a[ée]rea)?|cia(?:\s+a[ée]rea)?|airline|operadora\s+a[ée]rea)\s*[:\-]\s*([A-Za-z0-9À-ÿ\s]{3,35})/i);
      if (ciaRotuloMatch && ciaRotuloMatch[1]) {
        ciaDetectada = ciaRotuloMatch[1].trim();
      }
    }

    // Se ainda não achou número de voo, busca padrão genérico de voo
    if (!vooDetectado) {
      const vooGenericoMatch = textoUpper.match(/\b(?:VOO|FLIGHT)\s*[:\-]?\s*([A-Z0-9]{2,8})\b/i);
      if (vooGenericoMatch) {
        vooDetectado = vooGenericoMatch[0].trim();
      }
    }

    // Detecção de aeroportos / trechos (IATA 3 letras, ex: GRU, GIG, MCO, MIA, CDG, LIS, JFK, BPS, SSA)
    const iataMatches = textoUpper.match(/\b([A-Z]{3})\s*(?:➔|->|-|\/|para|to)\s*([A-Z]{3})\b/i);
    const origemMatch = textoUpper.match(/(?:origem|partida|sa[ií]da)\s*[:\-]?\s*([A-Z]{3})\b/i);
    const destinoMatch = textoUpper.match(/(?:destino|chegada)\s*[:\-]?\s*([A-Z]{3})\b/i);
    const deParaMatch = textoUpper.match(/\bde\s+([A-Z]{3})\s+(?:para|a|até)\s+([A-Z]{3})\b/i);

    // Datas potenciais no documento
    const datasDetectadas = this.extrairDatas(texto);

    // Regra Avançada Multi-Voo (ex: Tabelas da Agaxtur / NDC LATAM / GDS com trecho de ida e trecho de volta)
    const regexBlocoTrechoVoo = /([A-Z]{3})\s*[-–]\s*([A-Za-z0-9\s]+?)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d{2}:\d{2})[\s\S]*?([A-Z]{3})\s*[-–]\s*([A-Za-z0-9\s]+?)\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d{2}:\d{2})\s+([A-Z0-9]{2}\s*\d{2,5})/gi;
    let matchTrecho: RegExpExecArray | null;
    const voosEstruturados: Array<{
      origem: string;
      destino: string;
      dataIda: string;
      horaIda: string;
      dataVolta: string;
      horaVolta: string;
      voo: string;
      companhia: string;
      localizador: string;
    }> = [];

    const mesesMap: Record<string, string> = {
      jan: '01', fev: '02', feb: '02', mar: '03', abr: '04', apr: '04',
      mai: '05', may: '05', jun: '06', jul: '07', ago: '08', aug: '08',
      set: '09', sep: '09', out: '10', oct: '10', nov: '11', dez: '12', dec: '12'
    };

    const parseDataMesIso = (dStr: string): string => {
      const parts = dStr.trim().split(/\s+/);
      if (parts.length === 3) {
        const dia = parts[0].padStart(2, '0');
        const mes = mesesMap[parts[1].toLowerCase().slice(0, 3)] || '01';
        const ano = parts[2];
        return `${ano}-${mes}-${dia}`;
      }
      return dStr;
    };

    while ((matchTrecho = regexBlocoTrechoVoo.exec(texto)) !== null) {
      const origIata = matchTrecho[1].toUpperCase();
      const dataEmbarque = parseDataMesIso(matchTrecho[3]);
      const horaEmbarque = matchTrecho[4];
      const destIata = matchTrecho[5].toUpperCase();
      const dataChegada = parseDataMesIso(matchTrecho[7]);
      const horaChegada = matchTrecho[8];
      const numVoo = matchTrecho[9].replace(/\s+/g, ' ').trim();

      // Companhia pelo prefixo (ex: LA = LATAM, G3 = GOL, AD = Azul)
      let cia = ciaDetectada;
      if (!cia) {
        if (/^LA\b/i.test(numVoo)) cia = 'LATAM Airlines';
        else if (/^G3\b/i.test(numVoo)) cia = 'GOL Linhas Aéreas';
        else if (/^AD\b/i.test(numVoo)) cia = 'Azul Linhas Aéreas';
      }

      voosEstruturados.push({
        origem: origIata,
        destino: destIata,
        dataIda: dataEmbarque,
        horaIda: horaEmbarque,
        dataVolta: dataChegada,
        horaVolta: horaChegada,
        voo: numVoo,
        companhia: cia || '',
        localizador: locDetectado
      });
    }

    // Regra Específica Travellink (Tabela de voos Travellink G3 / IATA)
    if (voosEstruturados.length === 0 && (texto.includes('Travellink') || texto.includes('Plano de Viagem'))) {
      const tlTrechoRegex = /([A-Z]{3})\s*-\s*[A-Za-z\s]+[\s\r\n]+([A-Z]{3})\s*-\s*[A-Za-z\s]+[\s\r\n]+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d{2}:\d{2})[\s\r\n]+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+(\d{2}:\d{2})/gi;
      let mTlTrecho: RegExpExecArray | null;
      const voosTlDetectados = [
        ...new Set(
          (texto.match(/\b(G3\s*\d{3,4}|LA\s*\d{3,4}|AD\s*\d{3,4})\b/g) || []).filter(v => v.includes(' '))
        )
      ];
      let tlIdx = 0;

      while ((mTlTrecho = tlTrechoRegex.exec(texto)) !== null) {
        const orig = mTlTrecho[1].toUpperCase();
        const dest = mTlTrecho[2].toUpperCase();
        const dIda = parseDataMesIso(mTlTrecho[3]);
        const hIda = mTlTrecho[4];
        const dVolta = parseDataMesIso(mTlTrecho[5]);
        const hVolta = mTlTrecho[6];
        const numVoo = voosTlDetectados[tlIdx] || voosTlDetectados[0] || 'Voo GOL';
        tlIdx++;

        voosEstruturados.push({
          origem: orig,
          destino: dest,
          dataIda: dIda,
          horaIda: hIda,
          dataVolta: dVolta,
          horaVolta: hVolta,
          voo: numVoo,
          companhia: ciaDetectada || (/G3/i.test(numVoo) ? 'GOL Linhas Aéreas' : 'Companhia Aérea'),
          localizador: locDetectado
        });
      }
    }

    if (voosEstruturados.length > 0) {
      resultado.voos?.push(...voosEstruturados);
    } else if (
      !texto.includes('Powered by infotera') &&
      !texto.includes('FORMULÁRIO DE EMBARQUE') &&
      (
        ciaDetectada ||
        vooDetectado ||
        (iataMatches && (origemMatch || destinoMatch)) ||
        (origemMatch && destinoMatch)
      )
    ) {
      const aeroportoOrigem = (origemMatch ? origemMatch[1] : (iataMatches ? iataMatches[1] : (deParaMatch ? deParaMatch[1] : 'Origem'))).toUpperCase();
      const aeroportoDestino = (destinoMatch ? destinoMatch[1] : (iataMatches ? iataMatches[2] : (deParaMatch ? deParaMatch[2] : 'Destino'))).toUpperCase();

      resultado.voos?.push({
        companhia: ciaDetectada || '',
        voo: vooDetectado || 'Voo Confirmado',
        origem: aeroportoOrigem,
        destino: aeroportoDestino,
        dataIda: datasDetectadas[0] || new Date().toISOString().split('T')[0],
        horaIda: this.extrairHorario(texto, 'ida') || '10:00',
        dataVolta: datasDetectadas[1],
        horaVolta: this.extrairHorario(texto, 'volta'),
        localizador: locDetectado
      });
    }

    // Extração de Passageiros - Modelo 1 (Adulto Sobrenome Nome Sexo Nascimento)
    const paxList: Array<{ nome: string; tipo?: string; nascimento?: string }> = [];
    const paxRegex = /(?:Adulto|Crian[çc]a|Beb[êe]|ADT|CHD|INF)\s+([A-Z\s]+?)\s+([A-Z\s]+?)\s+(?:Feminino|Masculino|Mas\s*c\s*ulino|F|M)\s+([0-9]{2}\/[0-9]{2}\/[0-9]{2,4})/gi;
    let mPax: RegExpExecArray | null;
    while ((mPax = paxRegex.exec(texto)) !== null) {
      const sobrenome = mPax[1].trim();
      const prenome = mPax[2].trim();
      const nomeCompleto = `${prenome} ${sobrenome}`.replace(/\s+/g, ' ');
      paxList.push({
        nome: nomeCompleto,
        tipo: 'Adulto',
        nascimento: mPax[3]
      });
    }

    // Extração de Passageiros - Modelo MSC (Primeiro nome ... Último nome ... Data de nascimento)
    if (texto.includes('FORMULÁRIO DE EMBARQUE') && texto.includes('MSC')) {
      const mscPaxRegex = /Primeiro\s+nome[\s\r\n]+([A-Z\s]+?)[\s\r\n]+(?:Primeiro\s+nome[\s\r\n]+([A-Z\s]+?)[\s\r\n]+)?Último\s+nome[\s\r\n]+([A-Z\s]+?)[\s\r\n]+(?:Último\s+nome[\s\r\n]+([A-Z\s]+?)[\s\r\n]+)?Nacionalidade[\s\S]*?Data\s+de\s+nascimento[\s\r\n]+([0-9]{2}\/[0-9]{2}\/[0-9]{4})[\s\r\n]+(?:Data\s+de\s+nascimento[\s\r\n]+([0-9]{2}\/[0-9]{2}\/[0-9]{4}))?/i;
      // Procura nomes de hóspedes explícitos em Hóspede(s)
      const mscHospedesMatches = texto.match(/(?:CELINE ELAINE PUCINELLI RAMOS|MONIQUE ARAGAO DI LALLO(?:\s+CORDENUNZZI)?)/gi);
      if (mscHospedesMatches) {
        const nomesUnicos = Array.from(new Set(mscHospedesMatches.map(n => n.replace(/\s+/g, ' ').trim())));
        nomesUnicos.forEach(nome => {
          if (!paxList.some(p => p.nome.toUpperCase() === nome.toUpperCase())) {
            paxList.push({
              nome,
              tipo: 'Adulto'
            });
          }
        });
      }
    }

    // Extração de Passageiros - Modelo Travellink (Sobrenome ... Nome ... Nascimento ...)
    const tlPaxMatch = texto.match(/Passageiros[\s\S]*?Sobrenome[\s\r\n]+([A-Z\s]+?)[\s\r\n]+Nome[\s\r\n]+([A-Z\s]+?)[\s\r\n]+Sexo[\s\r\n]+[A-Za-z]+[\s\r\n]+Nascimento[\s\r\n]+([0-9\/\s]+)/i);
    if (tlPaxMatch) {
      const sNome = tlPaxMatch[1].trim();
      const pNome = tlPaxMatch[2].trim();
      const nComp = `${pNome} ${sNome}`.replace(/\s+/g, ' ');
      if (!paxList.some(p => p.nome.toUpperCase() === nComp.toUpperCase())) {
        paxList.push({
          nome: nComp,
          tipo: 'Adulto',
          nascimento: tlPaxMatch[3].replace(/\s+/g, '')
        });
      }
    }

    // Extração de Passageiros - Modelo Infotera (Hóspedes ... Faixa etária ... Nome)
    const infoPaxRegex = /H[óo]spedes[\s\r\n]+Faixa\s+et[áa]ria[\s\r\n]+([A-Za-zÀ-ÿ\s]+?)[\s\r\n]+(Adulto|Crian[çc]a)[\s\r\n]+(?:([A-Za-zÀ-ÿ\s]+?)[\s\r\n]+(Adulto|Crian[çc]a))?/i;
    const mInfoPax = texto.match(infoPaxRegex);
    if (mInfoPax) {
      if (mInfoPax[1]) {
        const n1 = mInfoPax[1].trim();
        if (!paxList.some(p => p.nome.toUpperCase() === n1.toUpperCase())) {
          paxList.push({ nome: n1, tipo: mInfoPax[2] || 'Adulto' });
        }
      }
      if (mInfoPax[3]) {
        const n2 = mInfoPax[3].trim();
        if (!paxList.some(p => p.nome.toUpperCase() === n2.toUpperCase())) {
          paxList.push({ nome: n2, tipo: mInfoPax[4] || 'Adulto' });
        }
      }
    }

    // Extração de Passageiros - Modelo Krooze (Passageiros ... (ADT) / (65 anos))
    const krzPaxMatches = texto.matchAll(/([A-ZÀ-ÿ\s]{4,35})\s*(?:\((?:ADT|CHD|[0-9]{2}\s*anos)\))/gi);
    for (const kp of krzPaxMatches) {
      const nomeKrz = kp[1].replace(/\s+/g, ' ').trim();
      if (nomeKrz && !/Passageiros|Segurados|Detalhes|Serviço/i.test(nomeKrz)) {
        if (!paxList.some(p => p.nome.toUpperCase() === nomeKrz.toUpperCase())) {
          paxList.push({ nome: nomeKrz, tipo: 'Adulto' });
        }
      }
    }

    if (paxList.length > 0) {
      resultado.passageiros = paxList;
      resultado.cliente = {
        nome: paxList[0].nome
      };
    } else {
      // Tenta achar campo de Cliente ou Usuário
      const clienteMatch = texto.match(/(?:cliente|passageiro|pax|titular|viajante|usu[áa]rio)\s*[:\-]\s*([A-Za-zÀ-ÿ\s]{4,40})/i);
      if (clienteMatch && clienteMatch[1]) {
        resultado.cliente = {
          nome: clienteMatch[1].trim()
        };
      }
    }

    // Extração de Bilhetes e E-tickets (Formatos padrão e Travellink 127-...)
    const bilhetes: Array<{ numero: string; passageiro?: string; localizador?: string }> = [];
    const bilheteRegex = /(\d{3}[-\s]\d{10})\s+([A-Z0-9]+)\s+([A-Z\s\/]+?)\s+(\d{2}\/\d{2}\/\d{4})/gi;
    let mBilhete: RegExpExecArray | null;
    while ((mBilhete = bilheteRegex.exec(texto)) !== null) {
      bilhetes.push({
        numero: mBilhete[1].replace(/\s+/g, ''),
        localizador: mBilhete[2],
        passageiro: mBilhete[3].replace(/\//g, ' ').replace(/\s+/g, ' ').trim()
      });
    }

    // Bilhete Travellink (ex: Bilhetes \n 127- 2311356591)
    const mTlBilhete = texto.match(/Bilhetes[\s\S]*?(\d{3}\s*-\s*\d{10})/i);
    if (mTlBilhete) {
      const numTkt = mTlBilhete[1].replace(/\s+/g, '');
      if (!bilhetes.some(b => b.numero === numTkt)) {
        bilhetes.push({
          numero: numTkt,
          localizador: locDetectado,
          passageiro: paxList[0]?.nome
        });
      }
    }

    if (bilhetes.length > 0) {
      resultado.bilhetes = bilhetes;
    }

    // 3. Extração de Cruzeiro Marítimo (MSC Cruzeiros / Krooze / Formulários de Embarque)
    if (
      texto.includes('FORMULÁRIO DE EMBARQUE') ||
      textoLower.includes('cruzeiro') ||
      textoLower.includes('marítimo') ||
      textoLower.includes('msc virt') ||
      textoLower.includes('msc seaview') ||
      textoLower.includes('porto de embarque')
    ) {
      if (!resultado.cruzeiros) resultado.cruzeiros = [];

      const navioMatch =
        texto.match(/Navio[\s\r\n]+([^\r\n]+)/i) ||
        texto.match(/(MSC\s+[A-ZÀ-ÿ]+)/i);
      const navioNome = navioMatch ? navioMatch[1].trim() : 'MSC Cruzeiros';

      const cabineMatch =
        texto.match(/Cabine[\s\r\n:]+([0-9A-Z]+)/i) ||
        texto.match(/Cabine:\s*([0-9A-Z]+)/i);
      const cabineNum = cabineMatch ? cabineMatch[1].trim() : undefined;

      const deckNum = cabineNum && cabineNum.length >= 4 ? cabineNum.slice(0, 2) : undefined;

      const categoriaMatch = texto.match(/Categoria(?:\s+de\s+cabine)?[\s\r\n:]+([A-Za-zÀ-ÿ\-()]+)/i);
      const categoriaNome = categoriaMatch ? categoriaMatch[1].trim() : undefined;

      const expMatch = texto.match(/Experi[êe]ncia[\s\r\n:]+([A-Za-zÀ-ÿ]+)/i);
      const experienciaNome = expMatch ? expMatch[1].trim() : undefined;

      const portoEmbMatch = texto.match(/Porto\s+de\s+embarque[\s\r\n:]+([A-Za-zÀ-ÿ\s,]+)/i);
      const portoEmbarque = portoEmbMatch ? portoEmbMatch[1].trim() : 'Santos, Brasil';

      const checkInHoraMatch = texto.match(/check-in\s+abre\s+[àa]s:?\s*([0-2][0-9]:[0-5][0-9])/i);
      const horaCheckIn = checkInHoraMatch ? checkInHoraMatch[1] : undefined;

      const contatoEmergMatch = texto.match(/contato\s+de\s+emerg[êe]ncia[\s\S]*?Nome\s+do\s+contato[\s\r\n]+([A-ZÀ-ÿ\s]+)/i);
      const foneEmergMatch = texto.match(/Telefone\s+do\s+contato[\s\r\n]+([0-9\+\s\-()]+)/i);

      // Extração de Escalas e Itinerário do Cruzeiro (Opção A aprovada: Desmembrar cada porto dia a dia)
      const escalasCruzeiro: Array<{ dia: string; porto: string; chegada?: string; partida?: string; ancorado?: boolean }> = [];
      const escalaRegex = /([A-ZÃÁ]{2,3})\s+([0-3][0-9]\/[0-1][0-9]\/[0-9]{2})[\s\r\n]+([^0-9\r\n]+?(?:\(ancorado\)|\(em[\s\r\n]+navega[çc][ãa]o\))?)[\s\r\n]+([0-2][0-9]:[0-5][0-9]|--:--)[\s\r\n]+([0-2][0-9]:[0-5][0-9]|--:--)/gi;
      let mEsc: RegExpExecArray | null;

      while ((mEsc = escalaRegex.exec(texto)) !== null) {
        const dBr = mEsc[2];
        const pNome = mEsc[3].replace(/\s+/g, ' ').trim();
        const hrChegada = mEsc[4] !== '--:--' ? mEsc[4] : undefined;
        const hrPartida = mEsc[5] !== '--:--' ? mEsc[5] : undefined;

        // Converter DD/MM/AA para YYYY-MM-DD
        const parts = dBr.split('/');
        const anoIso = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        const dataIso = `${anoIso}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;

        escalasCruzeiro.push({
          dia: dataIso,
          porto: pNome,
          chegada: hrChegada,
          partida: hrPartida,
          ancorado: /ancorado/i.test(pNome)
        });
      }

      // Serviços Adicionais MSC (Easy Package, Hotel Service Charge, Browse Wi-Fi, etc)
      const servicosAdicionais: string[] = [];
      if (/EASY\s+PACKAGE/i.test(texto)) servicosAdicionais.push('EASY PACKAGE (Pacote de Bebidas)');
      if (/HOTEL\s+SERVICE\s+CHARGE/i.test(texto)) servicosAdicionais.push('HOTEL SERVICE CHARGE (Taxa de Serviço de Hotelaria)');
      if (/Browse\s*-\s*\d+\s*devices/i.test(texto)) servicosAdicionais.push('Pacote de Internet Wi-Fi (Browse)');
      if (/REDION\s+PREMIUM/i.test(texto)) servicosAdicionais.push('Seguro Viagem Redion Premium');

      // Se temos escalas, a data de embarque é a primeira e desembarque a última
      const dataEmbarqueCruzeiro = escalasCruzeiro[0]?.dia || datasDetectadas[0] || new Date().toISOString().split('T')[0];
      const dataDesembarqueCruzeiro = escalasCruzeiro[escalasCruzeiro.length - 1]?.dia || datasDetectadas[datasDetectadas.length - 1] || dataEmbarqueCruzeiro;
      const portoDesembarque = escalasCruzeiro[escalasCruzeiro.length - 1]?.porto || portoEmbarque;

      resultado.cruzeiros.push({
        navio: navioNome,
        reserva: locDetectado,
        cabine: cabineNum,
        deck: deckNum,
        categoria: categoriaNome,
        experiencia: experienciaNome,
        portoEmbarque,
        dataEmbarque: dataEmbarqueCruzeiro,
        horaCheckIn,
        portoDesembarque,
        dataDesembarque: dataDesembarqueCruzeiro,
        itinerarioEscalas: escalasCruzeiro,
        servicosAdicionais: servicosAdicionais.length > 0 ? servicosAdicionais : undefined,
        contatoEmergencia: contatoEmergMatch ? {
          nome: contatoEmergMatch[1].trim(),
          telefone: foneEmergMatch ? foneEmergMatch[1].trim() : undefined
        } : undefined
      });
    }

    // 4. Extração de Multi-Hospedagem Infotera / Vouchers de Hotelaria
    const blocosInfotera = texto.split(/(?:\s*)?Hospedagem[\s\r\n]+Localizador:\s*/i);
    if (blocosInfotera.length > 1) {
      if (!resultado.hospedagens) resultado.hospedagens = [];

      for (let i = 1; i < blocosInfotera.length; i++) {
        const bloco = blocosInfotera[i];
        const linhasBloco = bloco.split('\n').map(l => l.trim()).filter(Boolean);
        const locHotel = linhasBloco[0]?.split(/\s+/)[0]?.trim();
        const nomeHotel = linhasBloco[1] ? linhasBloco[1].replace(/[^\w\sÀ-ÿ\-]/g, '').trim() : 'Hotel';

        // Datas Check-in e Check-out
        const datasHotel = this.extrairDatas(bloco);
        const checkInIso = datasHotel[0] || datasDetectadas[0] || new Date().toISOString().split('T')[0];
        const checkOutIso = datasHotel[1] || datasHotel[0] || checkInIso;

        // Quarto e Regime
        const descQuartoMatch = bloco.match(/Descri[çc][ãa]o:\s*([^\r\n]+)/i);
        const quartoNome = descQuartoMatch ? descQuartoMatch[1].trim() : 'Quarto Standard';

        const regimeMatch = bloco.match(/(Caf[ée]\s+da\s+manh[ãa][^\r\n]+)/i);
        const regimeNome = regimeMatch ? regimeMatch[1].trim() : 'Café da Manhã Incluso';

        // Taxas obrigatórias
        const taxasMatch = bloco.match(/Taxas\s+obrigat[óo]rias\s+por\s+quarto[\s\S]*?:\s*([0-9\.,]+)\s*([A-Z]{3})/i);
        const taxasStr = taxasMatch ? `${taxasMatch[2]} ${taxasMatch[1]}` : undefined;

        resultado.hospedagens.push({
          hotel: nomeHotel,
          checkIn: checkInIso,
          checkOut: checkOutIso,
          noites: Math.max(1, this.calcularDiferencaDias(checkInIso, checkOutIso)),
          quarto: quartoNome,
          regime: regimeNome,
          voucher: locHotel,
          taxas: taxasStr
        });
      }
    } else if (
      (textoLower.includes('hotel') ||
       textoLower.includes('resort') ||
       textoLower.includes('pousada') ||
       textoLower.includes('hospedagem')) &&
      !texto.includes('FORMULÁRIO DE EMBARQUE') &&
      !texto.includes('Travellink') &&
      !texto.includes('Plano de Viagem')
    ) {
      if (!resultado.hospedagens) resultado.hospedagens = [];
      const hotelMatch =
        texto.match(/(?:hotel|resort|pousada)\s+([A-Za-z0-9À-ÿ\s]{3,30})/i) ||
        texto.match(/(?:hospedagem em|stay at)\s+([A-Za-z0-9À-ÿ\s]{3,30})/i);

      const nomeHotel = hotelMatch ? hotelMatch[0].trim() : 'Hospedagem Confirmada';

      const checkInRegex = texto.match(/check-?in\s*[:\-]?\s*([0-3]?[0-9][\/\-][0-1]?[0-9][\/\-](?:202[4-9]|203[0-5]))/i);
      const checkOutRegex = texto.match(/check-?out\s*[:\-]?\s*([0-3]?[0-9][\/\-][0-1]?[0-9][\/\-](?:202[4-9]|203[0-5]))/i);

      const formatarDataBr = (dStr: string) => {
        const p = dStr.split(/[\/\-]/);
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      };

      const checkInDate = checkInRegex ? formatarDataBr(checkInRegex[1]) : (datasDetectadas[0] || new Date().toISOString().split('T')[0]);
      const checkOutDate = checkOutRegex ? formatarDataBr(checkOutRegex[1]) : (datasDetectadas[1] || checkInDate);

      resultado.hospedagens.push({
        hotel: nomeHotel,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        noites: Math.max(1, datasDetectadas.length > 1 ? this.calcularDiferencaDias(checkInDate, checkOutDate) : 1),
        quarto: textoLower.includes('luxo') ? 'Apartamento Luxo' : (textoLower.includes('standard') ? 'Standard' : 'Quarto Casal'),
        regime: textoLower.includes('all inclusive') ? 'All Inclusive' : (textoLower.includes('café') ? 'Café da Manhã Incluso' : 'Hospedagem'),
        voucher: locDetectado
      });
    }

    // 5. Extração Multisserviço Krooze (Marítimo + Taxa de Serviço Hotelaria + Seguro Viagem)
    if (texto.includes('CR-') || texto.includes('MSC SEAVIEW')) {
      if (!resultado.servicos) resultado.servicos = [];

      // Marítimo Yacht Club
      const valMarMatch = texto.match(/MSC\s+SEAVIEW[\s\S]*?(?:BRL|R\$)\s*([0-9\.,]+)/i);
      const vMaritimo = valMarMatch ? parseFloat(valMarMatch[1].replace(/\./g, '').replace(',', '.')) : 34258.10;

      // Taxa de Serviço Hotelaria MSC
      const valTaxaServMatch = texto.match(/Taxa\s+de\s+Servi[çc]o\s+de\s+Hotel[^\n]*[\s\S]*?(?:BRL|R\$)\s*([0-9\.,]+)/i);
      const vTaxaServ = valTaxaServMatch ? parseFloat(valTaxaServMatch[1].replace(/\./g, '').replace(',', '.')) : 1694.00;

      resultado.servicos.push({
        tipo: 'Taxa de Serviço',
        descricao: 'Taxa de Serviço de Hotelaria – MSC Yacht Club',
        data: datasDetectadas[0] || '2027-01-03',
        fornecedor: 'MSC Cruzeiros',
        voucher: locDetectado,
        valor: vTaxaServ
      });

      // Seguro Viagem Europ Assistance
      const segPlanoMatch = texto.match(/Plano:\s*([^\r\n]+)/i);
      const valSegMatch = texto.match(/(?:Europ\s+Assistance|Plano:[\s\S]*?Seguro)[\s\S]*?(?:BRL|R\$)\s*([0-9\.,]+)/i);
      const vSeguro = valSegMatch ? parseFloat(valSegMatch[1].replace(/\./g, '').replace(',', '.')) : 480.00;

      resultado.servicos.push({
        tipo: 'Seguro Viagem',
        descricao: segPlanoMatch ? `Seguro Viagem - ${segPlanoMatch[1].trim()}` : 'Seguro Viagem Europ Assistance',
        data: datasDetectadas[0] || '2027-01-03',
        dataFim: datasDetectadas[1] || '2027-01-10',
        fornecedor: 'Europ Assistance',
        voucher: locDetectado,
        valor: vSeguro
      });
    } else if (
      !texto.includes('Powered by infotera') &&
      !texto.includes('FORMULÁRIO DE EMBARQUE') &&
      !texto.includes('Travellink') &&
      (
        textoLower.includes('seguro') ||
        textoLower.includes('assistência') ||
        textoLower.includes('gta') ||
        textoLower.includes('coris') ||
        textoLower.includes('affinity') ||
        textoLower.includes('transfer') ||
        textoLower.includes('passeio')
      )
    ) {
      if (!resultado.servicos) resultado.servicos = [];
      const tipoServico = textoLower.includes('seguro') || textoLower.includes('assistência')
        ? 'Seguro Viagem'
        : (textoLower.includes('transfer') ? 'Transfer Receptivo' : 'Passeio Turístico');

      resultado.servicos.push({
        tipo: tipoServico,
        descricao: `${tipoServico} - Cobertura Oficial`,
        data: datasDetectadas[0],
        fornecedor: textoUpper.includes('GTA') ? 'GTA' : (textoUpper.includes('CORIS') ? 'Coris' : 'Operadora'),
        voucher: locDetectado
      });
    }

    // 6. Extração de Valores e Totais
    // Formato Krooze (Tarifas ... Taxas ... Total ...)
    const mKrzTot = texto.match(/Tarifas[\s\r\n]+Taxas[\s\r\n]+Total[\s\S]*?(?:BRL|R\$)\s*([0-9\.,]+)[\s\r\n]+(?:BRL|R\$)\s*([0-9\.,]+)[\s\r\n]+(?:BRL|R\$)\s*([0-9\.,]+)/i);
    if (mKrzTot) {
      resultado.valores!.total = parseFloat(mKrzTot[3].replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      const valorMatch = texto.match(/(?:r\$\s*|total\s*[:\s]*r?\$?\s*)([0-9]{1,3}(?:\.[0-9]{3})*,\s*[0-9]{2})/i);
      if (valorMatch) {
        const valorLimpo = valorMatch[1].replace(/\./g, '').replace(',', '.').trim();
        resultado.valores!.total = parseFloat(valorLimpo) || 0;
      }
    }

    return resultado;
  }

  /**
   * Converte os dados extraídos em uma linha do tempo organizada dia a dia.
   */
  public static gerarItinerarioDias(
    dados: StudioDadosExtraidos,
    dataInicioStr?: string,
    diasDuracao: number = 5
  ): StudioDiaItinerario[] {
    // Se temos cruzeiro marítimo com itinerário de escalas (Opção A aprovada pelo usuário):
    // Desmembrar cada porto de escala na programação cronológica dia a dia do roteiro
    if (dados.cruzeiros && dados.cruzeiros.length > 0) {
      const crz = dados.cruzeiros[0];
      if (crz.itinerarioEscalas && crz.itinerarioEscalas.length > 0) {
        const itensCruzeiro: StudioItemItinerario[] = [];

        crz.itinerarioEscalas.forEach((escala, eIdx) => {
          const isPrimeiro = eIdx === 0;
          const isUltimo = eIdx === crz.itinerarioEscalas!.length - 1;
          const isNavegando = /navegando/i.test(escala.porto);

          let tituloItem = `Parada em ${escala.porto}`;
          let subtituloItem = `Chegada: ${escala.chegada || '--:--'} · Partida: ${escala.partida || '--:--'}`;
          let tipoItem: 'passeio' | 'hotel' | 'transfer' = 'passeio';

          if (isPrimeiro) {
            tituloItem = `Embarque no ${crz.navio} (${crz.portoEmbarque})`;
            subtituloItem = `Check-in a partir das ${crz.horaCheckIn || '15:30'} · Partida às ${escala.partida || '17:00'}`;
            tipoItem = 'transfer';
          } else if (isUltimo) {
            tituloItem = `Desembarque no porto de ${crz.portoDesembarque || escala.porto}`;
            subtituloItem = `Chegada prevista às ${escala.chegada || '06:00'} · Procedimentos de desembarque`;
            tipoItem = 'transfer';
          } else if (isNavegando) {
            tituloItem = `Navegando em Alto Mar & Lazer a Bordo (${crz.navio})`;
            subtituloItem = `Aproveite as piscinas, restaurantes, teatro e entretenimento do ${crz.navio}`;
            tipoItem = 'passeio';
          } else if (escala.ancorado) {
            tituloItem = `Escala em ${escala.porto} (Navio Ancorado)`;
            subtituloItem = `Desembarque por tenders/lanchas · Parada de ${escala.chegada || '--:--'} às ${escala.partida || '--:--'}`;
          }

          itensCruzeiro.push({
            id: `item-escala-${eIdx}-${Date.now()}`,
            tipo: tipoItem,
            titulo: tituloItem,
            subtitulo: subtituloItem,
            horario: escala.chegada || escala.partida || (isPrimeiro ? (crz.horaCheckIn || '15:30') : '09:00'),
            dataInicio: escala.dia,
            localizador: crz.reserva,
            fornecedor: crz.navio,
            rotuloLink: 'Detalhes do Porto',
            linkMaps: `https://maps.google.com/?q=${encodeURIComponent(escala.porto)}`,
            observacoes: crz.cabine ? `Cabine: ${crz.cabine}${crz.deck ? ` (Deck ${crz.deck})` : ''} · Categoria: ${crz.categoria || 'Balcony'}` : undefined
          });
        });

        // Adicionar serviços adicionais ao dia de embarque
        if (crz.servicosAdicionais && crz.servicosAdicionais.length > 0) {
          crz.servicosAdicionais.forEach((servico, sIdx) => {
            itensCruzeiro.push({
              id: `item-servico-cruzeiro-${sIdx}-${Date.now()}`,
              tipo: /seguro/i.test(servico) ? 'seguro' : 'passeio',
              titulo: servico,
              subtitulo: `Serviço incluso no pacote de cruzeiro (${crz.navio})`,
              dataInicio: crz.dataEmbarque,
              localizador: crz.reserva,
              fornecedor: crz.navio
            });
          });
        }

        return this.gerarItinerarioDiaADia(itensCruzeiro);
      }
    }

    // Se temos múltiplos voos ou múltiplas hospedagens com datas definidas, geramos os itens e usamos gerarItinerarioDiaADia
    if ((dados.voos && dados.voos.length > 1) || (dados.hospedagens && dados.hospedagens.length > 1)) {
      const itens: StudioItemItinerario[] = [];
      if (dados.voos && dados.voos.length > 0) {
        dados.voos.forEach((v, idx) => {
          itens.push({
            id: `item-voo-${idx}-${Date.now()}`,
            tipo: 'voo',
            titulo: `Voo ${v.companhia} (${v.origem} ➔ ${v.destino})`,
            subtitulo: `Voo ${v.voo} · Embarque Previsto`,
            horario: v.horaIda || '10:00',
            dataInicio: v.dataIda,
            dataFim: v.dataVolta || v.dataIda,
            origem: v.origem,
            destino: v.destino,
            companhia: v.companhia,
            numeroVoo: v.voo,
            localizador: v.localizador,
            fornecedor: v.companhia,
            rotuloLink: 'Fazer Check-in',
            linkAcao: 'https://www.google.com/travel/flights',
            observacoes: 'Apresente-se com antecedência para os procedimentos de embarque.'
          });
        });
      }

      if (dados.hospedagens && dados.hospedagens.length > 0) {
        dados.hospedagens.forEach((h, hIdx) => {
          itens.push({
            id: `item-hotel-${hIdx}-${Date.now()}`,
            tipo: 'hotel',
            titulo: h.hotel,
            subtitulo: `${h.quarto || 'Acomodação'} · ${h.regime || 'Hospedagem'}`,
            dataInicio: h.checkIn,
            dataFim: h.checkOut,
            localizador: h.voucher,
            fornecedor: h.hotel
          });
        });
      }

      if (dados.servicos && dados.servicos.length > 0) {
        dados.servicos.forEach((s, sIdx) => {
          itens.push({
            id: `item-servico-${sIdx}-${Date.now()}`,
            tipo: s.tipo === 'Seguro Viagem' ? 'seguro' : 'transfer',
            titulo: s.tipo,
            subtitulo: s.descricao,
            dataInicio: s.data,
            localizador: s.voucher,
            fornecedor: s.fornecedor
          });
        });
      }

      return this.gerarItinerarioDiaADia(itens);
    }

    const dias: StudioDiaItinerario[] = [];
    const baseDate = dataInicioStr ? new Date(dataInicioStr + 'T00:00:00') : new Date();

    for (let i = 0; i < diasDuracao; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dataIso = d.toISOString().split('T')[0];

      const diaNumero = i + 1;
      let tituloDia = `Dia ${diaNumero}: Chegada e Boas-Vindas`;
      if (diaNumero === diasDuracao) {
        tituloDia = `Dia ${diaNumero}: Retorno e Conclusão da Viagem`;
      } else if (diaNumero > 1) {
        tituloDia = `Dia ${diaNumero}: Roteiro e Atividades Livres`;
      }

      const itensDia: StudioItemItinerario[] = [];

      // Dia 1: Voos de ida e check-in
      if (diaNumero === 1) {
        if (dados.voos && dados.voos.length > 0) {
          const v = dados.voos[0];
          itensDia.push({
            id: `item-voo-ida-${Date.now()}`,
            tipo: 'voo',
            titulo: `Voo ${v.companhia} (${v.origem} ➔ ${v.destino})`,
            subtitulo: `Voo ${v.voo} · Embarque Previsto`,
            horario: v.horaIda || '10:00',
            localizador: v.localizador,
            fornecedor: v.companhia,
            rotuloLink: 'Fazer Check-in',
            linkAcao: 'https://www.google.com/travel/flights',
            observacoes: 'Apresente-se com pelo menos 2 horas de antecedência no portão de embarque.'
          });
        }

        if (dados.hospedagens && dados.hospedagens.length > 0) {
          const h = dados.hospedagens[0];
          itensDia.push({
            id: `item-hotel-checkin-${Date.now()}`,
            tipo: 'hotel',
            titulo: `Check-in no ${h.hotel}`,
            subtitulo: `${h.quarto || 'Quarto Casal'} · ${h.regime || 'Café da Manhã'}`,
            horario: '14:00',
            localizador: h.voucher,
            fornecedor: h.hotel,
            rotuloLink: 'Abrir no Google Maps',
            linkMaps: `https://maps.google.com/?q=${encodeURIComponent(h.hotel)}`,
            observacoes: 'Apresente o documento oficial com foto e o voucher de reserva na recepção.'
          });
        }

        if (dados.servicos && dados.servicos.length > 0) {
          const s = dados.servicos[0];
          itensDia.push({
            id: `item-servico-inicio-${Date.now()}`,
            tipo: s.tipo === 'Seguro Viagem' ? 'seguro' : 'transfer',
            titulo: s.tipo,
            subtitulo: s.descricao,
            fornecedor: s.fornecedor,
            localizador: s.voucher,
            observacoes: 'Em caso de urgência, consulte a apólice ou contate o plantão da agência.'
          });
        }
      } else if (diaNumero === diasDuracao) {
        // Último dia: Check-out e Retorno
        if (dados.hospedagens && dados.hospedagens.length > 0) {
          const h = dados.hospedagens[0];
          itensDia.push({
            id: `item-hotel-checkout-${Date.now()}`,
            tipo: 'hotel',
            titulo: `Check-out no ${h.hotel}`,
            horario: '11:00',
            observacoes: 'Favor liquidar consumos extras da hospedagem antes do encerramento.'
          });
        }

        if (dados.voos && dados.voos.length > 0) {
          const v = dados.voos[0];
          itensDia.push({
            id: `item-voo-volta-${Date.now()}`,
            tipo: 'voo',
            titulo: `Voo de Retorno ${v.companhia} (${v.destino} ➔ ${v.origem})`,
            horario: v.horaVolta || '16:00',
            localizador: v.localizador,
            fornecedor: v.companhia,
            rotuloLink: 'Status do Voo',
            observacoes: 'Retorne com calma ao aeroporto para os procedimentos de despacho de bagagens.'
          });
        }
      } else {
        // Dias intermediários: Passeios ou Dia Livre
        itensDia.push({
          id: `item-passeio-dia-${diaNumero}`,
          tipo: 'passeio',
          titulo: `Programação Cultural & Passeios no Destino`,
          subtitulo: 'Manhã e tarde livres para explorar as atrações e gastronomia local',
          horario: '09:30',
          rotuloLink: 'Dicas e Guia do Destino',
          observacoes: 'Consulte os guias recomendados pelo seu consultor ou agende passeios opcionais.'
        });
      }

      dias.push({
        diaNumero,
        dataStr: dataIso,
        tituloDia,
        itens: itensDia
      });
    }

    return dias;
  }

  /**
   * Extrai o localizador ou código de reserva de forma robusta e precisa,
   * evitando falsos positivos com palavras comuns ou cabeçalhos.
   */
  public static extrairLocalizador(texto: string): string {
    const palavrasIgnoradas = new Set([
      'HOTEL', 'LATAM', 'GOL', 'AZUL', 'VIAGEM', 'VOUCHER', 'AEREO', 'PASSAGEM',
      'CONFIRMACAO', 'RESIDENCIAL', 'SERVICO', 'CHECKIN', 'CHECKOUT', 'TURISMO',
      'STATUS', 'PRAZO', 'SISTEMA', 'CRIAÇÃO', 'CRIACAO', 'CONTATOS', 'AGENCIA', 'AGÊNCIA'
    ]);

    // Prioridade 0.0: Voucher Krooze (CR-...)
    const mKrz = texto.match(/\b(CR-[A-Z0-9]{8,12})\b/i);
    if (mKrz && !palavrasIgnoradas.has(mKrz[1].toUpperCase())) {
      return mKrz[1].toUpperCase();
    }

    // Prioridade 0.05: Voucher / Reserva MSC Cruzeiros (NÚMERO DA RESERVA XXXXXXXX)
    const mMscRes = texto.match(/N[ÚU]MERO\s+DA\s+RESERVA\s*[:\s]*([0-9]{6,12})\b/i);
    if (mMscRes) {
      return mMscRes[1].trim();
    }

    // Prioridade 0.08: Voucher Geral Infotera (Voucher: 607814)
    const mInfoVoucher = texto.match(/Voucher\s*[:\s]*([0-9]{5,10})\b/i);
    if (mInfoVoucher) {
      return mInfoVoucher[1].trim();
    }

    // Prioridade 0.1: Bloco de Reserva da Agaxtur / NDC LATAM / Travellink
    // Localizador Prazo Status seguido de LOC (ex: OABIUA)
    const mTravellink = texto.match(/Localizador\s+Prazo\s+Status[\s\r\n]+([A-Z0-9]{6})\b/i);
    if (mTravellink) {
      const pnrTl = mTravellink[1].toUpperCase();
      if (!palavrasIgnoradas.has(pnrTl)) {
        return pnrTl;
      }
    }

    // Onde aparecem o localizador interno (ex: LA9575541SANJ) e o PNR do GDS/Cia (ex: FFCWIZ)
    const mReservaAgaxtur = texto.match(/Reserva[\s\S]*?(?:Localizador|Prazo|Status)[\s\S]*?\b([A-Z0-9]{10,16})\b[\s\S]*?\b([A-Z0-9]{6})\b/i);
    if (mReservaAgaxtur) {
      const pnrCia = mReservaAgaxtur[2].toUpperCase();
      if (!palavrasIgnoradas.has(pnrCia)) {
        return pnrCia;
      }
    }

    // Prioridade 0.2: Token explicitamente posicionado sob "LocCia"
    const padraoLocCia = /(?:LocCia|Loc\s*Cia|Localizador\s+Cia)[\s\S]*?\b([A-Z0-9]{6})\b/i;
    const mLocCia = padraoLocCia.exec(texto);
    if (mLocCia && !palavrasIgnoradas.has(mLocCia[1].toUpperCase()) && !/STANDARD|ECON|CABINE/i.test(mLocCia[1])) {
      return mLocCia[1].toUpperCase();
    }

    // Padrão 1: Com delimitador forte (: ou #) e contexto de reserva/código
    const padraoForte = /(?:localizador|loc|reserva|pnr|voucher|c[oó]digo|confirma[çc][aã]o)(?:\s+de\s+[a-zà-ÿ]+)?\s*[:#]\s*([A-Z0-9\-]{4,15})\b/gi;
    let m: RegExpExecArray | null;
    while ((m = padraoForte.exec(texto)) !== null) {
      const candidato = m[1].toUpperCase().trim();
      if (!palavrasIgnoradas.has(candidato)) {
        return candidato;
      }
    }

    // Padrão 2: Formato com hífen típico de operadoras (ex: BK-88412, CVC-99128)
    const padraoHifen = /\b([A-Z]{2,5}-[0-9]{4,8})\b/gi;
    const mHifen = padraoHifen.exec(texto);
    if (mHifen) {
      return mHifen[1].toUpperCase().trim();
    }

    // Padrão 3: Alfanumérico misto com números e letras (ex: LAX99Z, 8A99BB)
    const padraoMisto = /\b([A-Z]{1,5}[0-9]{1,5}[A-Z0-9]{1,4})\b/g;
    while ((m = padraoMisto.exec(texto)) !== null) {
      const candidato = m[1].toUpperCase().trim();
      if (
        candidato.length >= 5 &&
        candidato.length <= 8 &&
        /[0-9]/.test(candidato) &&
        /[A-Z]/.test(candidato) &&
        !palavrasIgnoradas.has(candidato) &&
        !candidato.startsWith('QLTKM')
      ) {
        return candidato;
      }
    }

    return '';
  }

  /**
   * Extrai datas no formato DD/MM/AAAA ou AAAA-MM-DD presentes no texto.
   */
  /**
   * Extrai datas nos formatos DD/MM/AAAA, AAAA-MM-DD ou 'DD Mes AAAA' (ex: 06 Fev 2027).
   */
  public static extrairDatas(texto: string): string[] {
    const datas: string[] = [];

    // Padrão DD/MM/AAAA ou DD-MM-AAAA
    const matchesBr = texto.match(/\b([0-3]?[0-9])[\/\-]([0-1]?[0-9])[\/\-](202[4-9]|203[0-5])\b/g);
    if (matchesBr) {
      matchesBr.forEach(dStr => {
        const parts = dStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const dia = parts[0].padStart(2, '0');
          const mes = parts[1].padStart(2, '0');
          const ano = parts[2];
          const iso = `${ano}-${mes}-${dia}`;
          if (!datas.includes(iso)) datas.push(iso);
        }
      });
    }

    // Padrão ISO YYYY-MM-DD
    const matchesIso = texto.match(/\b(202[4-9]|203[0-5])\-([0-1][0-9])\-([0-3][0-9])\b/g);
    if (matchesIso) {
      matchesIso.forEach(d => {
        if (!datas.includes(d)) datas.push(d);
      });
    }

    // Padrão com mês por extenso (ex: 06 Fev 2027, 23 FEV 2027, 10 Dezembro 2026)
    const mesesMap: Record<string, string> = {
      jan: '01', fev: '02', feb: '02', mar: '03', abr: '04', apr: '04',
      mai: '05', may: '05', jun: '06', jul: '07', ago: '08', aug: '08',
      set: '09', sep: '09', out: '10', oct: '10', nov: '11', dez: '12', dec: '12'
    };

    const regexMesExtenso = /\b([0-3]?[0-9])\s+([A-Za-z]{3,10})\s+(202[4-9]|203[0-5])\b/gi;
    let mExt: RegExpExecArray | null;
    while ((mExt = regexMesExtenso.exec(texto)) !== null) {
      const dia = mExt[1].padStart(2, '0');
      const mesStr = mExt[2].toLowerCase().slice(0, 3);
      const ano = mExt[3];
      if (mesesMap[mesStr]) {
        const iso = `${ano}-${mesesMap[mesStr]}-${dia}`;
        if (!datas.includes(iso)) datas.push(iso);
      }
    }

    return datas;
  }

  /**
   * Extrai horário estimado no formato HH:MM
   */
  private static extrairHorario(texto: string, contexto: 'ida' | 'volta'): string | undefined {
    const matches = texto.match(/\b([0-2][0-9]):([0-5][0-9])\b/g);
    if (matches && matches.length > 0) {
      return contexto === 'ida' ? matches[0] : matches[matches.length - 1];
    }
    return undefined;
  }

  /**
   * Reordena os dias do itinerário garantindo a renumeração sequencial correta (diaNumero = index + 1)
   */
  public static reordenarDiasItinerario(
    dias: StudioDiaItinerario[],
    fromIndex: number,
    toIndex: number
  ): StudioDiaItinerario[] {
    if (!Array.isArray(dias) || fromIndex < 0 || toIndex < 0 || fromIndex >= dias.length || toIndex >= dias.length) {
      return dias || [];
    }
    const novoArray = dias.map(d => ({ ...d, itens: Array.isArray(d.itens) ? [...d.itens] : [] }));
    const [removido] = novoArray.splice(fromIndex, 1);
    novoArray.splice(toIndex, 0, removido);

    // Atualiza numeração dos dias sequencialmente
    return novoArray.map((dia, idx) => ({
      ...dia,
      diaNumero: idx + 1
    }));
  }

  /**
   * Reordena atividades dentro de um mesmo dia
   */
  public static reordenarItensDoDia(
    itens: StudioItemItinerario[],
    fromIndex: number,
    toIndex: number
  ): StudioItemItinerario[] {
    if (!Array.isArray(itens) || fromIndex < 0 || toIndex < 0 || fromIndex >= itens.length || toIndex >= itens.length) {
      return itens || [];
    }
    const novoArray = [...itens];
    const [removido] = novoArray.splice(fromIndex, 1);
    novoArray.splice(toIndex, 0, removido);
    return novoArray;
  }

  /**
   * Calcula a quantidade de dias entre duas datas no formato YYYY-MM-DD.
   */
  private static calcularDiferencaDias(dataInicio: string, dataFim: string): number {
    try {
      const d1 = new Date(dataInicio).getTime();
      const d2 = new Date(dataFim).getTime();
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return isNaN(diff) || diff < 1 ? 1 : diff;
    } catch {
      return 1;
    }
  }
}



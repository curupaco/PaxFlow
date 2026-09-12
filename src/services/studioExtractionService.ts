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
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // Decodificação de streams de texto para PDFs padrão
      let textoCompleto = '';
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(bytes);

      // Extrai blocos de texto entre parênteses em streams PDF: (Texto) Tj ou [(T)(exto)] TJ
      const textMatches = rawText.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g);
      if (textMatches && textMatches.length > 5) {
        textoCompleto = textMatches
          .map(m => m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, ''))
          .join(' ');
      }

      // Se a extração por streams for muito curta, busca strings legíveis contínuas
      if (textoCompleto.length < 50) {
        const readableStrings = rawText.match(/[A-Za-z0-9À-ÿ\s\.,:\-\/\(\)]{4,}/g);
        if (readableStrings) {
          textoCompleto = readableStrings.join(' ');
        }
      }

      return textoCompleto || rawText.slice(0, 5000);
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
      servicos: [],
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
      if (extraidos.servicos) dadosConsolidados.servicos!.push(...extraidos.servicos);
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

    // Regra de Tolerância Zero: apenas cria registro de voo se houver indício real de trecho ou bilhete
    if (
      ciaDetectada ||
      vooDetectado ||
      textoLower.includes('voo') ||
      textoLower.includes('aéreo') ||
      textoLower.includes('embarque') ||
      textoLower.includes('flight') ||
      iataMatches ||
      (origemMatch && destinoMatch)
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

    // 3. Extração de Hotel / Hospedagem (ex: Resort, Hotel, Pousada, Suíte, Check-in)
    if (
      textoLower.includes('hotel') ||
      textoLower.includes('resort') ||
      textoLower.includes('pousada') ||
      textoLower.includes('check-in') ||
      textoLower.includes('hospedagem')
    ) {
      // Tenta extrair o nome do hotel
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

      resultado.hospedagens?.push({
        hotel: nomeHotel,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        noites: Math.max(1, datasDetectadas.length > 1 ? this.calcularDiferencaDias(checkInDate, checkOutDate) : 1),
        quarto: textoLower.includes('luxo') ? 'Apartamento Luxo' : (textoLower.includes('standard') ? 'Standard' : 'Quarto Casal'),
        regime: textoLower.includes('all inclusive') ? 'All Inclusive' : (textoLower.includes('café') ? 'Café da Manhã Incluso' : 'Hospedagem'),
        voucher: locDetectado
      });
    }

    // 4. Extração de Seguro / Receptivo / Passeios
    if (
      textoLower.includes('seguro') ||
      textoLower.includes('assistência') ||
      textoLower.includes('gta') ||
      textoLower.includes('coris') ||
      textoLower.includes('affinity') ||
      textoLower.includes('transfer') ||
      textoLower.includes('passeio')
    ) {
      const tipoServico = textoLower.includes('seguro') || textoLower.includes('assistência')
        ? 'Seguro Viagem'
        : (textoLower.includes('transfer') ? 'Transfer Receptivo' : 'Passeio Turístico');

      resultado.servicos?.push({
        tipo: tipoServico,
        descricao: `${tipoServico} - Cobertura Oficial`,
        data: datasDetectadas[0],
        fornecedor: textoUpper.includes('GTA') ? 'GTA' : (textoUpper.includes('CORIS') ? 'Coris' : 'Operadora'),
        voucher: locDetectado
      });
    }

    // 5. Extração de Valores (ex: R$ 12.500,00 ou Total: 4.800,00)
    const valorMatch = texto.match(/(?:r\$\s*|total\s*[:\s]*r?\$?\s*)([0-9]{1,3}(?:\.[0-9]{3})*,\s*[0-9]{2})/i);
    if (valorMatch) {
      const valorLimpo = valorMatch[1].replace(/\./g, '').replace(',', '.').trim();
      resultado.valores!.total = parseFloat(valorLimpo) || 0;
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
      'CONFIRMACAO', 'RESIDENCIAL', 'SERVICO', 'CHECKIN', 'CHECKOUT', 'TURISMO'
    ]);

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
        !palavrasIgnoradas.has(candidato)
      ) {
        return candidato;
      }
    }

    return '';
  }

  /**
   * Extrai datas no formato DD/MM/AAAA ou AAAA-MM-DD presentes no texto.
   */
  private static extrairDatas(texto: string): string[] {
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
          datas.push(`${ano}-${mes}-${dia}`);
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

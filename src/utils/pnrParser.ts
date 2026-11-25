import { StudioExtractionService } from '../services/studioExtractionService';

export interface ParsedTrechoVoo {
  cia: string;
  numeroVoo: string;
  origem: string;
  destino: string;
  dataPartida: string;
  horaPartida?: string;
  dataChegada?: string;
  horaChegada?: string;
}

export interface ParsedProdutoImportado {
  tipo: string;
  fornecedor: string;
  descricao: string;
  codigoReserva?: string;
  valorVenda?: number;
  valorCusto?: number;
  dataServico: string;
  datasAdicionais?: { data: string; rotulo: string }[];
  dadosAdicionais?: Record<string, any>;
  passageiros?: string[];
}

export interface ParsedPNR {
  localizador: string | null;
  passageiros: string[];
  voos: ParsedTrechoVoo[];
  fornecedor?: string;
  observacoes?: string;
  produtos?: ParsedProdutoImportado[];
}

/**
 * Utilitário de parsing inteligente de e-mails de confirmação, PNRs de emissão aérea
 * e vouchers multimodelo (GOL, Azul, LATAM, MSC Cruzeiros, Agaxtur Infotera, Agaxtur Krooze).
 */
export function parsePnrText(rawText: string): ParsedPNR {
  const result: ParsedPNR = {
    localizador: null,
    passageiros: [],
    voos: [],
    produtos: []
  };

  if (!rawText || !rawText.trim()) return result;

  const text = rawText.trim();

  // Executa análise profunda via StudioExtractionService
  const extraidos = StudioExtractionService.analisarTextoDocumento(text);

  // 1. Extração de Localizador (LOC)
  result.localizador = StudioExtractionService.extrairLocalizador(text) || null;

  // 2. Extração de Passageiros
  if (extraidos.passageiros && extraidos.passageiros.length > 0) {
    result.passageiros = extraidos.passageiros.map(p => p.nome);
  } else {
    // Fallback de regex
    const paxRegexes = [
      /(?:passageiro|pax|passageiros|nome do passageiro)\s*[:#-]?\s*([A-Za-z \t\/]{3,40})/gi,
      /\b\d\.\s*([A-Z \t\/]{3,40})/g
    ];
    for (const regex of paxRegexes) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
          const name = match[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
          if (name.length > 3 && !/data|voo|trecho|origem|destino/i.test(name)) {
            if (!result.passageiros.includes(name)) {
              result.passageiros.push(name);
            }
          }
        }
      }
    }
  }

  // 3. Extração de Trechos / Voos
  // Procura padrões como "G3 1234 GRU SDU 12/10/2026 14:30" ou "LA3042 - 15/09/2026"
  const vooLines = text.split('\n');
  const flightRegex = /(?:([A-Z0-9]{2})\s*[-]?\s*(\d{3,4}))\s+([A-Z]{3})\s*(?:->|-|a)?\s*([A-Z]{3})\s+(?:em|data)?\s*(\d{2}\/\d{2}\/\d{4})/i;

  for (const line of vooLines) {
    const flightMatch = line.match(flightRegex);
    if (flightMatch) {
      result.voos.push({
        cia: flightMatch[1].toUpperCase(),
        numeroVoo: flightMatch[2],
        origem: flightMatch[3].toUpperCase(),
        destino: flightMatch[4].toUpperCase(),
        dataPartida: flightMatch[5]
      });
    }
  }

  // Se o parser de linha encontrou voos estruturados tradicionais, adiciona aos produtos
  if (result.voos.length > 0) {
    result.voos.forEach(v => {
      result.produtos?.push({
        tipo: 'AÉREO OPERADORA',
        fornecedor: result.fornecedor || v.cia,
        descricao: `Voo ${v.cia} ${v.numeroVoo} (${v.origem} ➔ ${v.destino})`,
        codigoReserva: result.localizador || undefined,
        dataServico: v.dataPartida,
        passageiros: result.passageiros
      });
    });
  } else if (extraidos.voos && extraidos.voos.length > 0) {
    // Se não encontrou no loop simples, usa o retorno do StudioExtractionService
    extraidos.voos.forEach(v => {
      // Extrair código IATA da cia se disponível (ex: LA, G3, AD)
      let ciaCode = v.companhia;
      const vMatch = v.voo.match(/^([A-Z0-9]{2})\b/i);
      if (vMatch) ciaCode = vMatch[1].toUpperCase();
      else if (/LATAM/i.test(v.companhia)) ciaCode = 'LA';
      else if (/GOL/i.test(v.companhia)) ciaCode = 'G3';
      else if (/AZUL/i.test(v.companhia)) ciaCode = 'AD';

      const numApenas = v.voo.replace(/^[A-Z0-9]{2}\s*/i, '');

      result.voos.push({
        cia: ciaCode,
        numeroVoo: numApenas || v.voo,
        origem: v.origem,
        destino: v.destino,
        dataPartida: v.dataIda,
        horaPartida: v.horaIda,
        dataChegada: v.dataVolta,
        horaChegada: v.horaVolta
      });

      result.produtos?.push({
        tipo: 'AÉREO OPERADORA',
        fornecedor: v.companhia || 'Companhia Aérea',
        descricao: `Voo ${v.voo} (${v.origem} ➔ ${v.destino})${v.horaIda ? ` às ${v.horaIda}` : ''}`,
        codigoReserva: v.localizador || result.localizador || undefined,
        dataServico: v.dataIda,
        datasAdicionais: v.dataVolta && v.dataVolta !== v.dataIda ? [{ data: v.dataVolta, rotulo: 'Retorno' }] : undefined,
        passageiros: result.passageiros
      });
    });
    result.fornecedor = extraidos.voos[0].companhia;
  }

  // 4. Extração de Hospedagens (Multi-Hotel Infotera ou Hotel Avulso)
  if (extraidos.hospedagens && extraidos.hospedagens.length > 0) {
    extraidos.hospedagens.forEach(h => {
      result.produtos?.push({
        tipo: 'HOTEL',
        fornecedor: h.hotel,
        descricao: `${h.hotel} - ${h.quarto || 'Acomodação'} (${h.regime || 'Hospedagem'})${h.taxas ? ` - Taxas: ${h.taxas}` : ''}`,
        codigoReserva: h.voucher || result.localizador || undefined,
        dataServico: h.checkIn,
        datasAdicionais: [{ data: h.checkOut, rotulo: 'Check-out' }],
        passageiros: result.passageiros
      });
    });
    if (!result.fornecedor) result.fornecedor = extraidos.hospedagens[0].hotel;
  }

  // 5. Extração de Cruzeiro Marítimo (MSC / Krooze)
  if (extraidos.cruzeiros && extraidos.cruzeiros.length > 0) {
    extraidos.cruzeiros.forEach(c => {
      const escalasDesc = c.itinerarioEscalas && c.itinerarioEscalas.length > 0
        ? ` - Roteiro: ${c.itinerarioEscalas.map(e => e.porto.split(',')[0]).join(' ➔ ')}`
        : '';

      result.produtos?.push({
        tipo: 'MARÍTIMO',
        fornecedor: c.navio,
        descricao: `${c.navio} (${c.portoEmbarque} a ${c.portoDesembarque || c.portoEmbarque})${c.cabine ? ` - Cabine: ${c.cabine}` : ''}${c.categoria ? ` (${c.categoria})` : ''}${escalasDesc}`,
        codigoReserva: c.reserva || result.localizador || undefined,
        dataServico: c.dataEmbarque,
        datasAdicionais: c.dataDesembarque ? [{ data: c.dataDesembarque, rotulo: 'Desembarque' }] : undefined,
        passageiros: result.passageiros
      });
    });
    if (!result.fornecedor) result.fornecedor = extraidos.cruzeiros[0].navio;
  }

  // 6. Extração de Serviços e Taxas (Seguro Viagem, Taxa de Serviço Krooze, etc)
  if (extraidos.servicos && extraidos.servicos.length > 0) {
    extraidos.servicos.forEach(s => {
      let tipoPaxFlow = 'SERVIÇOS';
      if (/seguro/i.test(s.tipo)) tipoPaxFlow = 'SEGURO';
      else if (/taxa/i.test(s.tipo)) tipoPaxFlow = 'TAXAS';
      else if (/transfer/i.test(s.tipo)) tipoPaxFlow = 'TRANSFER';

      result.produtos?.push({
        tipo: tipoPaxFlow,
        fornecedor: s.fornecedor || 'Fornecedor',
        descricao: s.descricao,
        codigoReserva: s.voucher || result.localizador || undefined,
        valorVenda: s.valor,
        dataServico: s.data || new Date().toISOString().split('T')[0],
        datasAdicionais: s.dataFim ? [{ data: s.dataFim, rotulo: 'Fim da Cobertura' }] : undefined,
        passageiros: result.passageiros
      });
    });
  }

  // Se não achou fornecedor específico, tenta padrão geral
  if (!result.fornecedor) {
    if (/latam/i.test(text)) result.fornecedor = 'LATAM Airlines';
    else if (/gol/i.test(text)) result.fornecedor = 'GOL Linhas Aéreas';
    else if (/azul/i.test(text)) result.fornecedor = 'Azul Linhas Aéreas';
    else if (/tap/i.test(text)) result.fornecedor = 'TAP Air Portugal';
    else if (/msc/i.test(text)) result.fornecedor = 'MSC Cruzeiros';
  }

  return result;
}

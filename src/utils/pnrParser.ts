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

export interface ParsedPNR {
  localizador: string | null;
  passageiros: string[];
  voos: ParsedTrechoVoo[];
  fornecedor?: string;
  observacoes?: string;
}

/**
 * Utilitário de parsing inteligente de e-mails de confirmação / PNRs de emissão aérea (Gol, Azul, LATAM, Amadeus, Sabre)
 */
export function parsePnrText(rawText: string): ParsedPNR {
  const result: ParsedPNR = {
    localizador: null,
    passageiros: [],
    voos: []
  };

  if (!rawText || !rawText.trim()) return result;

  const text = rawText.trim();

  // 1. Extração de Localizador (LOC)
  // Padrões comuns: "Código de reserva: XXXXXX", "PNR: XXXXXX", "Localizador: XXXXXX", "LOC: XXXXXX" ou sequências de 6 caracteres alfanuméricos em destaques
  const locRegexes = [
    /(?:localizador|loc|pnr|código de reserva|reserva|código|reserva nº|localizador:)\s*[:#-]?\s*([A-Z0-9]{6})/i,
    /([A-Z0-9]{6})\s*(?:\(LOC\)|\(PNR\))/i,
    /\b([A-Z0-9]{6})\b/
  ];

  for (const regex of locRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      // Ignorar palavras comuns de 6 letras que coincidam com regex ampla
      const candidate = match[1].toUpperCase();
      if (!['PASSAG', 'BILHET', 'RESERV', 'ORIGEM', 'DESTIN', 'STATUS', 'GOLAPP', 'LATAM1', 'AZULBR'].includes(candidate)) {
        result.localizador = candidate;
        break;
      }
    }
  }

  // 2. Extração de Companhia Aérea / Fornecedor
  if (/latam/i.test(text)) result.fornecedor = 'LATAM Airlines';
  else if (/gol/i.test(text)) result.fornecedor = 'GOL Linhas Aéreas';
  else if (/azul/i.test(text)) result.fornecedor = 'Azul Linhas Aéreas';
  else if (/tap/i.test(text)) result.fornecedor = 'TAP Air Portugal';
  else if (/american/i.test(text)) result.fornecedor = 'American Airlines';
  else if (/copa/i.test(text)) result.fornecedor = 'Copa Airlines';
  else if (/emirates/i.test(text)) result.fornecedor = 'Emirates';

  // 3. Extração de Nomes de Passageiros
  // Padrões: "Passageiro: SOBRENOME/NOME", "Pax: NOME SOBRENOME", "1. SOBRENOME/NOME"
  const paxRegexes = [
    /(?:passageiro|pax|passageiros|nome do passageiro)\s*[:#-]?\s*([A-Za-z\s\/]{3,40})/gi,
    /\b\d\.\s*([A-Z\s\/]{3,40})/g
  ];

  for (const regex of paxRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        let name = match[1].trim().replace(/\//g, ' ').replace(/\s+/g, ' ');
        if (name.length > 3 && !/data|voo|trecho|origem|destino/i.test(name)) {
          if (!result.passageiros.includes(name)) {
            result.passageiros.push(name);
          }
        }
      }
    }
  }

  // 4. Extração de Trechos / Voos
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

  // Se não encontrou trecho estruturado na regex restrita, tenta extração genérica de datas e aeroportos
  if (result.voos.length === 0) {
    const dateMatches = text.match(/(\d{2}\/\d{2}\/\d{4})/g);
    const iataMatches = text.match(/\b([A-Z]{3})\b/g);
    
    // Filtrar IATA conhecidos se possível
    const probableIata = (iataMatches || []).filter(code => 
      !['LOC', 'PNR', 'PAX', 'VOO', 'CPF', 'CNPJ', 'DATA', 'HORA', 'INFO'].includes(code)
    );

    if (dateMatches && dateMatches.length > 0) {
      result.voos.push({
        cia: result.fornecedor || 'Companhia Aérea',
        numeroVoo: 'Voo',
        origem: probableIata[0] || 'Origem',
        destino: probableIata[1] || 'Destino',
        dataPartida: dateMatches[0]
      });
    }
  }

  return result;
}

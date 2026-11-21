export interface AeroportoIata {
  code: string;
  city: string;
  airport: string;
  country: string;
  label: string;
}

export const IATA_CATALOG: AeroportoIata[] = [
  // Brasil - Principais Capitais e Polos
  { code: 'GRU', city: 'São Paulo', airport: 'Guarulhos', country: 'Brasil', label: 'São Paulo - Guarulhos (GRU), Brasil' },
  { code: 'CGH', city: 'São Paulo', airport: 'Congonhas', country: 'Brasil', label: 'São Paulo - Congonhas (CGH), Brasil' },
  { code: 'VCP', city: 'Campinas', airport: 'Viracopos', country: 'Brasil', label: 'Campinas - Viracopos (VCP), Brasil' },
  { code: 'GIG', city: 'Rio de Janeiro', airport: 'Galeão', country: 'Brasil', label: 'Rio de Janeiro - Galeão (GIG), Brasil' },
  { code: 'SDU', city: 'Rio de Janeiro', airport: 'Santos Dumont', country: 'Brasil', label: 'Rio de Janeiro - Santos Dumont (SDU), Brasil' },
  { code: 'BSB', city: 'Brasília', airport: 'Juscelino Kubitschek', country: 'Brasil', label: 'Brasília (BSB), Brasil' },
  { code: 'CNF', city: 'Belo Horizonte', airport: 'Confins', country: 'Brasil', label: 'Belo Horizonte - Confins (CNF), Brasil' },
  { code: 'SSA', city: 'Salvador', airport: 'Dep. Luís Eduardo Magalhães', country: 'Brasil', label: 'Salvador (SSA), Brasil' },
  { code: 'REC', city: 'Recife', airport: 'Guararapes', country: 'Brasil', label: 'Recife (REC), Brasil' },
  { code: 'FOR', city: 'Fortaleza', airport: 'Pinto Martins', country: 'Brasil', label: 'Fortaleza (FOR), Brasil' },
  { code: 'POA', city: 'Porto Alegre', airport: 'Salgado Filho', country: 'Brasil', label: 'Porto Alegre (POA), Brasil' },
  { code: 'CWB', city: 'Curitiba', airport: 'Afonso Pena', country: 'Brasil', label: 'Curitiba (CWB), Brasil' },
  { code: 'FLN', city: 'Florianópolis', airport: 'Hercílio Luz', country: 'Brasil', label: 'Florianópolis (FLN), Brasil' },
  { code: 'NVT', city: 'Navegantes / Balneário Camboriú', airport: 'Min. Victor Konder', country: 'Brasil', label: 'Navegantes (NVT), Brasil' },
  { code: 'MCZ', city: 'Maceió', airport: 'Zumbi dos Palmares', country: 'Brasil', label: 'Maceió (MCZ), Brasil' },
  { code: 'NAT', city: 'Natal', airport: 'São Gonçalo do Amarante', country: 'Brasil', label: 'Natal (NAT), Brasil' },
  { code: 'BPS', city: 'Porto Seguro', airport: 'Porto Seguro', country: 'Brasil', label: 'Porto Seguro (BPS), Brasil' },
  { code: 'IGU', city: 'Foz do Iguaçu', airport: 'Cataratas', country: 'Brasil', label: 'Foz do Iguaçu (IGU), Brasil' },
  { code: 'GYN', city: 'Goiânia', airport: 'Santa Genoveva', country: 'Brasil', label: 'Goiânia (GYN), Brasil' },
  { code: 'VIX', city: 'Vitória', airport: 'Eurico de Aguiar Salles', country: 'Brasil', label: 'Vitória (VIX), Brasil' },
  { code: 'BEL', city: 'Belém', airport: 'Val-de-Cans', country: 'Brasil', label: 'Belém (BEL), Brasil' },
  { code: 'MAO', city: 'Manaus', airport: 'Eduardo Gomes', country: 'Brasil', label: 'Manaus (MAO), Brasil' },
  { code: 'SLZ', city: 'São Luís', airport: 'Marechal Cunha Machado', country: 'Brasil', label: 'São Luís (SLZ), Brasil' },
  { code: 'JPA', city: 'João Pessoa', airport: 'Castro Pinto', country: 'Brasil', label: 'João Pessoa (JPA), Brasil' },
  { code: 'AJU', city: 'Aracaju', airport: 'Santa Maria', country: 'Brasil', label: 'Aracaju (AJU), Brasil' },
  { code: 'THE', city: 'Teresina', airport: 'Senador Petrônio Portella', country: 'Brasil', label: 'Teresina (THE), Brasil' },
  { code: 'CGB', city: 'Cuiabá', airport: 'Marechal Rondon', country: 'Brasil', label: 'Cuiabá (CGB), Brasil' },
  { code: 'CGR', city: 'Campo Grande', airport: 'Campo Grande', country: 'Brasil', label: 'Campo Grande (CGR), Brasil' },
  { code: 'FEN', city: 'Fernando de Noronha', airport: 'Gov. Carlos Wilson', country: 'Brasil', label: 'Fernando de Noronha (FEN), Brasil' },
  { code: 'IOS', city: 'Ilhéus', airport: 'Jorge Amado', country: 'Brasil', label: 'Ilhéus (IOS), Brasil' },
  { code: 'JDO', city: 'Juazeiro do Norte', airport: 'Orlando Bezerra', country: 'Brasil', label: 'Juazeiro do Norte (JDO), Brasil' },
  { code: 'JJD', city: 'Jericoacoara', airport: 'Comte. Ariston Pessoa', country: 'Brasil', label: 'Jericoacoara (JJD), Brasil' },

  // América do Norte & Caribe
  { code: 'MCO', city: 'Orlando', airport: 'Orlando International', country: 'Estados Unidos', label: 'Orlando (MCO), Estados Unidos' },
  { code: 'MIA', city: 'Miami', airport: 'Miami International', country: 'Estados Unidos', label: 'Miami (MIA), Estados Unidos' },
  { code: 'FLL', city: 'Fort Lauderdale', airport: 'Fort Lauderdale-Hollywood', country: 'Estados Unidos', label: 'Fort Lauderdale (FLL), Estados Unidos' },
  { code: 'JFK', city: 'Nova York', airport: 'John F. Kennedy', country: 'Estados Unidos', label: 'Nova York - JFK (JFK), Estados Unidos' },
  { code: 'EWR', city: 'Nova York / Newark', airport: 'Newark Liberty', country: 'Estados Unidos', label: 'Nova York - Newark (EWR), Estados Unidos' },
  { code: 'LGA', city: 'Nova York', airport: 'LaGuardia', country: 'Estados Unidos', label: 'Nova York - LaGuardia (LGA), Estados Unidos' },
  { code: 'LAX', city: 'Los Angeles', airport: 'Los Angeles International', country: 'Estados Unidos', label: 'Los Angeles (LAX), Estados Unidos' },
  { code: 'SFO', city: 'San Francisco', airport: 'San Francisco International', country: 'Estados Unidos', label: 'San Francisco (SFO), Estados Unidos' },
  { code: 'LAS', city: 'Las Vegas', airport: 'Harry Reid International', country: 'Estados Unidos', label: 'Las Vegas (LAS), Estados Unidos' },
  { code: 'ORD', city: 'Chicago', airport: "O'Hare International", country: 'Estados Unidos', label: 'Chicago (ORD), Estados Unidos' },
  { code: 'ATL', city: 'Atlanta', airport: 'Hartsfield-Jackson', country: 'Estados Unidos', label: 'Atlanta (ATL), Estados Unidos' },
  { code: 'DFW', city: 'Dallas', airport: 'Dallas/Fort Worth', country: 'Estados Unidos', label: 'Dallas (DFW), Estados Unidos' },
  { code: 'IAH', city: 'Houston', airport: 'George Bush Intercontinental', country: 'Estados Unidos', label: 'Houston (IAH), Estados Unidos' },
  { code: 'BOS', city: 'Boston', airport: 'Logan International', country: 'Estados Unidos', label: 'Boston (BOS), Estados Unidos' },
  { code: 'IAD', city: 'Washington D.C.', airport: 'Dulles', country: 'Estados Unidos', label: 'Washington D.C. (IAD), Estados Unidos' },
  { code: 'HNL', city: 'Honolulu', airport: 'Daniel K. Inouye', country: 'Estados Unidos', label: 'Honolulu (HNL), Estados Unidos' },
  { code: 'YYZ', city: 'Toronto', airport: 'Pearson', country: 'Canadá', label: 'Toronto (YYZ), Canadá' },
  { code: 'YVR', city: 'Vancouver', airport: 'Vancouver International', country: 'Canadá', label: 'Vancouver (YVR), Canadá' },
  { code: 'YUL', city: 'Montreal', airport: 'Trudeau', country: 'Canadá', label: 'Montreal (YUL), Canadá' },
  { code: 'CUN', city: 'Cancún', airport: 'Cancún International', country: 'México', label: 'Cancún (CUN), México' },
  { code: 'MEX', city: 'Cidade do México', airport: 'Benito Juárez', country: 'México', label: 'Cidade do México (MEX), México' },
  { code: 'PUJ', city: 'Punta Cana', airport: 'Punta Cana International', country: 'República Dominicana', label: 'Punta Cana (PUJ), República Dominicana' },
  { code: 'AUA', city: 'Aruba', airport: 'Reina Beatrix', country: 'Aruba', label: 'Aruba (AUA), Caribe' },
  { code: 'CUR', city: 'Curaçao', airport: 'Hato International', country: 'Curaçao', label: 'Curaçao (CUR), Caribe' },
  { code: 'MBJ', city: 'Montego Bay', airport: 'Sangster', country: 'Jamaica', label: 'Montego Bay (MBJ), Jamaica' },
  { code: 'NAS', city: 'Nassau', airport: 'Lynden Pindling', country: 'Bahamas', label: 'Nassau (NAS), Bahamas' },
  { code: 'HAV', city: 'Havana', airport: 'José Martí', country: 'Cuba', label: 'Havana (HAV), Cuba' },
  { code: 'PTY', city: 'Cidade do Panamá', airport: 'Tocumen', country: 'Panamá', label: 'Cidade do Panamá (PTY), Panamá' },
  { code: 'SJO', city: 'San José', airport: 'Juan Santamaría', country: 'Costa Rica', label: 'San José (SJO), Costa Rica' },

  // América do Sul
  { code: 'EZE', city: 'Buenos Aires', airport: 'Ezeiza', country: 'Argentina', label: 'Buenos Aires - Ezeiza (EZE), Argentina' },
  { code: 'AEP', city: 'Buenos Aires', airport: 'Aeroparque', country: 'Argentina', label: 'Buenos Aires - Aeroparque (AEP), Argentina' },
  { code: 'BRC', city: 'Bariloche', airport: 'Teniente Luis Candelaria', country: 'Argentina', label: 'Bariloche (BRC), Argentina' },
  { code: 'MDZ', city: 'Mendoza', airport: 'El Plumerillo', country: 'Argentina', label: 'Mendoza (MDZ), Argentina' },
  { code: 'COR', city: 'Córdoba', airport: 'Ing. Ambrosio Taravella', country: 'Argentina', label: 'Córdoba (COR), Argentina' },
  { code: 'USH', city: 'Ushuaia', airport: 'Malvinas Argentinas', country: 'Argentina', label: 'Ushuaia (USH), Argentina' },
  { code: 'SCL', city: 'Santiago', airport: 'Arturo Merino Benítez', country: 'Chile', label: 'Santiago (SCL), Chile' },
  { code: 'LIM', city: 'Lima', airport: 'Jorge Chávez', country: 'Peru', label: 'Lima (LIM), Peru' },
  { code: 'CUZ', city: 'Cusco', airport: 'Alejandro Velasco Astete', country: 'Peru', label: 'Cusco (CUZ), Peru' },
  { code: 'BOG', city: 'Bogotá', airport: 'El Dorado', country: 'Colômbia', label: 'Bogotá (BOG), Colômbia' },
  { code: 'CTG', city: 'Cartagena', airport: 'Rafael Núñez', country: 'Colômbia', label: 'Cartagena (CTG), Colômbia' },
  { code: 'ADZ', city: 'San Andrés', airport: 'Gustavo Rojas Pinilla', country: 'Colômbia', label: 'San Andrés (ADZ), Colômbia' },
  { code: 'MVD', city: 'Montevidéu', airport: 'Carrasco', country: 'Uruguai', label: 'Montevidéu (MVD), Uruguai' },
  { code: 'PDP', city: 'Punta del Este', airport: 'Laguna del Sauce', country: 'Uruguai', label: 'Punta del Este (PDP), Uruguai' },
  { code: 'ASU', city: 'Assunção', airport: 'Silvio Pettirossi', country: 'Paraguai', label: 'Assunção (ASU), Paraguai' },
  { code: 'UIO', city: 'Quito', airport: 'Mariscal Sucre', country: 'Equador', label: 'Quito (UIO), Equador' },

  // Europa
  { code: 'LIS', city: 'Lisboa', airport: 'Humberto Delgado', country: 'Portugal', label: 'Lisboa (LIS), Portugal' },
  { code: 'OPO', city: 'Porto', airport: 'Francisco Sá Carneiro', country: 'Portugal', label: 'Porto (OPO), Portugal' },
  { code: 'FAO', city: 'Faro / Algarve', airport: 'Faro', country: 'Portugal', label: 'Faro (FAO), Portugal' },
  { code: 'MAD', city: 'Madri', airport: 'Barajas', country: 'Espanha', label: 'Madri (MAD), Espanha' },
  { code: 'BCN', city: 'Barcelona', airport: 'El Prat', country: 'Espanha', label: 'Barcelona (BCN), Espanha' },
  { code: 'CDG', city: 'Paris', airport: 'Charles de Gaulle', country: 'França', label: 'Paris - CDG (CDG), França' },
  { code: 'ORY', city: 'Paris', airport: 'Orly', country: 'França', label: 'Paris - Orly (ORY), França' },
  { code: 'NCE', city: 'Nice', airport: "Côte d'Azur", country: 'França', label: 'Nice (NCE), França' },
  { code: 'LHR', city: 'Londres', airport: 'Heathrow', country: 'Reino Unido', label: 'Londres - Heathrow (LHR), Reino Unido' },
  { code: 'LGW', city: 'Londres', airport: 'Gatwick', country: 'Reino Unido', label: 'Londres - Gatwick (LGW), Reino Unido' },
  { code: 'EDI', city: 'Edimburgo', airport: 'Edinburgh', country: 'Reino Unido', label: 'Edimburgo (EDI), Reino Unido' },
  { code: 'DUB', city: 'Dublin', airport: 'Dublin Airport', country: 'Irlanda', label: 'Dublin (DUB), Irlanda' },
  { code: 'FCO', city: 'Roma', airport: 'Fiumicino', country: 'Itália', label: 'Roma (FCO), Itália' },
  { code: 'MXP', city: 'Milão', airport: 'Malpensa', country: 'Itália', label: 'Milão (MXP), Itália' },
  { code: 'VCE', city: 'Veneza', airport: 'Marco Polo', country: 'Itália', label: 'Veneza (VCE), Itália' },
  { code: 'NAP', city: 'Nápoles', airport: 'Capodichino', country: 'Itália', label: 'Nápoles (NAP), Itália' },
  { code: 'AMS', city: 'Amsterdã', airport: 'Schiphol', country: 'Holanda', label: 'Amsterdã (AMS), Holanda' },
  { code: 'FRA', city: 'Frankfurt', airport: 'Frankfurt am Main', country: 'Alemanha', label: 'Frankfurt (FRA), Alemanha' },
  { code: 'MUC', city: 'Munique', airport: 'Franz Josef Strauss', country: 'Alemanha', label: 'Munique (MUC), Alemanha' },
  { code: 'BER', city: 'Berlim', airport: 'Brandenburg', country: 'Alemanha', label: 'Berlim (BER), Alemanha' },
  { code: 'ZRH', city: 'Zurique', airport: 'Zurich Airport', country: 'Suíça', label: 'Zurique (ZRH), Suíça' },
  { code: 'GVA', city: 'Genebra', airport: 'Geneva Airport', country: 'Suíça', label: 'Genebra (GVA), Suíça' },
  { code: 'VIE', city: 'Viena', airport: 'Vienna International', country: 'Áustria', label: 'Viena (VIE), Áustria' },
  { code: 'BRU', city: 'Bruxelas', airport: 'Brussels Airport', country: 'Bélgica', label: 'Bruxelas (BRU), Bélgica' },
  { code: 'PRG', city: 'Praga', airport: 'Václav Havel', country: 'República Tcheca', label: 'Praga (PRG), República Tcheca' },
  { code: 'BUD', city: 'Budapeste', airport: 'Ferenc Liszt', country: 'Hungria', label: 'Budapeste (BUD), Hungria' },
  { code: 'ATH', city: 'Atenas', airport: 'Eleftherios Venizelos', country: 'Grécia', label: 'Atenas (ATH), Grécia' },
  { code: 'JTR', city: 'Santorini', airport: 'Santorini (Thira)', country: 'Grécia', label: 'Santorini (JTR), Grécia' },
  { code: 'IST', city: 'Istambul', airport: 'Istanbul Airport', country: 'Turquia', label: 'Istambul (IST), Turquia' },
  { code: 'CPH', city: 'Copenhague', airport: 'Kastrup', country: 'Dinamarca', label: 'Copenhague (CPH), Dinamarca' },
  { code: 'ARN', city: 'Estocolmo', airport: 'Arlanda', country: 'Suécia', label: 'Estocolmo (ARN), Suécia' },
  { code: 'KEF', city: 'Reykjavik', airport: 'Keflavik', country: 'Islândia', label: 'Reykjavik (KEF), Islândia' },

  // Oriente Médio, África, Ásia & Oceania
  { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'Emirados Árabes', label: 'Dubai (DXB), Emirados Árabes' },
  { code: 'DOH', city: 'Doha', airport: 'Hamad International', country: 'Catar', label: 'Doha (DOH), Catar' },
  { code: 'AUH', city: 'Abu Dhabi', airport: 'Zayed International', country: 'Emirados Árabes', label: 'Abu Dhabi (AUH), Emirados Árabes' },
  { code: 'TLV', city: 'Tel Aviv', airport: 'Ben Gurion', country: 'Israel', label: 'Tel Aviv (TLV), Israel' },
  { code: 'CAI', city: 'Cairo', airport: 'Cairo International', country: 'Egito', label: 'Cairo (CAI), Egito' },
  { code: 'CMN', city: 'Casablanca', airport: 'Mohammed V', country: 'Marrocos', label: 'Casablanca (CMN), Marrocos' },
  { code: 'RAK', city: 'Marrakesh', airport: 'Menara', country: 'Marrocos', label: 'Marrakesh (RAK), Marrocos' },
  { code: 'JNB', city: 'Joanesburgo', airport: 'O.R. Tambo', country: 'África do Sul', label: 'Joanesburgo (JNB), África do Sul' },
  { code: 'CPT', city: 'Cidade do Cabo', airport: 'Cape Town International', country: 'África do Sul', label: 'Cidade do Cabo (CPT), África do Sul' },
  { code: 'LAD', city: 'Luanda', airport: '4 de Fevereiro', country: 'Angola', label: 'Luanda (LAD), Angola' },
  { code: 'NRT', city: 'Tóquio', airport: 'Narita', country: 'Japão', label: 'Tóquio - Narita (NRT), Japão' },
  { code: 'HND', city: 'Tóquio', airport: 'Haneda', country: 'Japão', label: 'Tóquio - Haneda (HND), Japão' },
  { code: 'ICN', city: 'Seul', airport: 'Incheon', country: 'Coreia do Sul', label: 'Seul (ICN), Coreia do Sul' },
  { code: 'PEK', city: 'Pequim', airport: 'Capital', country: 'China', label: 'Pequim (PEK), China' },
  { code: 'PVG', city: 'Xangai', airport: 'Pudong', country: 'China', label: 'Xangai (PVG), China' },
  { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong International', country: 'Hong Kong', label: 'Hong Kong (HKG)' },
  { code: 'SIN', city: 'Singapura', airport: 'Changi', country: 'Singapura', label: 'Singapura (SIN)' },
  { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi', country: 'Tailândia', label: 'Bangkok (BKK), Tailândia' },
  { code: 'DPS', city: 'Bali / Denpasar', airport: 'Ngurah Rai', country: 'Indonésia', label: 'Bali (DPS), Indonésia' },
  { code: 'MLE', city: 'Malé / Maldivas', airport: 'Velana', country: 'Maldivas', label: 'Maldivas (MLE)' },
  { code: 'SYD', city: 'Sydney', airport: 'Kingsford Smith', country: 'Austrália', label: 'Sydney (SYD), Austrália' },
  { code: 'MEL', city: 'Melbourne', airport: 'Tullamarine', country: 'Austrália', label: 'Melbourne (MEL), Austrália' },
  { code: 'AKL', city: 'Auckland', airport: 'Auckland Airport', country: 'Nova Zelândia', label: 'Auckland (AKL), Nova Zelândia' }
];

function normalizeIataText(val: string): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca aeroportos no catálogo IATA por código de 3 letras, cidade, aeroporto ou país.
 * Prioriza correspondência exata ou por prefixo de código IATA.
 */
export function buscarAeroportosPorTermo(query: string, limite: number = 15): AeroportoIata[] {
  const q = normalizeIataText(query);
  if (!q) return [];

  const exactCodeMatches: AeroportoIata[] = [];
  const prefixCodeMatches: AeroportoIata[] = [];
  const textMatches: AeroportoIata[] = [];

  for (const item of IATA_CATALOG) {
    const codeNorm = item.code.toLowerCase();
    const cityNorm = normalizeIataText(item.city);
    const airportNorm = normalizeIataText(item.airport);
    const countryNorm = normalizeIataText(item.country);

    if (codeNorm === q) {
      exactCodeMatches.push(item);
    } else if (codeNorm.startsWith(q)) {
      prefixCodeMatches.push(item);
    } else if (cityNorm.includes(q) || airportNorm.includes(q) || countryNorm.includes(q)) {
      textMatches.push(item);
    }
  }

  return [...exactCodeMatches, ...prefixCodeMatches, ...textMatches].slice(0, limite);
}

export function renderIataDatalistHTML(id: string = 'iata-airports-datalist'): string {
  return `
    <datalist id="${id}">
      ${IATA_CATALOG.map(a => `<option value="${a.code}">${a.label}</option>`).join('')}
    </datalist>
  `;
}


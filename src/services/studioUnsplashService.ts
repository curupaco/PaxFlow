/**
 * Serviço de Busca e Tradução Semântica Unsplash para PaxFlow Studio™.
 * Traduz pesquisas em Português para Inglês para ampliar os resultados e
 * oferece um catálogo curado de fotos de luxo para viagens.
 */

export interface UnsplashFoto {
  id: string;
  url: string;
  thumb_url: string;
  titulo: string;
  fotografo_nome?: string;
  fotografo_url?: string;
  tags?: string[];
}

export class StudioUnsplashService {
  /**
   * Dicionário semântico de termos turísticos, destinos e atrações de PT-BR para EN.
   */
  private static DICIONARIO_TRADUCAO: Record<string, string> = {
    // Tipos de Destinos e Paisagens
    'praia': 'tropical beach ocean luxury',
    'praias': 'tropical beach ocean luxury',
    'litoral': 'coastal luxury beach ocean',
    'mar': 'ocean turquoise water coast',
    'ilha': 'tropical island luxury resort',
    'ilhas': 'tropical islands aerial view',
    'montanha': 'majestic mountains landscape alpine',
    'montanhas': 'majestic mountains landscape alpine',
    'serra': 'mountain range scenic landscape',
    'neve': 'snow winter ski luxury resort',
    'frio': 'winter snow mountain cozy cabin',
    'inverno': 'winter snowy mountains cozy luxury',
    'esqui': 'ski resort winter alps luxury',
    'floresta': 'rainforest nature lush green',
    'natureza': 'nature landscape scenic outdoors',
    'campo': 'countryside vineyard scenic hills',
    'fazenda': 'countryside ranch luxury resort',
    'hotel fazenda': 'luxury ranch countryside resort',
    'deserto': 'desert dunes luxury tent glamping',
    'dunas': 'sand dunes sunset landscape',
    'cachoeira': 'waterfall tropical nature lush',
    'lago': 'lake mountain reflection scenic',
    'lagos': 'lakes mountains scenic landscape',
    'canyon': 'canyon rock formation scenic',
    'safari': 'safari wildlife luxury lodge kenya',
    'safári': 'safari wildlife luxury lodge kenya',

    // Estilos de Viagem & Luxo
    'luxo': 'luxury travel 5 star hotel resort',
    'resort': 'luxury resort infinity pool ocean',
    'hotel': 'luxury boutique hotel interior pool',
    'piscina': 'infinity pool luxury view sunset',
    'casal': 'romantic couple getaway travel luxury',
    'romantico': 'romantic sunset travel couple luxury',
    'romântico': 'romantic sunset travel couple luxury',
    'lua de mel': 'honeymoon luxury destination overwater',
    'familia': 'family vacation luxury resort fun',
    'família': 'family vacation luxury resort fun',
    'cruzeiro': 'luxury cruise ship ocean navigation',
    'iate': 'luxury yacht sailing sunset sea',
    'barco': 'boat sailing turquoise clear water',
    'gastronomia': 'fine dining gourmet cuisine wine luxury',
    'restaurante': 'luxury fine dining restaurant view',
    'vinho': 'vineyard winery tuscany wine luxury',
    'vinhos': 'vineyard winery tuscany wine luxury',
    'vinhedo': 'vineyard winery tuscany wine sunset',
    'vinhedos': 'vineyard winery tuscany wine sunset',
    'enoturismo': 'vineyard winery landscape wine tasting',
    'aventura': 'adventure travel trekking hiking landscape',
    'mergulho': 'scuba diving coral reef clear water',
    'aurora boreal': 'northern lights aurora borealis norway',
    'por do sol': 'golden sunset beach ocean tropical',
    'pôr do sol': 'golden sunset beach ocean tropical',
    'nascer do sol': 'sunrise morning mountain landscape',
    'cidade': 'city skyline architecture urban night',
    'metropole': 'metropolis city skyline architecture',
    'metrópole': 'metropolis city skyline architecture',

    // Cidades e Destinos Internacionais
    'paris': 'paris eiffel tower luxury france',
    'franca': 'france countryside paris provence',
    'frança': 'france countryside paris provence',
    'roma': 'rome colosseum italy historic architecture',
    'italia': 'italy amalfi coast tuscany florence',
    'itália': 'italy amalfi coast tuscany florence',
    'veneza': 'venice canals gondola italy',
    'florenca': 'florence duomo tuscany italy',
    'florença': 'florence duomo tuscany italy',
    'amalfi': 'amalfi coast positano italy cliffside',
    'positano': 'positano amalfi coast cliffside village',
    'milao': 'milan duomo galleria italy',
    'milão': 'milan duomo galleria italy',
    'londres': 'london big ben thames england',
    'inglaterra': 'england london cotswolds countryside',
    'reino unido': 'uk london big ben scenic',
    'nova york': 'new york city skyline manhattan sunset',
    'ny': 'new york city skyline manhattan central park',
    'orlando': 'orlando theme park disney castle fireworks',
    'disney': 'disney castle fireworks magic kingdom',
    'miami': 'miami beach south beach ocean drive luxury',
    'los angeles': 'los angeles california palm trees sunset',
    'california': 'california pacific coast highway palm trees',
    'califórnia': 'california pacific coast highway palm trees',
    'las vegas': 'las vegas strip luxury resort lights',
    'havai': 'hawaii tropical beach sunset palm trees',
    'havaí': 'hawaii tropical beach sunset palm trees',
    'caribe': 'caribbean turquoise beach luxury resort',
    'cancun': 'cancun mexico luxury resort turquoise beach',
    'cancún': 'cancun mexico luxury resort turquoise beach',
    'tulum': 'tulum mexico beach ruins luxury bohemian',
    'punta cana': 'punta cana resort palm trees caribbean',
    'maldivas': 'maldives overwater villa turquoise lagoon luxury',
    'bora bora': 'bora bora overwater bungalow lagoon luxury',
    'tahiti': 'tahiti french polynesia tropical luxury',
    'bali': 'bali indonesia luxury villa infinity pool temple',
    'tailandia': 'thailand phuket islands phi phi limestone',
    'tailândia': 'thailand phuket islands phi phi limestone',
    'phuket': 'phuket thailand tropical beach luxury',
    'japao': 'tokyo kyoto japan cherry blossom temple',
    'japão': 'tokyo kyoto japan cherry blossom temple',
    'toquio': 'tokyo skyline shinjuku japan city lights',
    'tóquio': 'tokyo skyline shinjuku japan city lights',
    'quioto': 'kyoto japan traditional temple bamboo',
    'kyoto': 'kyoto japan traditional temple bamboo',
    'dubai': 'dubai burj khalifa luxury marina desert resort',
    'abu dhabi': 'abu dhabi grand mosque luxury uae',
    'grecia': 'santorini greece white blue caldera cliffside',
    'grécia': 'santorini greece white blue caldera cliffside',
    'santorini': 'santorini caldera sunset greece luxury view',
    'mykonos': 'mykonos greece windmills beach club luxury',
    'portugal': 'lisbon porto algarve portugal coast',
    'lisboa': 'lisbon tram historic architecture portugal',
    'porto': 'porto douro river dom luis bridge portugal',
    'algarve': 'algarve caves beach cliffs portugal',
    'espanha': 'spain barcelona madrid costa brava',
    'barcelona': 'barcelona sagrada familia spain gothic',
    'madri': 'madrid spain architecture royal palace',
    'suica': 'switzerland alps zermatt matterhorn chalets',
    'suíça': 'switzerland alps zermatt matterhorn chalets',
    'bariloche': 'bariloche argentina lake nahuel huapi andes',
    'patagonia': 'patagonia perito moreno glacier torres del paine',
    'patagônia': 'patagonia perito moreno glacier torres del paine',
    'santiago': 'santiago chile andes mountains view',
    'chile': 'atacama desert chile patagonia andes scenic',
    'atacama': 'san pedro de atacama desert stars landscape',
    'buenos aires': 'buenos aires recoleta puerto madero tango',
    'argentina': 'argentina buenos aires mendoza wine andes',
    'mendoza': 'mendoza vineyard andes wine argentina luxury',
    'cusco': 'cusco machu picchu peru sacred valley inca',
    'machu picchu': 'machu picchu peru ancient inca ruins clouds',
    'peru': 'peru machu picchu cusco sacred valley',
    'africa do sul': 'cape town south africa table mountain safari',
    'áfrica do sul': 'cape town south africa table mountain safari',
    'egito': 'egypt pyramids giza cairo desert history',
    'cairo': 'cairo egypt pyramids nile river',

    // Cidades e Destinos Nacionais (Brasil)
    'rio de janeiro': 'rio de janeiro cristo corcovado ipanema copacabana',
    'rio': 'rio de janeiro copacabana beach sugarloaf mountain',
    'fernando de noronha': 'fernando de noronha baia do sancho morro dois irmaos',
    'noronha': 'fernando de noronha brazil tropical ocean crystal',
    'maragogi': 'maragogi alagoas natural pools turquoise beach',
    'alagoas': 'alagoas coastline natural pools turquoise water',
    'carneiros': 'praia dos carneiros pernambuco chapel beach',
    'praia dos carneiros': 'praia dos carneiros pernambuco coconut trees',
    'gramado': 'gramado canela serra gaucha brazil cozy',
    'canela': 'canela serra gaucha cascata caracol',
    'serra gaucha': 'gramado serra gaucha vineyard hills',
    'serra gaúcha': 'gramado serra gaucha vineyard hills',
    'porto de galinhas': 'porto de galinhas natural pools beach reefs',
    'salvador': 'salvador bahia pelourinho farol da barra colorful',
    'bahia': 'trancoso bahia beach tropical brazil luxury',
    'trancoso': 'trancoso bahia quadrado beach luxury pousada',
    'arraial dajuda': 'arraial d ajuda bahia beach cliffside',
    'arraial d ajuda': 'arraial d ajuda bahia beach cliffside',
    'morro de sao paulo': 'morro de sao paulo bahia beach paradise',
    'jalapao': 'jalapao fervedouro tocantins brazil golden dunes',
    'jalapão': 'jalapao fervedouro tocantins brazil golden dunes',
    'lencois maranhenses': 'lencois maranhenses dunes lagoons brazil water',
    'lençóis maranhenses': 'lencois maranhenses dunes lagoons brazil water',
    'foz do iguacu': 'iguazu falls waterfalls nature brazil rainbow',
    'foz do iguaçu': 'iguazu falls waterfalls nature brazil rainbow',
    'fortaleza': 'fortaleza ceara beach shoreline',
    'jericoacoara': 'jericoacoara dunes sunset lagoon beach paradise',
    'jeri': 'jericoacoara dunes sunset beach paradise',
    'pipa': 'praia da pipa tibau do sul cliffs dolphins',
    'florianopolis': 'florianopolis ilha da magia beach surf luxury',
    'florianópolis': 'florianopolis ilha da magia beach surf luxury',
    'floripa': 'florianopolis beach coast aerial brazil',
    'bonito': 'bonito mato grosso do sul crystal clear river nature',
    'pantanal': 'pantanal brazil wildlife jaguar nature wetlands',
    'amazonia': 'amazon rainforest jungle river nature biodiversity',
    'amazônia': 'amazon rainforest jungle river nature biodiversity',
    'sao paulo': 'sao paulo skyline paulista avenue metropolis',
    'são paulo': 'sao paulo skyline paulista avenue metropolis',
    'sp': 'sao paulo city skyline metropolis sunset'
  };

  /**
   * Catálogo de Luxo com curadoria fotográfica de alta resolução e metadados ricos.
   */
  public static CATALOGO_CURADO: UnsplashFoto[] = [
    // Europa & Metrópoles Clássicas
    {
      id: 'paris-1',
      titulo: 'Paris & Torre Eiffel',
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80',
      tags: ['paris', 'franca', 'frança', 'europa', 'romantico', 'romântico', 'luxo', 'eiffel', 'torre', 'cidade']
    },
    {
      id: 'roma-1',
      titulo: 'Roma & Coliseu',
      url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80',
      tags: ['roma', 'italia', 'itália', 'coliseu', 'historia', 'história', 'europa', 'cultura', 'cidade']
    },
    {
      id: 'veneza-1',
      titulo: 'Veneza & Gôndolas nos Canais',
      url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=400&q=80',
      tags: ['veneza', 'italia', 'itália', 'gondola', 'canais', 'romantico', 'europa', 'luxo']
    },
    {
      id: 'londres-1',
      titulo: 'Londres & Big Ben',
      url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80',
      tags: ['londres', 'inglaterra', 'reino unido', 'big ben', 'europa', 'cidade']
    },
    {
      id: 'lisboa-1',
      titulo: 'Lisboa & Bondinho Histórico',
      url: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=400&q=80',
      tags: ['lisboa', 'portugal', 'porto', 'algarve', 'europa', 'cidade', 'historia']
    },
    {
      id: 'madri-1',
      titulo: 'Madri & Arquitetura Real',
      url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=400&q=80',
      tags: ['madri', 'barcelona', 'espanha', 'europa', 'arquitetura', 'cidade']
    },
    {
      id: 'santorini-1',
      titulo: 'Santorini & Mar Egeu (Grécia)',
      url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80',
      tags: ['santorini', 'grecia', 'grécia', 'mykonos', 'europa', 'mar', 'romantico', 'romântico', 'luxo', 'ilha']
    },
    {
      id: 'toscana-1',
      titulo: 'Toscana & Vinhedos Italianos',
      url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=400&q=80',
      tags: ['italia', 'itália', 'toscana', 'florenca', 'vinho', 'vinhos', 'vinhedo', 'vinhedos', 'enoturismo', 'campo', 'luxo']
    },
    {
      id: 'suica-1',
      titulo: 'Alpes Suíços & Neve',
      url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=400&q=80',
      tags: ['suica', 'suíça', 'alpes', 'neve', 'montanhas', 'frio', 'inverno', 'esqui', 'luxo', 'chalet']
    },

    // Ilhas Paradisíacas & Resorts Tropicais
    {
      id: 'maldivas-1',
      titulo: 'Maldivas / Bangalôs sobre a Água',
      url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80',
      tags: ['maldivas', 'praia', 'luxo', 'resort', 'lua de mel', 'ilha', 'piscina', 'mar', 'romantico']
    },
    {
      id: 'bora-bora-1',
      titulo: 'Bora Bora & Lagoa Turquesa',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['bora bora', 'tahiti', 'polinesia', 'ilha', 'praia', 'luxo', 'mar', 'resort', 'lua de mel']
    },
    {
      id: 'bali-1',
      titulo: 'Bali & Villa com Piscina Infinita',
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80',
      tags: ['bali', 'indonesia', 'resort', 'piscina', 'natureza', 'luxo', 'villa', 'asia']
    },
    {
      id: 'cancun-1',
      titulo: 'Cancún & Caribe Mexicano',
      url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8c2?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8c2?auto=format&fit=crop&w=400&q=80',
      tags: ['cancun', 'cancún', 'caribe', 'mexico', 'tulum', 'praia', 'resort', 'mar', 'luxo']
    },
    {
      id: 'tailandia-1',
      titulo: 'Tailândia & Ilhas Phi Phi',
      url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=400&q=80',
      tags: ['tailandia', 'tailândia', 'phuket', 'phi phi', 'ilha', 'praia', 'barco', 'mar', 'asia']
    },

    // Metrópoles Globais & Destinos EUA
    {
      id: 'ny-1',
      titulo: 'Nova York / Manhattan Skyline',
      url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80',
      tags: ['nova york', 'ny', 'eua', 'cidade', 'skyline', 'manhattan', 'metropole']
    },
    {
      id: 'orlando-1',
      titulo: 'Orlando / Magia & Parques Disney',
      url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=400&q=80',
      tags: ['orlando', 'disney', 'eua', 'parque', 'familia', 'família', 'castelo', 'magia']
    },
    {
      id: 'miami-1',
      titulo: 'Miami Beach & Ocean Drive',
      url: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&w=400&q=80',
      tags: ['miami', 'eua', 'praia', 'luxo', 'palmeiras', 'florida', 'mar']
    },
    {
      id: 'dubai-1',
      titulo: 'Dubai & Arquitetura Futurista',
      url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80',
      tags: ['dubai', 'luxo', 'oriente medio', 'cidade', 'resort', 'burj khalifa', 'abu dhabi', 'deserto']
    },
    {
      id: 'kyoto-1',
      titulo: 'Quioto & Templos do Japão',
      url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
      tags: ['japao', 'japão', 'kyoto', 'quioto', 'toquio', 'tóquio', 'asia', 'cultura', 'templo']
    },

    // América do Sul & Aventura
    {
      id: 'bariloche-1',
      titulo: 'Bariloche / Lagos & Montanhas',
      url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=400&q=80',
      tags: ['bariloche', 'argentina', 'neve', 'lagos', 'inverno', 'montanha', 'frio', 'patagonia', 'patagônia']
    },
    {
      id: 'chile-1',
      titulo: 'Santiago & Cordilheira dos Andes',
      url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=400&q=80',
      tags: ['santiago', 'chile', 'andes', 'montanhas', 'atacama', 'vinho']
    },
    {
      id: 'machu-picchu-1',
      titulo: 'Machu Picchu / Santuário Inca',
      url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=400&q=80',
      tags: ['machu picchu', 'peru', 'cusco', 'ruinas', 'aventura', 'historia', 'montanhas']
    },
    {
      id: 'safari-1',
      titulo: 'Safári Africano / Vida Selvagem',
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80',
      tags: ['safari', 'safári', 'africa', 'áfrica', 'africa do sul', 'áfrica do sul', 'natureza', 'aventura', 'wildlife', 'lodge', 'luxo']
    },

    // Brasil & Praias Paradisíacas Nacionais
    {
      id: 'rio-1',
      titulo: 'Rio de Janeiro / Copacabana & Cristo',
      url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=80',
      tags: ['rio de janeiro', 'rio', 'brasil', 'praia', 'cristo', 'mar', 'cidade']
    },
    {
      id: 'noronha-1',
      titulo: 'Fernando de Noronha / Morro Dois Irmãos',
      url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=400&q=80',
      tags: ['noronha', 'fernando de noronha', 'brasil', 'praia', 'ilha', 'mar', 'mergulho', 'natureza']
    },
    {
      id: 'maragogi-1',
      titulo: 'Maragogi / Piscinas Naturais',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['maragogi', 'alagoas', 'brasil', 'praia', 'mar', 'nordeste', 'resort', 'carneiros']
    },
    {
      id: 'trancoso-1',
      titulo: 'Trancoso & Bahia / Charme Rústico',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
      tags: ['trancoso', 'bahia', 'salvador', 'brasil', 'praia', 'luxo', 'resort', 'pousada', 'nordeste']
    },
    {
      id: 'lencois-1',
      titulo: 'Lençóis Maranhenses / Dunas & Lagoas',
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80',
      tags: ['lencois maranhenses', 'lençóis maranhenses', 'jalapao', 'jalapão', 'dunas', 'lagoa', 'brasil', 'natureza', 'aventura']
    },
    {
      id: 'foz-1',
      titulo: 'Cataratas do Iguaçu / Natureza Majestosa',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      tags: ['foz do iguacu', 'foz do iguaçu', 'cataratas', 'brasil', 'natureza', 'cachoeira', 'aventura']
    },
    {
      id: 'gramado-1',
      titulo: 'Gramado & Serra Gaúcha',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
      tags: ['gramado', 'canela', 'serra gaucha', 'serra gaúcha', 'inverno', 'frio', 'vinho', 'brasil']
    },
    {
      id: 'cruzeiro-1',
      titulo: 'Cruzeiro de Luxo em Alto Mar',
      url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=400&q=80',
      tags: ['cruzeiro', 'iate', 'barco', 'mar', 'luxo', 'oceano', 'navio', 'ferias']
    }
  ];

  /**
   * Traduz um termo de busca digitado pelo usuário em PT-BR para uma query otimizada em Inglês.
   */
  public static traduzirParaIngles(termo: string): string {
    if (!termo || !termo.trim()) return 'luxury travel destination';

    const termoNormalizado = termo
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // 1. Busca correspondência direta no dicionário (chave exata)
    if (this.DICIONARIO_TRADUCAO[termoNormalizado]) {
      return this.DICIONARIO_TRADUCAO[termoNormalizado];
    }

    // 2. Busca por termos compostos dentro do dicionário
    for (const [chave, traducao] of Object.entries(this.DICIONARIO_TRADUCAO)) {
      const chaveNorm = chave.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (termoNormalizado.includes(chaveNorm) || chaveNorm.includes(termoNormalizado)) {
        return traducao;
      }
    }

    // 3. Busca por palavras individuais
    const palavras = termoNormalizado.split(/\s+/);
    const termosTraduzidos: string[] = [];

    for (const palavra of palavras) {
      if (palavra.length <= 2) continue;
      let encontrada = false;
      for (const [chave, traducao] of Object.entries(this.DICIONARIO_TRADUCAO)) {
        const chaveNorm = chave.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (chaveNorm === palavra) {
          termosTraduzidos.push(traducao);
          encontrada = true;
          break;
        }
      }
      if (!encontrada) {
        termosTraduzidos.push(palavra);
      }
    }

    if (termosTraduzidos.length > 0) {
      return `${termosTraduzidos.join(' ')} luxury travel`;
    }

    return `${termo} luxury travel destination`;
  }

  /**
   * Executa a busca de imagens com base em um termo digitado pelo usuário (PT-BR ou EN).
   * Retorna uma lista de fotos curadas e formatadas para exibição no Studio.
   */
  public static async buscarFotos(termo: string): Promise<{ queryEng: string; fotos: UnsplashFoto[] }> {
    const queryEng = this.traduzirParaIngles(termo);
    const termoNormalizado = (termo || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = termoNormalizado.split(/\s+/).filter(t => t.length > 1);

    // 1. Filtra fotos do catálogo curado por correspondência exata, parcial ou de tokens
    const fotosCombinadas = this.CATALOGO_CURADO.filter(f => {
      const titNorm = f.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matchTitulo = titNorm.includes(termoNormalizado) || tokens.some(tok => titNorm.includes(tok));
      const matchTags = f.tags?.some(t => {
        const tNorm = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return tNorm.includes(termoNormalizado) || termoNormalizado.includes(tNorm) || tokens.some(tok => tNorm.includes(tok));
      });
      const matchQueryEng = f.tags?.some(t => queryEng.toLowerCase().includes(t.toLowerCase()));
      return matchTitulo || matchTags || matchQueryEng;
    });

    const resultadosUnicos = new Map<string, UnsplashFoto>();
    fotosCombinadas.forEach(f => resultadosUnicos.set(f.id, f));

    // 2. Se não encontrou fotos suficientes, complementa com fotos gerais do catálogo de luxo
    if (resultadosUnicos.size < 6) {
      this.CATALOGO_CURADO.forEach(f => {
        if (!resultadosUnicos.has(f.id) && resultadosUnicos.size < 12) {
          resultadosUnicos.set(f.id, f);
        }
      });
    }

    return {
      queryEng,
      fotos: Array.from(resultadosUnicos.values())
    };
  }
}

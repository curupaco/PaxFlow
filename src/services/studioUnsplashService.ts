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
    'praia': 'tropical beach luxury',
    'praias': 'tropical beach luxury',
    'mar': 'ocean turquoise water',
    'ilha': 'tropical island resort',
    'ilhas': 'tropical islands aerial',
    'montanha': 'majestic mountains landscape',
    'montanhas': 'majestic mountains landscape',
    'neve': 'snow ski resort winter',
    'esqui': 'ski resort winter alps',
    'floresta': 'rainforest nature lush',
    'natureza': 'nature landscape scenic',
    'campo': 'countryside vineyard scenic',
    'deserto': 'desert dunes luxury camp',
    'cachoeira': 'waterfall tropical nature',
    'lago': 'lake mountain reflection',
    'canyon': 'canyon rock formation',
    'safari': 'safari wildlife luxury lodge',

    // Estilos de Viagem & Luxo
    'luxo': 'luxury travel 5 star hotel',
    'resort': 'luxury resort pool infinity',
    'hotel': 'luxury boutique hotel',
    'piscina': 'infinity pool luxury view',
    'casal': 'romantic couple getaway travel',
    'romantico': 'romantic sunset travel couple',
    'romântico': 'romantic sunset travel couple',
    'lua de mel': 'honeymoon luxury destination',
    'familia': 'family vacation luxury resort',
    'família': 'family vacation luxury resort',
    'cruzeiro': 'luxury cruise ship ocean',
    'iate': 'luxury yacht sailing sunset',
    'barco': 'boat sailing turquoise water',
    'gastronomia': 'fine dining gourmet cuisine wine',
    'vinho': 'vineyard winery tuscany wine',
    'vinhos': 'vineyard winery tuscany wine',
    'vinhedo': 'vineyard winery tuscany wine',
    'vinhedos': 'vineyard winery tuscany wine',
    'enoturismo': 'vineyard winery landscape wine',
    'aventura': 'adventure travel trekking landscape',
    'mergulho': 'scuba diving coral reef clear water',
    'aurora boreal': 'northern lights aurora borealis',
    'por do sol': 'golden sunset beach ocean',
    'pôr do sol': 'golden sunset beach ocean',

    // Cidades e Destinos Internacionais
    'paris': 'paris eiffel tower luxury',
    'frança': 'france countryside paris',
    'roma': 'rome colosseum italy',
    'italia': 'italy amalfi coast tuscany',
    'itália': 'italy amalfi coast tuscany',
    'veneza': 'venice canals gondola',
    'milao': 'milan duomo italy',
    'milão': 'milan duomo italy',
    'londres': 'london big ben thames',
    'inglaterra': 'england london countryside',
    'nova york': 'new york city skyline manhattan',
    'ny': 'new york city skyline manhattan',
    'orlando': 'orlando theme park disney',
    'disney': 'disney castle fireworks magical',
    'miami': 'miami beach south beach luxury',
    'los angeles': 'los angeles california palm trees',
    'las vegas': 'las vegas strip luxury resort',
    'havai': 'hawaii tropical beach sunset',
    'havaí': 'hawaii tropical beach sunset',
    'caribe': 'caribbean turquoise beach luxury',
    'cancun': 'cancun mexico resort beach',
    'cancún': 'cancun mexico resort beach',
    'punta cana': 'punta cana resort palm trees',
    'maldivas': 'maldives overwater villa turquoise',
    'bora bora': 'bora bora overwater bungalow lagoon',
    'tahiti': 'tahiti french polynesia tropical',
    'bali': 'bali indonesia luxury villa temple',
    'tailandia': 'thailand phuket islands phi phi',
    'tailândia': 'thailand phuket islands phi phi',
    'japao': 'tokyo kyoto japan cherry blossom',
    'japão': 'tokyo kyoto japan cherry blossom',
    'toquio': 'tokyo skyline shinjuku japan',
    'tóquio': 'tokyo skyline shinjuku japan',
    'dubai': 'dubai burj khalifa luxury marina',
    'grecia': 'santorini greece white blue caldera',
    'grécia': 'santorini greece white blue caldera',
    'santorini': 'santorini caldera sunset greece',
    'mykonos': 'mykonos greece windmills beach',
    'portugal': 'lisbon porto portugal coast',
    'lisboa': 'lisbon tram historic city',
    'porto': 'porto douro river bridge',
    'espanha': 'spain barcelona madrid coast',
    'barcelona': 'barcelona sagrada familia spain',
    'madri': 'madrid spain architecture royal',
    'suica': 'switzerland alps zermatt matterhorn',
    'suíça': 'switzerland alps zermatt matterhorn',
    'bariloche': 'bariloche argentina lake nahuel huapi',
    'patagonia': 'patagonia perito moreno glacier torres del paine',
    'patagônia': 'patagonia perito moreno glacier torres del paine',
    'santiago': 'santiago chile andes mountains view',
    'chile': 'atacama desert chile patagonia andes',
    'atacama': 'san pedro de atacama desert stars landscape',
    'buenos aires': 'buenos aires recoleta puerto madero',
    'argentina': 'argentina buenos aires mendoza wine',
    'mendoza': 'mendoza vineyard andes wine argentina',
    'cusco': 'cusco machu picchu peru ruins',
    'machu picchu': 'machu picchu peru ancient ruins',
    'peru': 'peru machu picchu sacred valley',
    'africa do sul': 'cape town south africa table mountain safari',
    'áfrica do sul': 'cape town south africa table mountain safari',

    // Cidades e Destinos Nacionais (Brasil)
    'rio de janeiro': 'rio de janeiro cristo corcovado ipanema',
    'rio': 'rio de janeiro copacabana beach sugarloaf',
    'fernando de noronha': 'fernando de noronha baia do sancho morro dois irmaos',
    'noronha': 'fernando de noronha brazil tropical ocean',
    'maragogi': 'maragogi alagoas natural pools beach',
    'gramado': 'gramado canela serra gaucha brazil',
    'porto de galinhas': 'porto de galinhas natural pools beach',
    'salvador': 'salvador bahia pelourinho farol da barra',
    'bahia': 'trancoso bahia beach tropical brazil',
    'trancoso': 'trancoso bahia quadrado beach luxury',
    'jalapao': 'jalapao fervedouro tocantins brazil',
    'jalapão': 'jalapao fervedouro tocantins brazil',
    'lencois maranhenses': 'lencois maranhenses dunes lagoons brazil',
    'lençóis maranhenses': 'lencois maranhenses dunes lagoons brazil',
    'foz do iguacu': 'iguazu falls waterfalls nature brazil',
    'foz do iguaçu': 'iguazu falls waterfalls nature brazil',
    'fortaleza': 'fortaleza ceara jeri beach',
    'jericoacoara': 'jericoacoara dunes sunset lagoon beach',
    'jeri': 'jericoacoara dunes sunset beach'
  };

  /**
   * Catálogo de Luxo com curadoria fotográfica de alta resolução.
   */
  public static CATALOGO_CURADO: UnsplashFoto[] = [
    {
      id: 'paris-1',
      titulo: 'Paris & Torre Eiffel',
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80',
      tags: ['paris', 'franca', 'frança', 'europa', 'romantico', 'romântico', 'luxo']
    },
    {
      id: 'roma-1',
      titulo: 'Roma & Coliseu',
      url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80',
      tags: ['roma', 'italia', 'itália', 'historia', 'história', 'europa']
    },
    {
      id: 'ny-1',
      titulo: 'Nova York / Manhattan',
      url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80',
      tags: ['nova york', 'ny', 'eua', 'cidade', 'skyline']
    },
    {
      id: 'maldivas-1',
      titulo: 'Maldivas / Bangalôs sobre a Água',
      url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80',
      tags: ['maldivas', 'praia', 'luxo', 'resort', 'lua de mel', 'ilha']
    },
    {
      id: 'santorini-1',
      titulo: 'Santorini & Mar Egeu (Grécia)',
      url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80',
      tags: ['santorini', 'grecia', 'grécia', 'europa', 'mar', 'romantico', 'romântico']
    },
    {
      id: 'suica-1',
      titulo: 'Alpes Suíços & Neve',
      url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=400&q=80',
      tags: ['suica', 'suíça', 'alpes', 'neve', 'montanhas', 'esqui']
    },
    {
      id: 'dubai-1',
      titulo: 'Dubai & Arquitetura Futurista',
      url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80',
      tags: ['dubai', 'luxo', 'oriente medio', 'cidade', 'resort']
    },
    {
      id: 'rio-1',
      titulo: 'Rio de Janeiro / Orla & Morros',
      url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=80',
      tags: ['rio de janeiro', 'rio', 'brasil', 'praia', 'cristo']
    },
    {
      id: 'noronha-1',
      titulo: 'Fernando de Noronha / Dois Irmãos',
      url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=400&q=80',
      tags: ['noronha', 'fernando de noronha', 'brasil', 'praia', 'ilha']
    },
    {
      id: 'cancun-1',
      titulo: 'Cancún & Caribe Mexicano',
      url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8c2?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8c2?auto=format&fit=crop&w=400&q=80',
      tags: ['cancun', 'cancún', 'caribe', 'mexico', 'praia', 'resort']
    },
    {
      id: 'orlando-1',
      titulo: 'Orlando / Magia & Parques',
      url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=400&q=80',
      tags: ['orlando', 'disney', 'eua', 'parque', 'familia', 'família']
    },
    {
      id: 'bariloche-1',
      titulo: 'Bariloche / Lagos & Montanhas',
      url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=400&q=80',
      tags: ['bariloche', 'argentina', 'neve', 'lagos', 'inverno']
    },
    {
      id: 'chile-1',
      titulo: 'Santiago & Cordilheira dos Andes',
      url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=400&q=80',
      tags: ['santiago', 'chile', 'andes', 'montanhas']
    },
    {
      id: 'kyoto-1',
      titulo: 'Quioto & Templos do Japão',
      url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
      tags: ['japao', 'japão', 'kyoto', 'toquio', 'tóquio', 'asia', 'cultura']
    },
    {
      id: 'toscana-1',
      titulo: 'Toscana & Vinhedos Italianos',
      url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=400&q=80',
      tags: ['italia', 'itália', 'toscana', 'vinho', 'enoturismo', 'campo']
    },
    {
      id: 'safari-1',
      titulo: 'Safári Africano / Vida Selvagem',
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80',
      tags: ['safari', 'africa', 'áfrica', 'natureza', 'aventura', 'wildlife']
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

    // 2. Busca por palavras-chave parciais
    const palavras = termoNormalizado.split(/\s+/);
    const termosTraduzidos: string[] = [];

    for (const palavra of palavras) {
      let encontrada = false;
      for (const [chave, traducao] of Object.entries(this.DICIONARIO_TRADUCAO)) {
        const chaveNormalizada = chave.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (chaveNormalizada === palavra) {
          termosTraduzidos.push(traducao);
          encontrada = true;
          break;
        }
      }
      if (!encontrada && palavra.length > 2) {
        termosTraduzidos.push(palavra);
      }
    }

    if (termosTraduzidos.length > 0) {
      return termosTraduzidos.join(' ');
    }

    return `${termo} travel destination`;
  }

  /**
   * Executa a busca de imagens com base em um termo digitado pelo usuário (PT-BR ou EN).
   * Retorna uma lista de fotos curadas e formatadas para exibição no Studio.
   */
  public static async buscarFotos(termo: string): Promise<{ queryEng: string; fotos: UnsplashFoto[] }> {
    const queryEng = this.traduzirParaIngles(termo);
    const termoNormalizado = (termo || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Filtra fotos do catálogo curado que combinam com os termos ou tags
    const fotosLocais = this.CATALOGO_CURADO.filter(f => {
      const matchTitulo = f.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termoNormalizado);
      const matchTags = f.tags?.some(t => {
        const tNorm = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return tNorm.includes(termoNormalizado) || termoNormalizado.includes(tNorm);
      });
      const matchQueryEng = f.tags?.some(t => queryEng.toLowerCase().includes(t.toLowerCase()));
      return matchTitulo || matchTags || matchQueryEng;
    });

    const resultadosUnicos = new Map<string, UnsplashFoto>();
    fotosLocais.forEach(f => resultadosUnicos.set(f.id, f));

    // Se a busca for genérica ou não encontrou fotos suficientes, preenche com fotos do catálogo
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

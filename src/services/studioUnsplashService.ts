/**
 * Serviço de Busca Direta de Fotografias do Unsplash para o PaxFlow Studio™.
 * Busca direta e objetiva por termos digitados pelo usuário, sem traduções artificiais
 * e sem adição de termos forçados.
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
   * Catálogo de Fotografias de Destinos e Viagens.
   */
  public static CATALOGO_FOTOS: UnsplashFoto[] = [
    // Brasil - Centro-Oeste / Pantanal / Mato Grosso / Bonito
    {
      id: 'pantanal-1',
      titulo: 'Pantanal & Mato Grosso',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      tags: ['mato grosso', 'pantanal', 'cuiaba', 'cuiabá', 'natureza', 'brasil', 'fauna', 'rio', 'aves', 'onca', 'onça']
    },
    {
      id: 'bonito-1',
      titulo: 'Bonito (Mato Grosso do Sul)',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['bonito', 'mato grosso', 'mato grosso do sul', 'ms', 'rio da prata', 'flutuacao', 'gruta', 'natureza', 'brasil']
    },
    {
      id: 'chapada-1',
      titulo: 'Chapada dos Guimarães (Mato Grosso)',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
      tags: ['chapada dos guimaraes', 'chapada dos guimarães', 'mato grosso', 'mt', 'canyon', 'cachoeira', 'brasil']
    },
    {
      id: 'amazonia-1',
      titulo: 'Floresta Amazônica & Rio Negro',
      url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=400&q=80',
      tags: ['amazonia', 'amazônia', 'manaus', 'floresta', 'rio', 'natureza', 'brasil', 'selva']
    },

    // Brasil - Nordeste & Praias
    {
      id: 'noronha-1',
      titulo: 'Fernando de Noronha',
      url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=400&q=80',
      tags: ['noronha', 'fernando de noronha', 'sancho', 'praia', 'ilha', 'mar', 'nordeste', 'brasil']
    },
    {
      id: 'maragogi-1',
      titulo: 'Maragogi & Piscinas Naturais',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['maragogi', 'alagoas', 'maceio', 'maceió', 'praia', 'piscinas naturais', 'nordeste', 'brasil']
    },
    {
      id: 'carneiros-1',
      titulo: 'Praia dos Carneiros & Porto de Galinhas',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
      tags: ['carneiros', 'praia dos carneiros', 'porto de galinhas', 'recife', 'pernambuco', 'praia', 'nordeste', 'brasil']
    },
    {
      id: 'trancoso-1',
      titulo: 'Trancoso & Arraial d\'Ajuda',
      url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
      tags: ['trancoso', 'bahia', 'porto seguro', 'arraial d ajuda', 'praia', 'nordeste', 'brasil']
    },
    {
      id: 'salvador-1',
      titulo: 'Salvador & Pelourinho',
      url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80',
      tags: ['salvador', 'bahia', 'pelourinho', 'farol da barra', 'cultura', 'nordeste', 'brasil']
    },
    {
      id: 'lencois-1',
      titulo: 'Lençóis Maranhenses',
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80',
      tags: ['lencois maranhenses', 'lençóis maranhenses', 'maranhao', 'maranhão', 'dunas', 'lagoas', 'brasil']
    },
    {
      id: 'jalapao-1',
      titulo: 'Jalapão & Fervedouros',
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80',
      tags: ['jalapao', 'jalapão', 'tocantins', 'fervedouro', 'dunas', 'natureza', 'brasil']
    },
    {
      id: 'jeri-1',
      titulo: 'Jericoacoara & Dunas',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['jeri', 'jericoacoara', 'ceara', 'ceará', 'fortaleza', 'dunas', 'lagoa', 'praia', 'brasil']
    },

    // Brasil - Sul & Sudeste
    {
      id: 'rio-1',
      titulo: 'Rio de Janeiro / Copacabana & Cristo',
      url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=80',
      tags: ['rio de janeiro', 'rio', 'cristo', 'copacabana', 'ipanema', 'praia', 'cidade', 'brasil']
    },
    {
      id: 'gramado-1',
      titulo: 'Gramado & Canela (Serra Gaúcha)',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
      tags: ['gramado', 'canela', 'serra gaucha', 'serra gaúcha', 'rio grande do sul', 'frio', 'inverno', 'vinho', 'brasil']
    },
    {
      id: 'foz-1',
      titulo: 'Cataratas do Iguaçu',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
      tags: ['foz do iguacu', 'foz do iguaçu', 'cataratas', 'parana', 'paraná', 'natureza', 'brasil', 'cachoeira']
    },
    {
      id: 'floripa-1',
      titulo: 'Florianópolis & Santa Catarina',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['florianopolis', 'florianópolis', 'floripa', 'santa catarina', 'praia', 'ilha', 'brasil']
    },
    {
      id: 'sp-1',
      titulo: 'São Paulo & Avenida Paulista',
      url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80',
      tags: ['sao paulo', 'são paulo', 'sp', 'paulista', 'metropole', 'cidade', 'brasil']
    },

    // Destinos Internacionais Populares
    {
      id: 'paris-1',
      titulo: 'Paris & Torre Eiffel (França)',
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80',
      tags: ['paris', 'franca', 'frança', 'europa', 'eiffel', 'torre', 'franca']
    },
    {
      id: 'roma-1',
      titulo: 'Roma & Coliseu (Itália)',
      url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80',
      tags: ['roma', 'italia', 'itália', 'coliseu', 'europa', 'historia']
    },
    {
      id: 'veneza-1',
      titulo: 'Veneza & Canais (Itália)',
      url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=400&q=80',
      tags: ['veneza', 'italia', 'itália', 'gondola', 'canais', 'europa']
    },
    {
      id: 'santorini-1',
      titulo: 'Santorini (Grécia)',
      url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80',
      tags: ['santorini', 'grecia', 'grécia', 'mykonos', 'europa', 'mar', 'ilha']
    },
    {
      id: 'orlando-1',
      titulo: 'Orlando & Disney (EUA)',
      url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?auto=format&fit=crop&w=400&q=80',
      tags: ['orlando', 'disney', 'parques', 'florida', 'eua', 'estados unidos']
    },
    {
      id: 'ny-1',
      titulo: 'Nova York / Manhattan (EUA)',
      url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80',
      tags: ['nova york', 'ny', 'new york', 'manhattan', 'eua', 'cidade']
    },
    {
      id: 'miami-1',
      titulo: 'Miami Beach (EUA)',
      url: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?auto=format&fit=crop&w=400&q=80',
      tags: ['miami', 'miami beach', 'florida', 'eua', 'praia']
    },
    {
      id: 'cancun-1',
      titulo: 'Cancún & Riviera Maya (México)',
      url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8c2?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1510097467424-192d713fd8c2?auto=format&fit=crop&w=400&q=80',
      tags: ['cancun', 'cancún', 'mexico', 'méxico', 'tulum', 'caribe', 'praia', 'resort']
    },
    {
      id: 'punta-cana-1',
      titulo: 'Punta Cana (República Dominicana)',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      tags: ['punta cana', 'caribe', 'republica dominicana', 'praia', 'resort']
    },
    {
      id: 'maldivas-1',
      titulo: 'Maldivas / Bangalôs',
      url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80',
      tags: ['maldivas', 'praia', 'bangalo', 'bangalô', 'ilha', 'resort']
    },
    {
      id: 'suica-1',
      titulo: 'Alpes Suíços & Neve',
      url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=400&q=80',
      tags: ['suica', 'suíça', 'alpes', 'neve', 'esqui', 'inverno', 'montanha']
    },
    {
      id: 'bariloche-1',
      titulo: 'Bariloche & Lagos (Argentina)',
      url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=400&q=80',
      tags: ['bariloche', 'argentina', 'neve', 'lagos', 'inverno', 'patagonia', 'patagônia']
    },
    {
      id: 'santiago-1',
      titulo: 'Santiago & Cordilheira (Chile)',
      url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1578852612716-854e527abf2e?auto=format&fit=crop&w=400&q=80',
      tags: ['santiago', 'chile', 'cordilheira', 'andes', 'montanhas', 'vinho']
    },
    {
      id: 'dubai-1',
      titulo: 'Dubai (Emirados Árabes)',
      url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=400&q=80',
      tags: ['dubai', 'emirados arabes', 'burj khalifa', 'deserto', 'cidade']
    },
    {
      id: 'lisboa-1',
      titulo: 'Lisboa & Porto (Portugal)',
      url: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=400&q=80',
      tags: ['lisboa', 'porto', 'portugal', 'algarve', 'europa']
    },
    {
      id: 'madri-1',
      titulo: 'Madri & Barcelona (Espanha)',
      url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=400&q=80',
      tags: ['madri', 'barcelona', 'espanha', 'europa', 'cidade']
    },
    {
      id: 'londres-1',
      titulo: 'Londres & Big Ben (Inglaterra)',
      url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80',
      tags: ['londres', 'inglaterra', 'reino unido', 'big ben', 'europa']
    },
    {
      id: 'bali-1',
      titulo: 'Bali & Templos (Indonésia)',
      url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80',
      tags: ['bali', 'indonesia', 'indonésia', 'asia', 'praia', 'templo', 'natureza']
    },
    {
      id: 'tailandia-1',
      titulo: 'Tailândia & Ilhas Phi Phi',
      url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=400&q=80',
      tags: ['tailandia', 'tailândia', 'phuket', 'phi phi', 'bangkok', 'asia', 'praia', 'ilha']
    },
    {
      id: 'safari-1',
      titulo: 'Safári Africano (África do Sul)',
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80',
      tags: ['safari', 'safári', 'africa', 'áfrica', 'africa do sul', 'natureza', 'animais']
    },
    {
      id: 'cruzeiro-1',
      titulo: 'Cruzeiro em Alto Mar',
      url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1400&q=80',
      thumb_url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=400&q=80',
      tags: ['cruzeiro', 'navio', 'mar', 'oceano', 'ferias', 'barco']
    }
  ];

  /**
   * Executa a busca DIRETA de fotos no Unsplash usando o termo exato digitado pelo usuário.
   */
  public static async buscarFotos(termo: string): Promise<{ fotos: UnsplashFoto[] }> {
    const termoLimpo = (termo || '').trim();
    if (!termoLimpo) {
      return { fotos: this.CATALOGO_FOTOS.slice(0, 12) };
    }

    const termoNormalizado = termoLimpo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = termoNormalizado.split(/\s+/).filter(t => t.length > 1);

    // 1. Tenta buscar diretamente via API pública do Unsplash caso disponível
    try {
      const resp = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(termoLimpo)}&per_page=12&client_id=zM7H_tYh2Z0zQ_9oU3UqP4QyqK1J9A6wG2F5d8V9s4M`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.results && data.results.length > 0) {
          const fotosApi: UnsplashFoto[] = data.results.map((item: any) => ({
            id: item.id,
            titulo: item.description || item.alt_description || termoLimpo,
            url: item.urls?.regular || item.urls?.full || item.urls?.small,
            thumb_url: item.urls?.small || item.urls?.thumb || item.urls?.regular,
            fotografo_nome: item.user?.name,
            fotografo_url: item.user?.links?.html
          }));
          return { fotos: fotosApi };
        }
      }
    } catch {
      // Em caso de falha de rede/quota na API externa, utiliza o catálogo local direto
    }

    // 2. Busca direta no catálogo por correspondência de título ou tags
    const fotosLocais = this.CATALOGO_FOTOS.filter(f => {
      const titNorm = f.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matchTitulo = titNorm.includes(termoNormalizado) || tokens.some(tok => titNorm.includes(tok));
      const matchTags = f.tags?.some(t => {
        const tNorm = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return tNorm.includes(termoNormalizado) || termoNormalizado.includes(tNorm) || tokens.some(tok => tNorm.includes(tok));
      });
      return matchTitulo || matchTags;
    });

    const resultadosUnicos = new Map<string, UnsplashFoto>();
    fotosLocais.forEach(f => resultadosUnicos.set(f.id, f));

    // Se encontrou fotos correspondentes, retorna elas
    if (resultadosUnicos.size > 0) {
      return { fotos: Array.from(resultadosUnicos.values()) };
    }

    // Se nenhuma bateu exatamente, exibe as opções do catálogo
    return { fotos: this.CATALOGO_FOTOS.slice(0, 12) };
  }
}

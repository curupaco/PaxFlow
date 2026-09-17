import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioUnsplashService } from '../../src/services/studioUnsplashService';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';
import { StudioProposta } from '../../src/types';

// Mock do cliente Supabase
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Studio - Melhorias de Fotos Unsplash, Branding e Consultor Subcutâneo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve traduzir termos de busca de viagens de PT-BR para EN com inteligência semântica', () => {
    // Setup
    const termosTestes = [
      { entrada: 'praia', esperadoContem: 'beach' },
      { entrada: 'neve', esperadoContem: 'snow' },
      { entrada: 'montanhas', esperadoContem: 'mountains' },
      { entrada: 'casal', esperadoContem: 'romantic' },
      { entrada: 'safari', esperadoContem: 'safari' },
      { entrada: 'vinhedos', esperadoContem: 'wine' }
    ];

    // Action & Assert
    termosTestes.forEach(t => {
      const traducao = StudioUnsplashService.traduzirParaIngles(t.entrada);
      expect(traducao.toLowerCase()).toContain(t.esperadoContem);
    });
  });

  it('deve buscar fotos no catálogo curado do Unsplash retornando query traduzida e URLs formatadas', async () => {
    // Setup
    const termoBusca = 'Maldivas';

    // Action
    const resultado = await StudioUnsplashService.buscarFotos(termoBusca);

    // Assert
    expect(resultado.queryEng).toBeDefined();
    expect(resultado.queryEng.toLowerCase()).toContain('maldives');
    expect(resultado.fotos.length).toBeGreaterThan(0);
    expect(resultado.fotos[0].url).toContain('unsplash.com');
    expect(resultado.fotos[0].thumb_url).toBeDefined();
  });

  it('deve persistir titulo_cabecalho customizado e dados de consultor dedicado no Supabase', async () => {
    // Setup
    const propostaMock: Partial<StudioProposta> = {
      cliente_nome: 'Mariana Vasconcellos',
      destino: 'Costa Amalfitana',
      valor_total: 18500,
      moeda: 'BRL',
      titulo_cabecalho: 'BORA VIAJAR LUXURY',
      consultor_id: 'usr-123',
      consultor_nome: 'Ana Beatriz',
      consultor_whatsapp: '(11) 98888-7777',
      consultor_telefone: '(11) 3090-7070',
      consultor_email: 'ana.beatriz@agencia.com',
      consultor_avatar: 'https://images.unsplash.com/photo-consultor.jpg',
      status: 'RASCUNHO'
    };

    const retornoMock = {
      id: 'prop-uuid-1',
      ...propostaMock,
      created_at: new Date().toISOString()
    };

    const singleMock = vi.fn().mockResolvedValue({ data: retornoMock, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
    (supabase.from as any).mockReturnValue({ upsert: upsertMock });

    // Action
    const resultado = await StudioPropostasService.salvarProposta(propostaMock);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('studio_propostas');
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      titulo_cabecalho: 'BORA VIAJAR LUXURY',
      consultor_nome: 'Ana Beatriz',
      consultor_whatsapp: '(11) 98888-7777',
      consultor_telefone: '(11) 3090-7070',
      consultor_avatar: 'https://images.unsplash.com/photo-consultor.jpg'
    }));
    expect(resultado.titulo_cabecalho).toBe('BORA VIAJAR LUXURY');
    expect(resultado.consultor_nome).toBe('Ana Beatriz');
  });

  it('deve aplicar fallback seguro para titulo_cabecalho padrão quando não informado', async () => {
    // Setup
    const propostaSemBranding: Partial<StudioProposta> = {
      cliente_nome: 'Carlos Eduardo',
      destino: 'Bariloche',
      valor_total: 9400,
      moeda: 'BRL'
    };

    const retornoMock = {
      id: 'prop-uuid-2',
      ...propostaSemBranding,
      titulo_cabecalho: 'PAXFLOW LUXURY TRAVEL'
    };

    const singleMock = vi.fn().mockResolvedValue({ data: retornoMock, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
    (supabase.from as any).mockReturnValue({ upsert: upsertMock });

    // Action
    const resultado = await StudioPropostasService.salvarProposta(propostaSemBranding);

    // Assert
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      titulo_cabecalho: 'PAXFLOW LUXURY TRAVEL'
    }));
    expect(resultado.titulo_cabecalho).toBe('PAXFLOW LUXURY TRAVEL');
  });

  it('deve suportar resiliência a Schema Drift (código 42703) ao salvar campos novos do Studio sem quebrar', async () => {
    // Setup
    const propostaComCamposNovos: Partial<StudioProposta> = {
      id: 'prop-drift-1',
      cliente_nome: 'Fernanda Lima',
      destino: 'Santorini',
      titulo_cabecalho: 'EXCLUSIVE TRAVEL',
      consultor_whatsapp: '(21) 97777-6666'
    };

    // Simula erro 42703 (coluna inexistente) no primeiro upsert da tabela studio_propostas
    const erroSchemaDrift = { code: '42703', message: 'column "titulo_cabecalho" does not exist' };
    const singleErroMock = vi.fn().mockResolvedValue({ data: null, error: erroSchemaDrift });
    const selectErroMock = vi.fn().mockReturnValue({ single: singleErroMock });
    const upsertErroMock = vi.fn().mockReturnValue({ select: selectErroMock });

    // Mock do fallback salvando em global_settings
    const singleFallbackMock = vi.fn().mockResolvedValue({ data: { id: 'settings', value: '[]' }, error: null });
    const selectFallbackMock = vi.fn().mockReturnValue({ single: singleFallbackMock });
    const eqFallbackMock = vi.fn().mockReturnValue({ select: selectFallbackMock, single: singleFallbackMock });
    const upsertFallbackMock = vi.fn().mockResolvedValue({ data: { id: 'settings' }, error: null });

    (supabase.from as any).mockImplementation((tabela: string) => {
      if (tabela === 'studio_propostas') {
        return { upsert: upsertErroMock };
      }
      return {
        select: vi.fn().mockReturnValue({ eq: eqFallbackMock, single: singleFallbackMock }),
        upsert: upsertFallbackMock
      };
    });

    // Action
    const resultado = await StudioPropostasService.salvarProposta(propostaComCamposNovos);

    // Assert
    expect(resultado).toBeDefined();
    expect(resultado.cliente_nome).toBe('Fernanda Lima');
    expect(resultado.destino).toBe('Santorini');
    expect(resultado.titulo_cabecalho).toBe('EXCLUSIVE TRAVEL');
  });

  it('deve renderizar avatar de consultor com sucesso seja avatar animal SVG, foto externa ou iniciais', async () => {
    // Setup
    const { getAvatarSvg } = await import('../../src/services/avatars');

    // Action & Assert
    // 1. Avatar de animal (ex: lion, panda)
    const svgLion = getAvatarSvg('lion', 'Marcos Silva', 'w-12 h-12');
    expect(svgLion).toContain('<svg');
    expect(svgLion).toContain('lionGrad');

    const svgPanda = getAvatarSvg('panda', 'Ana Souza', 'w-12 h-12');
    expect(svgPanda).toContain('<svg');
    expect(svgPanda).toContain('pandaGrad');

    // 2. Foto externa (URL HTTP)
    const imgUrl = getAvatarSvg('https://images.unsplash.com/avatar-consultor.jpg', 'Juliana Lima', 'w-12 h-12');
    expect(imgUrl).toContain('<img');
    expect(imgUrl).toContain('https://images.unsplash.com/avatar-consultor.jpg');

    // 3. Iniciais caso sem avatar
    const initials = getAvatarSvg('', 'Carlos Ferreira', 'w-12 h-12');
    expect(initials).toContain('CF');
  });
});


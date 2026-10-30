import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioGaleriaService } from '../../src/services/studioGaleriaService';
import { supabase } from '../../src/services/supabase';
import { createSupabaseQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'fotos/test.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage.exemplo.com/fotos/test.jpg' } }))
      }))
    }
  }
}));

describe('PaxFlow Studio™ - Serviço de Galeria Própria da Agência (StudioGaleriaService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve listar fotos salvas na tabela do Supabase mescladas com o catálogo institucional base', async () => {
    // // Setup
    const fotosBancoMock = [
      {
        id: 'foto-1',
        titulo: 'Resort Fasano Angra dos Reis',
        url: 'https://images.unsplash.com/photo-exemplo-1',
        thumb_url: 'https://images.unsplash.com/photo-exemplo-1-thumb',
        tags: ['resort', 'angra', 'luxo'],
        created_at: '2026-10-30T00:00:00Z',
        origem: 'upload'
      }
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'studio_fotos_agencia') {
        return createSupabaseQueryMock(fotosBancoMock, null);
      }
      return createSupabaseQueryMock([], null);
    });

    // // Action
    const fotos = await StudioGaleriaService.listarFotosAgencia();

    // // Assert
    expect(fotos.length).toBeGreaterThan(1);
    const fotoInserida = fotos.find(f => f.id === 'foto-1');
    expect(fotoInserida).toBeDefined();
    expect(fotoInserida?.titulo).toBe('Resort Fasano Angra dos Reis');
    expect(fotoInserida?.origem).toBe('upload');
  });

  it('deve implementar padrão Zero-Break e retornar catálogo base em caso de tabela inexistente (42P01)', async () => {
    // // Setup
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'studio_fotos_agencia') {
        return createSupabaseQueryMock(null, { code: '42P01', message: 'relation "studio_fotos_agencia" does not exist' });
      }
      if (table === 'global_settings') {
        return createSupabaseQueryMock({ custom_studio_fotos: [] }, null);
      }
      return createSupabaseQueryMock([], null);
    });

    // // Action
    const fotos = await StudioGaleriaService.listarFotosAgencia();

    // // Assert
    expect(fotos.length).toBeGreaterThan(0);
    expect(fotos[0].id).toBeDefined();
    expect(fotos.some(f => f.origem === 'padrao')).toBe(true);
  });

  it('deve salvar foto na galeria e retornar a entidade completa', async () => {
    // // Setup
    const novaFotoData = {
      titulo: 'Fachada Hotel Unique SP',
      url: 'https://exemplo.com/unique.jpg',
      tags: ['hotel', 'sao paulo']
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'studio_fotos_agencia') {
        const mock = createSupabaseQueryMock({
          id: 'foto-unique-1',
          titulo: novaFotoData.titulo,
          url: novaFotoData.url,
          thumb_url: novaFotoData.url,
          tags: novaFotoData.tags,
          created_at: new Date().toISOString()
        }, null);
        mock.insert = vi.fn(() => mock);
        return mock;
      }
      return createSupabaseQueryMock([], null);
    });

    // // Action
    const salva = await StudioGaleriaService.salvarFotoAgencia(novaFotoData);

    // // Assert
    expect(salva).toBeDefined();
    expect(salva.titulo).toBe('Fachada Hotel Unique SP');
    expect(salva.url).toBe('https://exemplo.com/unique.jpg');
    expect(salva.origem).toBe('upload');
  });

  it('deve ter resiliência a Schema Drift (42703) ao salvar foto da agência e aplicar fallback', async () => {
    // // Setup
    let tentativas = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'studio_fotos_agencia') {
        tentativas++;
        if (tentativas === 1) {
          // Primeira tentativa com payload completo falha por coluna inexistente (ex: thumb_url)
          const mockErro = createSupabaseQueryMock(null, { code: '42703', message: 'column "thumb_url" does not exist' });
          mockErro.insert = vi.fn(() => mockErro);
          return mockErro;
        }
        // Segunda tentativa (fallback minimalista) tem sucesso
        const mockSucesso = createSupabaseQueryMock({
          id: 'foto-fallback-1',
          titulo: 'Foto com Fallback',
          url: 'https://exemplo.com/fallback.jpg',
          created_at: new Date().toISOString()
        }, null);
        mockSucesso.insert = vi.fn(() => mockSucesso);
        return mockSucesso;
      }
      return createSupabaseQueryMock([], null);
    });

    // // Action
    const resultado = await StudioGaleriaService.salvarFotoAgencia({
      titulo: 'Foto com Fallback',
      url: 'https://exemplo.com/fallback.jpg',
      tags: ['fallback']
    });

    // // Assert
    expect(resultado).toBeDefined();
    expect(resultado.id).toBe('foto-fallback-1');
    expect(resultado.titulo).toBe('Foto com Fallback');
    expect(resultado.url).toBe('https://exemplo.com/fallback.jpg');
    expect(tentativas).toBe(2);
  });
});

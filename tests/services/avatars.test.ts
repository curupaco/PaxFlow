import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AVATAR_OPTIONS,
  getAvatarSvg,
  uploadAvatarSupabase
} from '../../src/services/avatars';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => {
  const uploadMock = vi.fn();
  const getPublicUrlMock = vi.fn();
  const updateMock = vi.fn();
  const eqMock = vi.fn();

  return {
    supabase: {
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock
        }))
      },
      from: vi.fn(() => ({
        update: updateMock
      }))
    }
  };
});

describe('Avatars Service - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // RESOLUÇÃO DE SVGs E INICIAIS
  // ==========================================

  it('deve resolver avatar padrão de animal a partir do id pré-definido', () => {
    // Setup
    const avatarId = 'lion';

    // Action
    const html = getAvatarSvg(avatarId, 'Thiago Costa');

    // Assert
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(html).toContain('lionGrad');
  });

  it('deve gerar iniciais estilizadas em caixa alta como fallback quando não houver avatar pré-definido', () => {
    // Setup
    const nomeComposto = 'Carlos Eduardo Silva';
    const nomeSimples = 'Marina';

    // Action
    const htmlComposto = getAvatarSvg('', nomeComposto);
    const htmlSimples = getAvatarSvg('', nomeSimples);

    // Assert
    expect(htmlComposto).toContain('CE');
    expect(htmlSimples).toContain('M');
  });

  it('deve priorizar a logo oficial do PaxFlow para personas automáticas do sistema', () => {
    // Setup
    const personaSistema = 'PaxFlow Sistema';
    const personaSuporte = 'Suporte Técnico';

    // Action
    const htmlSistema = getAvatarSvg('', personaSistema);
    const htmlSuporte = getAvatarSvg('', personaSuporte);

    // Assert
    expect(htmlSistema).toContain('/logo.svg');
    expect(htmlSuporte).toContain('/logo.svg');
  });

  it('deve renderizar tag img quando avatarId for uma URL externa ou storage', () => {
    // Setup
    const urlStorage = 'https://supabase.co/storage/v1/object/public/avatars/user-1/avatar.jpg';

    // Action
    const html = getAvatarSvg(urlStorage, 'Ana Consultora');

    // Assert
    expect(html).toContain('<img src="https://supabase.co/storage/v1/object/public/avatars/user-1/avatar.jpg"');
    expect(html).toContain('alt="Avatar de Ana Consultora"');
  });

  // ==========================================
  // UPLOAD E PERSISTÊNCIA NO SUPABASE STORAGE
  // ==========================================

  it('deve realizar upload do blob no bucket avatars e atualizar profiles com a URL pública gerada', async () => {
    // Setup
    const userId = 'user-uuid-999';
    const fakeBlob = new Blob(['fake-image-bytes'], { type: 'image/jpeg' });
    const fakePublicUrl = 'https://supabase.co/storage/v1/object/public/avatars/user-uuid-999/12345.jpg';

    const mockStorageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'user-uuid-999/12345.jpg' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: fakePublicUrl } })
    });
    vi.mocked(supabase.storage.from).mockImplementation(mockStorageFrom);

    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockImplementation(() => ({
      update: mockUpdate
    } as any));

    // Action
    const publicUrlResult = await uploadAvatarSupabase(userId, fakeBlob, 'jpg');

    // Assert
    expect(publicUrlResult).toBe(fakePublicUrl);
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ avatar_url: fakePublicUrl });
    expect(mockEq).toHaveBeenCalledWith('id', userId);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadDocumentoCliente } from '../../src/services/googleDrive';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/dialog', () => ({
  showCustomAlert: vi.fn().mockResolvedValue(true),
}));

describe('GoogleDrive & Storage - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rejeitar arquivo se o tamanho exceder o limite configurado', async () => {
    // Setup
    // Mock do limite no global_settings = 5MB
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { limite_upload_mb: 5 }, error: null });
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    // Cria um arquivo simulado de 10MB
    const bigFile = {
      name: 'documento_pesado.pdf',
      size: 10 * 1024 * 1024,
      type: 'application/pdf',
    } as any;

    // Action
    const resultado = await uploadDocumentoCliente('cli-1', 'Nome', 'email@teste.com', '119999', bigFile);

    // Assert
    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain('excede o limite máximo permitido de 5MB');
  });

  it('deve realizar upload para o storage e vincular referência no cadastro do cliente', async () => {
    // Setup
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { limite_upload_mb: 25 }, error: null });
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'global_settings') return { select: selectMock } as any;
      if (table === 'clientes') return { update: updateMock } as any;
      return {} as any;
    });

    const uploadStorageMock = vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: uploadStorageMock,
    } as any);

    const validFile = {
      name: 'voucher reserva 2026.pdf',
      size: 500 * 1024,
      type: 'application/pdf',
    } as any;

    // UUID válido de cliente
    const clienteUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    // Action
    const resultado = await uploadDocumentoCliente(
      clienteUuid,
      'Cliente VIP',
      'vip@email.com',
      '11988887777',
      validFile
    );

    // Assert
    expect(resultado.success).toBe(true);
    expect(resultado.isMock).toBe(false);
    expect(resultado.googleDriveFolderUrl).toContain('supabase-storage://');
    expect(supabase.storage.from).toHaveBeenCalledWith('documentos-clientes');
    expect(uploadStorageMock).toHaveBeenCalledWith(
      expect.stringContaining(clienteUuid),
      validFile,
      expect.objectContaining({ upsert: true })
    );
    expect(updateMock).toHaveBeenCalledWith({
      google_drive_folder_url: resultado.googleDriveFolderUrl,
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', clienteUuid);
  });

  it('deve simular upload em modo sandbox sem tocar no storage ou banco', async () => {
    // Setup
    (globalThis as any).window = { paxflowSandbox: true };

    const testFile = {
      name: 'bilhete.pdf',
      size: 1024,
      type: 'application/pdf',
    } as any;

    // Action
    const resultado = await uploadDocumentoCliente(
      'cli-sandbox',
      'Cliente Sandbox',
      'sandbox@teste.com',
      '11999999999',
      testFile
    );

    // Assert
    expect(resultado.success).toBe(true);
    expect(resultado.isMock).toBe(true);
    expect(resultado.googleDriveFolderUrl).toBe('/documento_demo.pdf');
    expect(supabase.storage.from).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();

    delete (globalThis as any).window;
  });

  it('deve realizar upload no storage mas não atualizar clientes se clienteId não for UUID', async () => {
    // Setup
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const updateMock = vi.fn();

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'global_settings') return { select: selectMock } as any;
      if (table === 'clientes') return { update: updateMock } as any;
      return {} as any;
    });

    const uploadStorageMock = vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: uploadStorageMock,
    } as any);

    const validFile = {
      name: 'comprovante.pdf',
      size: 200 * 1024,
      type: 'application/pdf',
    } as any;

    // ID temporário (não é UUID)
    const clienteIdNaoUuid = 'temp-lead-12345';

    // Action
    const resultado = await uploadDocumentoCliente(
      clienteIdNaoUuid,
      'Lead Provisório',
      'lead@teste.com',
      '11988887777',
      validFile
    );

    // Assert
    expect(resultado.success).toBe(true);
    expect(resultado.googleDriveFolderUrl).toContain('supabase-storage://');
    expect(uploadStorageMock).toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('deve usar limite padrão de 25MB caso a consulta ao banco em global_settings falhe', async () => {
    // Setup
    const selectMock = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockRejectedValue(new Error('Conexão de rede falhou')),
    });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'global_settings') return { select: selectMock } as any;
      if (table === 'clientes') return { update: updateMock } as any;
      return {} as any;
    });

    const uploadStorageMock = vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: uploadStorageMock,
    } as any);

    // Arquivo de 20MB (abaixo de 25MB, deve passar mesmo com erro em global_settings)
    const file20mb = {
      name: 'video_tour.mp4',
      size: 20 * 1024 * 1024,
      type: 'video/mp4',
    } as any;

    const clienteUuid = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

    // Action
    const resultado = await uploadDocumentoCliente(
      clienteUuid,
      'Cliente Tour',
      'tour@teste.com',
      '11900001111',
      file20mb
    );

    // Assert
    expect(resultado.success).toBe(true);
    expect(uploadStorageMock).toHaveBeenCalled();
  });

  it('deve retornar erro capturado caso o upload para o bucket do Supabase Storage falhe', async () => {
    // Setup
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { limite_upload_mb: 25 }, error: null });
    const selectMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

    const uploadStorageMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Bucket quota exceeded' },
    });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: uploadStorageMock,
    } as any);

    const validFile = {
      name: 'foto.jpg',
      size: 100 * 1024,
      type: 'image/jpeg',
    } as any;

    const clienteUuid = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

    // Action
    const resultado = await uploadDocumentoCliente(
      clienteUuid,
      'Cliente Quota',
      'quota@teste.com',
      '11900002222',
      validFile
    );

    // Assert
    expect(resultado.success).toBe(false);
    expect(resultado.error).toContain('Bucket quota exceeded');
  });
});

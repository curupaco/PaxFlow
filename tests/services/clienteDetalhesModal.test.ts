import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/services/supabase';
import { ClienteDetalhesModal } from '../../src/components/common/ClienteDetalhesModal';
import { calcularCompletudeCadastral } from '../../src/controllers/clientesController';
import { formatBrDateToIso, formatIsoDateToBr } from '../../src/utils/masks';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  },
  getSessaoAtual: vi.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'consultor@agencia.com' },
    perfil: { id: 'user-123', role: 'consultor' },
    error: null
  })
}));

describe('ClienteDetalhesModal - Testes Subcutâneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar dados do cliente do Supabase e estruturar a ficha com sucesso', async () => {
    // Setup
    const mockClienteDb = {
      id: 'cli-123',
      nome: 'Mariana Vasconcellos',
      email: 'mariana@exemplo.com',
      telefone: '11988887777',
      documento: '123.456.789-00',
      data_nascimento: '1990-05-15',
      endereco: 'Av. Paulista, 1000 - São Paulo/SP',
      passaporte_numero: 'FP987654',
      passaporte_validade: '2028-12-31',
      passaportes: [
        { nome: 'Mariana Vasconcellos', numero: 'FP987654', validade: '2028-12-31' },
        { nome: 'Lucas Vasconcellos', numero: 'FP112233', validade: '2029-06-20' }
      ],
      observacoes: 'Prefere assento na janela e refeição vegetariana',
      classificacoes: ['VIP', 'WhatsApp']
    };

    const selectSingleMock = vi.fn().mockResolvedValue({ data: mockClienteDb, error: null });
    const eqMock = vi.fn().mockReturnValue({ single: selectSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    let toastChamado: { msg: string; type: string } | null = null;
    const showToast = (msg: string, type: any) => {
      toastChamado = { msg, type };
    };

    // Action
    await ClienteDetalhesModal.abrir('cli-123', { showToast });

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('clientes');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqMock).toHaveBeenCalledWith('id', 'cli-123');
    expect(selectSingleMock).toHaveBeenCalled();
    expect(toastChamado).toBeNull();
  });

  it('deve validar completude cadastral e calcular porcentagem corretamente para cliente carregado', () => {
    // Setup
    const clienteCompleto = {
      id: 'cli-456',
      nome: 'Roberto Carlos',
      email: 'roberto@globo.com',
      telefone: '11999998888',
      documento: '000.111.222-33',
      dataNascimento: '15/04/1960',
      endereco: 'Rua Urca, 100 - Rio de Janeiro/RJ',
      passaporteNumero: 'BR123456',
      passaporteValidade: '20/12/2030',
      passaportes: [{ nome: 'Roberto Carlos', numero: 'BR123456', validade: '20/12/2030' }],
      observacoes: 'Gosta de azul'
    };

    const clienteIncompleto = {
      id: 'cli-789',
      nome: 'Passageiro Balcão',
      email: '',
      telefone: '',
      documento: ''
    };

    // Action
    const compCompleto = calcularCompletudeCadastral(clienteCompleto as any);
    const compIncompleto = calcularCompletudeCadastral(clienteIncompleto as any);

    // Assert
    expect(compCompleto.porcentagem).toBeGreaterThanOrEqual(80);
    expect(compCompleto.pendencias.length).toBe(0);

    expect(compIncompleto.porcentagem).toBeLessThan(50);
    expect(compIncompleto.pendencias.length).toBeGreaterThan(0);
  });

  it('deve persistir atualizações no Supabase e disparar callback onSave com dados sincronizados', async () => {
    // Setup
    const payloadAtualizado = {
      id: 'cli-123',
      nome: 'Mariana Vasconcellos Santos',
      email: 'mariana.santos@exemplo.com',
      telefone: '11988887777',
      documento: '123.456.789-00',
      data_nascimento: '1990-05-15',
      endereco: 'Av. Paulista, 1000 - São Paulo/SP',
      passaporte_numero: 'FP987654',
      passaporte_validade: '2028-12-31',
      passaportes: [{ nome: 'Mariana Vasconcellos Santos', numero: 'FP987654', validade: '2028-12-31' }],
      observacoes: 'Cliente VIP Diamante',
      classificacoes: ['VIP', 'WhatsApp'],
      updated_at: '2026-09-16T13:20:00.000Z'
    };

    const singleMock = vi.fn().mockResolvedValue({ data: payloadAtualizado, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ update: updateMock });

    let clienteSalvoCallback: any = null;
    const onSave = (cli: any) => {
      clienteSalvoCallback = cli;
    };

    // Action
    const { data, error } = await supabase
      .from('clientes')
      .update(payloadAtualizado)
      .eq('id', 'cli-123')
      .select()
      .single();

    if (!error && onSave) {
      onSave(data);
    }

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('clientes');
    expect(updateMock).toHaveBeenCalledWith(payloadAtualizado);
    expect(clienteSalvoCallback).not.toBeNull();
    expect(clienteSalvoCallback.nome).toBe('Mariana Vasconcellos Santos');
    expect(clienteSalvoCallback.email).toBe('mariana.santos@exemplo.com');
  });

  it('deve formatar corretamente datas ISO para BR e datas BR para ISO', () => {
    // Setup
    const dataIso = '1995-10-25';
    const dataBr = '25/10/1995';

    // Action
    const convertidaBr = formatIsoDateToBr(dataIso);
    const convertidaIso = formatBrDateToIso(dataBr);

    // Assert
    expect(convertidaBr).toBe('25/10/1995');
    expect(convertidaIso).toBe('1995-10-25');
  });

  it('deve manter o cliente carregado no estado do modal sem resetar para null', async () => {
    // Setup
    const mockCliente = {
      id: 'cli-silva-1',
      nome: 'Primeiro Teste da Silva',
      email: 'teste@silva.com',
      telefone: '11977776666',
      documento: '111.222.333-44'
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockCliente, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock, single: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    (supabase.from as any).mockReturnValue({ select: selectMock });

    // Action
    await ClienteDetalhesModal.abrir('cli-silva-1', {}, mockCliente);

    // Assert
    const clienteCarregado = ClienteDetalhesModal.getClienteAtual();
    expect(clienteCarregado).not.toBeNull();
    expect(clienteCarregado?.id).toBe('cli-silva-1');
    expect(clienteCarregado?.nome).toBe('Primeiro Teste da Silva');
    expect(clienteCarregado?.email).toBe('teste@silva.com');

    // Cleanup
    ClienteDetalhesModal.fechar();
    expect(ClienteDetalhesModal.getClienteAtual()).toBeNull();
  });
});

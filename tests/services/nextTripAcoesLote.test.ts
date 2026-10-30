import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextTripEngineService, NextTripOpportunity } from '../../src/services/nextTripEngineService';
import { supabase } from '../../src/services/supabase';
import { createSupabaseQueryMock } from '../mocks/supabaseMock';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('PaxFlow Next Trip Engine™ - Ações Comerciais em Lote com Presets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const oportunidadesMock: NextTripOpportunity[] = [
    {
      clienteId: 'c-101',
      clienteNome: 'Roberto Justus',
      clienteTelefone: '11999990001',
      clienteEmail: 'roberto@exemplo.com',
      ultimoDestino: 'Paris',
      ultimaViagemData: '2025-10-15',
      origemOportunidade: 'viagem',
      destinoRecomendado: 'Toscana & Costa Amalfitana (Itália)',
      categoriaDestino: 'europa',
      scoreProntidao: 85,
      nivelProntidao: 'alto',
      statusAbordagem: 'pendente',
      motivoSugestao: 'Janela ideal de 1 ano para regresso à Europa',
      scriptAbordagemComplementar: 'Olá Roberto! Lembramos da sua viagem à França...',
      consultorId: 'cons-1',
      consultorNome: 'Ana Consultora'
    },
    {
      clienteId: 'c-102',
      clienteNome: 'Beatriz Fonseca',
      clienteTelefone: '21988880002',
      clienteEmail: 'beatriz@exemplo.com',
      ultimoDestino: 'Orlando / Disney',
      ultimaViagemData: '2025-11-01',
      origemOportunidade: 'viagem',
      destinoRecomendado: 'Universal Studios & Epic Universe',
      categoriaDestino: 'disney',
      scoreProntidao: 90,
      nivelProntidao: 'alto',
      statusAbordagem: 'pendente',
      motivoSugestao: 'Novo parque Epic Universe inaugurando',
      scriptAbordagemComplementar: 'Olá Beatriz! Temos novidades incríveis para Orlando...',
      consultorId: 'cons-1',
      consultorNome: 'Ana Consultora'
    }
  ];

  it('deve aplicar snooze em lote para múltiplos clientes no Supabase', async () => {
    // // Setup
    const ids = ['c-101', 'c-102'];
    const mockQuery = createSupabaseQueryMock(null, null);
    vi.mocked(supabase.from).mockReturnValue(mockQuery);

    // // Action
    const resultado = await NextTripEngineService.aplicarSnoozeEmLote(ids, 30);

    // // Assert
    expect(supabase.from).toHaveBeenCalledWith('clientes');
    expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      next_trip_snooze_until: expect.any(String)
    }));
    expect(mockQuery.in).toHaveBeenCalledWith('id', ids);
    expect(resultado.sucesso).toBe(2);
    expect(resultado.total).toBe(2);
    expect(resultado.dataLimiteIso).toBeDefined();
  });

  it('deve gerar texto consolidado de abordagens comerciais formatado para WhatsApp', () => {
    // // Setup
    const ops = oportunidadesMock;

    // // Action
    const textoConsolidado = NextTripEngineService.gerarLoteAbordagemTexto(ops);

    // // Assert
    expect(textoConsolidado).toContain('PAXFLOW NEXT TRIP ENGINE™');
    expect(textoConsolidado).toContain('Total de Contatos: 2');
    expect(textoConsolidado).toContain('CLIENTE #1: ROBERTO JUSTUS');
    expect(textoConsolidado).toContain('Toscana & Costa Amalfitana (Itália)');
    expect(textoConsolidado).toContain('CLIENTE #2: BEATRIZ FONSECA');
    expect(textoConsolidado).toContain('Universal Studios & Epic Universe');
    expect(textoConsolidado).toContain('[SCRIPT DE ABORDAGEM WHATSAPP]');
  });

  it('deve gerar CSV comercial com colunas e linhas sanitizadas', () => {
    // // Setup
    const ops = oportunidadesMock;

    // // Action
    const csvContent = NextTripEngineService.gerarCsvAbordagem(ops);

    // // Assert
    const linhas = csvContent.split('\r\n');
    expect(linhas.length).toBe(3); // Cabeçalho + 2 linhas
    expect(linhas[0]).toContain('Nome;Telefone;Email;Destino Recomendado;Categoria;Score;Classificacao;Motivo;Script Abordagem');
    expect(linhas[1]).toContain('Roberto Justus');
    expect(linhas[1]).toContain('11999990001');
    expect(linhas[2]).toContain('Beatriz Fonseca');
    expect(linhas[2]).toContain('21988880002');
  });

  it('deve retornar contagem zerada caso lista de IDs para snooze em lote seja vazia', async () => {
    // // Setup
    const idsVazios: string[] = [];

    // // Action
    const res = await NextTripEngineService.aplicarSnoozeEmLote(idsVazios);

    // // Assert
    expect(res.sucesso).toBe(0);
    expect(res.total).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

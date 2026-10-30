import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('PaxFlow Studio - Geração de Proposta em 1-Clique a partir de Orçamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve gerar proposta estruturada com foto automática, itinerário e vínculo ao orçamento original', async () => {
    // Setup
    const mockOrcamento = {
      id: 'orc-999',
      nomeCliente: 'Ana Beatriz Souza',
      contato: '11988887777',
      email: 'ana.souza@gmail.com',
      destino: 'Pantanal & Bonito',
      dataViagem: '15/11/2026',
      valorProposta: 12500,
      consultorId: 'cons-1'
    };

    const mockConsultor = {
      id: 'cons-1',
      nome: 'Juliana Consultora',
      avatar_url: 'avatar-juliana.png',
      whatsapp: '11977776666',
      email: 'juliana@agencia.com'
    };

    const mockUpsert = vi.fn().mockImplementation((payload: any) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'prop-gerada-1',
            ...payload
          },
          error: null
        })
      })
    }));

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'studio_propostas') {
        return {
          upsert: mockUpsert
        };
      }
      return {};
    });

    // Action
    const proposta = await StudioPropostasService.criarPropostaFromOrcamento(mockOrcamento, mockConsultor);

    // Assert
    expect(proposta).toBeDefined();
    expect(proposta.cliente_nome).toBe('Ana Beatriz Souza');
    expect(proposta.destino).toBe('Pantanal & Bonito');
    expect(proposta.valor_total).toBe(12500);
    expect(proposta.orcamento_origem_id).toBe('orc-999');
    expect(proposta.consultor_nome).toBe('Juliana Consultora');
    expect(proposta.data_ida).toBe('2026-11-15');
    expect(proposta.foto_capa_url).toContain('unsplash');
    expect(proposta.itinerario_dias).toHaveLength(1);
    expect(proposta.itinerario_dias[0].tituloDia).toContain('Pantanal & Bonito');
  });

  it('deve tratar data ISO e destinos genéricos sem quebrar', async () => {
    // Setup
    const mockOrcamento = {
      id: 'orc-iso-123',
      nome_cliente: 'Roberto Lima',
      telefone: '21999990000',
      destino: 'Europa Clássica',
      dataViagem: '2027-04-10',
      valor_proposta: '8400'
    };

    const mockUpsert = vi.fn().mockImplementation((payload: any) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'prop-iso-1', ...payload },
          error: null
        })
      })
    }));

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'studio_propostas') {
        return { upsert: mockUpsert };
      }
      return {};
    });

    // Action
    const proposta = await StudioPropostasService.criarPropostaFromOrcamento(mockOrcamento);

    // Assert
    expect(proposta).toBeDefined();
    expect(proposta.cliente_nome).toBe('Roberto Lima');
    expect(proposta.data_ida).toBe('2027-04-10');
    expect(proposta.valor_total).toBe(8400);
  });
});

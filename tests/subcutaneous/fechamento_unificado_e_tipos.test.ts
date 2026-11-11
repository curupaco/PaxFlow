import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calcularFinanceiroProduto, calcularTotaisViagem } from '../../src/utils/productFinancialHelper';
import { DashboardFilterEngine } from '../../src/components/dashboard/DashboardFilterEngine';

describe('Fechamento Unificado e Sincronização Operacional (Subcutâneo)', () => {
  it('deve calcular corretamente rentabilidade acumulando comissão, markup e rav em qualquer tipo de produto', () => {
    // Setup: Viagem com 1 produto de Aéreo com Markup (ex: VIA-0334 de Florianópolis) e 1 produto Hotel com Comissão
    const viagem = {
      id: 'via-0334',
      destino: 'Florianópolis, Brasil',
      produtos: [
        {
          id: 'prod-aereo-markup',
          tipo: 'Passagem aérea',
          valor_venda: 478.26,
          tarifa: 238.26,
          taxa: 0,
          comissao: 0,
          markup: 240.00,
          rav: 0
        },
        {
          id: 'prod-hotel-comissao',
          tipo: 'Hotel',
          valor_venda: 1000.00,
          tarifa: 850.00,
          taxa: 50.00,
          comissao: 100.00,
          markup: 0,
          rav: 0
        }
      ]
    };

    // Action
    const totais = calcularTotaisViagem(viagem);

    // Assert
    expect(totais.totalVenda).toBeCloseTo(1478.26, 2);
    expect(totais.totalMarkup).toBe(240.00);
    expect(totais.totalComissao).toBe(100.00);
    // Rentabilidade Total: 240 (markup) + 100 (comissão) = 340.00
    expect(totais.totalRentabilidade).toBe(340.00);
  });

  it('não deve filtrar fora viagens do período solicitado por data financeira mesmo se o modo Mês Corrente estiver ativo', () => {
    // Setup: Viagem realizada/faturada em Outubro/2026, com created_at fora do mês corrente
    const viagens = [
      {
        id: 'viagem-outubro',
        codigo_ref: 'VIA-0100',
        consultor_id: 'guto-1',
        data_financeiro: '2026-10-15',
        data_ida: '2026-10-20',
        data_volta: '2026-10-28',
        created_at: '2026-08-01T10:00:00Z',
        status: 'pos_venda',
        produtos: [
          { id: 'p1', tipo: 'Pacote', valor_venda: 5000, comissao: 500, markup: 200 }
        ]
      },
      {
        id: 'viagem-novembro',
        codigo_ref: 'VIA-0200',
        consultor_id: 'guto-1',
        data_financeiro: '2026-11-05',
        data_ida: '2026-11-10',
        data_volta: '2026-11-15',
        created_at: '2026-11-01T10:00:00Z',
        status: 'pos_venda',
        produtos: [
          { id: 'p2', tipo: 'Pacote', valor_venda: 3000, comissao: 300, markup: 100 }
        ]
      }
    ];

    // Action: Filtra com Data Fin: 01/10/2026 a 31/10/2026, mesmo que viewModeMonth venha como 'current'
    const resultado = DashboardFilterEngine.filtrarEOrdenarViagens({
      viagens,
      user: { id: 'admin-1' },
      perfil: { id: 'admin-1', role: 'admin', nome: 'Admin' } as any,
      consultores: [],
      selectedConsultantId: 'guto-1',
      buscaTermo: '',
      viewModeMonth: 'current', // Simula botão Mês Corrente ainda ativo na interface
      activeStatusTab: 'todos',
      confFilters: { finPendente: false, finOk: false, procPendente: false, procOk: false },
      dataFinStart: '2026-10-01',
      dataFinEnd: '2026-10-31',
      dataIdaStart: '',
      dataIdaEnd: '',
      dataVoltaStart: '',
      dataVoltaEnd: '',
      advMesAno: '',
      advProdutos: [],
      advProdutoMatchMode: 'AND',
      advDestinos: [],
      advFornecedor: '',
      advValorMin: null,
      advValorMax: null,
      advTarifaMin: null,
      advTarifaMax: null,
      advTaxaMin: null,
      advTaxaMax: null,
      advComissaoMin: null,
      advComissaoMax: null,
      advMarkupMin: null,
      advMarkupMax: null,
      advRavMin: null,
      advRavMax: null,
      advRentabilidadeMin: null,
      advRentabilidadeMax: null,
      advMarkupRav: 'todos',
      advAnexos: 'todos',
      advPendencias: 'todos',
      advDivisao: 'todos',
      advContatosEmbarque: 'todos',
      advConsultores: [],
      slaPreEmbarqueDias: 7,
      slaPosViagemDias: 3
    });

    // Assert: A viagem de Outubro DEVE ser incluída porque há filtro explícito de data financeira
    expect(resultado.filtrados.map(v => v.id)).toContain('viagem-outubro');
    expect(resultado.filtrados.map(v => v.id)).not.toContain('viagem-novembro');
    expect(resultado.filtrados.length).toBe(1);
  });

  it('deve fornecer catálogo resiliente de tipos de produto mesmo se o banco de dados retornar vazio por RLS ou falha', async () => {
    // Setup
    const { obterTiposProdutoValidos, renderNovoProdutoFormHTML } = await import('../../src/components/dashboard/DashboardTemplates');

    // Action 1: Array vazio do banco
    const tiposVazios = obterTiposProdutoValidos([]);

    // Assert 1: Deve conter os tipos essenciais (Aéreo, Hotel, etc.)
    expect(tiposVazios.length).toBeGreaterThan(0);
    const nomes = tiposVazios.map((t: any) => t.nome);
    expect(nomes).toContain('Aéreo Facial');
    expect(nomes).toContain('Hotel');
    expect(nomes).toContain('MARKUP');
    expect(nomes).toContain('RAV - 12%');

    // Action 2: Renderização do formulário com array vazio
    const htmlForm = renderNovoProdutoFormHTML([]);

    // Assert 2: O formulário deve conter os <option> preenchidos e não ficar em branco
    expect(htmlForm).toContain('<option value="Aéreo Facial"');
    expect(htmlForm).toContain('<option value="Hotel"');
    expect(htmlForm).not.toContain('MUDAR!');
  });
});

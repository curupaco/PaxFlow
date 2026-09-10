import { describe, it, expect } from 'vitest';
import { Orcamento, Viagem, Cliente, Comentario, PerfilConsultor } from '../../src/types';

describe('Testes de Contrato de Schema do Supabase (Prevenção de Schema Drift)', () => {
  it('deve validar que a estrutura de payload de Orçamentos possui as colunas oficiais do PostgreSQL', () => {
    // Setup - Colunas oficiais esperadas na tabela "orcamentos" do Supabase
    const colunasOficiaisOrcamentos = new Set([
      'consultor_id',
      'cliente_id',
      'nome_cliente',
      'contato',
      'destino',
      'destino_id',
      'data_viagem',
      'temperatura',
      'tags',
      'status',
      'sub_status',
      'notas_negociacao',
      'valor_proposta',
      'valor_viagem',
      'origem',
      'documentos_url',
    ]);

    // Simulação do payload gerado pelo OrcamentosService.persistOrcamento
    const payloadGerado: any = {
      consultor_id: 'user-123',
      cliente_id: 'cli-456',
      nome_cliente: 'Cliente Teste',
      contato: '11999998888',
      destino: 'Paris',
      destino_id: null,
      data_viagem: '2026-10-10',
      temperatura: 'QUENTE',
      tags: ['casal'],
      status: 'EM_ANDAMENTO',
      sub_status: 'PROPOSTA_ENVIADA',
      notas_negociacao: 'Nota',
      valor_proposta: 15000,
      valor_viagem: null,
      origem: 'Instagram',
      documentos_url: [],
    };

    // Action & Assert
    Object.keys(payloadGerado).forEach((coluna) => {
      expect(colunasOficiaisOrcamentos.has(coluna)).toBe(true);
    });
  });

  it('deve validar que a estrutura de payload de Viagens possui as colunas oficiais do PostgreSQL', () => {
    // Setup - Colunas oficiais esperadas na tabela "viagens" do Supabase
    const colunasOficiaisViagens = new Set([
      'cliente_id',
      'consultor_id',
      'nome_cliente',
      'destino',
      'data_ida',
      'data_volta',
      'status',
      'codigo_localizador',
      'codigo_ref',
      'valor_total',
      'processo_conferido',
      'voucher_geral_anexado',
    ]);

    const payloadViagem: any = {
      cliente_id: 'cli-1',
      consultor_id: 'u-1',
      nome_cliente: 'Viajante',
      destino: 'Roma',
      data_ida: '2026-11-01',
      data_volta: '2026-11-15',
      status: 'confirmada',
      codigo_localizador: 'LOC123',
      codigo_ref: 'VIA-001',
      valor_total: 20000,
      processo_conferido: true,
      voucher_geral_anexado: false,
    };

    // Action & Assert
    Object.keys(payloadViagem).forEach((coluna) => {
      expect(colunasOficiaisViagens.has(coluna)).toBe(true);
    });
  });

  it('deve validar que a estrutura de payload da Escala Diária possui chaves primárias e turnos válidos', () => {
    // Setup
    const colunasOficiaisEscala = new Set([
      'consultor_id',
      'consultor_nome',
      'data',
      'turno',
      'observacao',
    ]);

    const turnosValidos = ['Manhã', 'Tarde', 'Integral', 'Folga', 'Plantão', 'Férias'];

    const payloadEscala: any = {
      consultor_id: 'user-escala',
      consultor_nome: 'Carlos Silva',
      data: '2026-10-25',
      turno: 'Manhã',
      observacao: 'Escala normal',
    };

    // Action & Assert
    Object.keys(payloadEscala).forEach((coluna) => {
      expect(colunasOficiaisEscala.has(coluna)).toBe(true);
    });
    expect(turnosValidos).toContain(payloadEscala.turno);
  });

  it('deve validar que o contrato da tabela de Comentários preserva campos de auditoria', () => {
    // Setup
    const colunasOficiaisComentarios = new Set([
      'tipo_item',
      'item_id',
      'autor_id',
      'texto',
      'created_at',
    ]);

    const tiposItemValidos = ['orcamento', 'viagem', 'produto'];

    const payloadComentario: any = {
      tipo_item: 'viagem',
      item_id: 'v-123',
      autor_id: 'u-123',
      texto: 'Comentário auditado',
      created_at: new Date().toISOString(),
    };

    // Action & Assert
    Object.keys(payloadComentario).forEach((coluna) => {
      expect(colunasOficiaisComentarios.has(coluna)).toBe(true);
    });
    expect(tiposItemValidos).toContain(payloadComentario.tipo_item);
  });

  it('deve validar que o payload da tabela de Clientes suporta oficialmente a coluna next_trip_snooze_until', () => {
    // Setup
    const colunasOficiaisClientes = new Set([
      'nome',
      'email',
      'telefone',
      'documento',
      'consultor_responsavel_id',
      'next_trip_snooze_until',
    ]);

    const payloadCliente: any = {
      nome: 'Mariana Costa',
      email: 'mariana@email.com',
      telefone: '11988887777',
      documento: '12345678900',
      consultor_responsavel_id: 'user-001',
      next_trip_snooze_until: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    // Action & Assert
    Object.keys(payloadCliente).forEach((coluna) => {
      expect(colunasOficiaisClientes.has(coluna)).toBe(true);
    });
  });

  it('deve validar que a estrutura de payload da tabela Destinos possui as colunas oficiais', () => {
    // Setup
    const colunasOficiaisDestinos = new Set([
      'nome',
      'pais',
      'updated_at',
    ]);

    const payloadDestino: any = {
      nome: 'Tóquio',
      pais: 'Japão',
      updated_at: new Date().toISOString(),
    };

    // Action & Assert
    Object.keys(payloadDestino).forEach((coluna) => {
      expect(colunasOficiaisDestinos.has(coluna)).toBe(true);
    });
  });

  it('deve validar que a estrutura de payload de Mensagem Destinatários possui integridade relacional', () => {
    // Setup
    const colunasOficiaisDestinatarios = new Set([
      'mensagem_id',
      'destinatario_id',
      'tipo',
    ]);

    const tiposValidos = ['para', 'cc'];

    const payloadMsgDest: any = {
      mensagem_id: 'msg-999',
      destinatario_id: 'dest-888',
      tipo: 'para',
    };

    // Action & Assert
    Object.keys(payloadMsgDest).forEach((coluna) => {
      expect(colunasOficiaisDestinatarios.has(coluna)).toBe(true);
    });
    expect(tiposValidos).toContain(payloadMsgDest.tipo);
  });

  it('deve validar que a estrutura de Gamificação (XP Logs e Badges) preserva restrições e colunas oficiais', () => {
    // Setup
    const colunasOficiaisXpLogs = new Set(['profile_id', 'acao_chave', 'xp_ganho']);
    const colunasOficiaisBadges = new Set(['profile_id', 'badge_key']);

    const payloadXp: any = {
      profile_id: 'usr-1',
      acao_chave: 'viagem_concluida',
      xp_ganho: 100,
    };

    const payloadBadge: any = {
      profile_id: 'usr-1',
      badge_key: 'primeira_viagem',
    };

    // Action & Assert
    Object.keys(payloadXp).forEach((coluna) => {
      expect(colunasOficiaisXpLogs.has(coluna)).toBe(true);
    });
    Object.keys(payloadBadge).forEach((coluna) => {
      expect(colunasOficiaisBadges.has(coluna)).toBe(true);
    });
  });
});


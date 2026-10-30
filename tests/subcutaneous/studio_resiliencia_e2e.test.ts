import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudioPropostasService } from '../../src/services/studioPropostasService';
import { supabase } from '../../src/services/supabase';
import { StudioProposta, StudioAceiteFormal } from '../../src/types';

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Studio - Validação Subcutânea Rigorosa de Resiliência de Ponta a Ponta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve simular o ciclo completo de vida de uma proposta em banco com schema drift sem emitir erros 400', async () => {
    // Setup
    // Banco em memória simulando a tabela real do Supabase antes da migração DDL
    const tabelaStudioSimulada = new Map<string, any>();
    const historicoTabelasChamadas: string[] = [];

    const mockFrom = vi.fn().mockImplementation((tabela: string) => {
      historicoTabelasChamadas.push(tabela);

      if (tabela === 'studio_propostas') {
        return {
          upsert: vi.fn().mockImplementation((payload: any) => {
            // Se o payload contiver qualquer coluna estendida na raiz, rejeita exatamente como o PostgREST real faz com HTTP 400
            const colunasEstendidas = [
              'consultor_avatar',
              'consultor_whatsapp',
              'consultor_telefone',
              'consultor_email',
              'titulo_cabecalho',
              'visualizacoes_count',
              'ultima_visualizacao_em',
              'orcamento_origem_id'
            ];

            const colunaInvalida = colunasEstendidas.find(col => payload[col] !== undefined);
            if (colunaInvalida) {
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: {
                      code: 'PGRST204',
                      status: 400,
                      message: `Could not find the '${colunaInvalida}' column of 'studio_propostas' in the schema cache`
                    }
                  })
                })
              };
            }

            // Se o payload tiver apenas as colunas base (com _paxflow_meta dentro de dados_extraidos), salva com sucesso 200 OK
            const idGerado = payload.id || `prop-${Date.now()}`;
            const registroSalvo = {
              ...payload,
              id: idGerado,
              created_at: payload.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            tabelaStudioSimulada.set(idGerado, registroSalvo);

            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: registroSalvo,
                  error: null
                })
              })
            };
          }),

          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation((col: string, val: any) => ({
              single: vi.fn().mockImplementation(async () => {
                if (col === 'id') {
                  const encontrada = tabelaStudioSimulada.get(val);
                  return { data: encontrada || null, error: null };
                }
                return { data: null, error: null };
              })
            })),
            order: vi.fn().mockImplementation(() => {
              const todas = Array.from(tabelaStudioSimulada.values());
              return Promise.resolve({ data: todas, error: null });
            })
          })),

          update: vi.fn().mockImplementation((dadosUpdate: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: any) => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(async () => {
                  const atual = tabelaStudioSimulada.get(val);
                  if (atual) {
                    const atualizada = { ...atual, ...dadosUpdate, updated_at: new Date().toISOString() };
                    tabelaStudioSimulada.set(val, atualizada);
                    return { data: atualizada, error: null };
                  }
                  return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
                })
              })
            }))
          }))
        };
      }

      // Se qualquer código tentar chamar global_settings para salvar lista ou chave/valor, lança erro para reprovar o teste
      if (tabela === 'global_settings') {
        return {
          select: vi.fn().mockImplementation((colunas: string) => {
            if (colunas.includes('value')) {
              throw new Error('VIOLAÇÃO: Tentativa de consultar coluna inexistente "value" em global_settings');
            }
            return {
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { agency_name: 'PaxFlow Viagens', agency_phone: '(11) 3090-7070' },
                  error: null
                })
              })
            };
          }),
          upsert: vi.fn().mockImplementation(() => {
            throw new Error('VIOLAÇÃO: Tentativa de upsert de chave/valor em global_settings');
          })
        };
      }

      // Tabelas auxiliares da automação de conversão
      if (tabela === 'clientes' || tabela === 'viagens' || tabela === 'lembretes' || tabela === 'orcamentos') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'cliente-123' }, error: null })
            })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'viagem-auto-999', destino: 'Fernando de Noronha' },
                error: null
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        };
      }

      return {};
    });
    (supabase.from as any) = mockFrom;

    // Action 1: Salvar nova proposta no editor do Studio
    const propostaCriada = await StudioPropostasService.salvarProposta({
      cliente_nome: 'Sabrina Sato',
      cliente_whatsapp: '(11) 98765-4321',
      cliente_email: 'sabrina@globo.com',
      destino: 'Fernando de Noronha',
      valor_total: 42000,
      consultor_nome: 'Marcos Vinicius',
      consultor_avatar: 'https://cdn.paxflow.com/avatars/marcos.png',
      consultor_whatsapp: '(11) 3090-7070',
      titulo_cabecalho: 'EXPERIÊNCIA EXCLUSIVA NORONHA'
    });

    // Assert 1: Proposta salva com resiliência sem estourar exceção
    expect(propostaCriada.id).toBeDefined();
    expect(propostaCriada.cliente_nome).toBe('Sabrina Sato');
    expect(propostaCriada.destino).toBe('Fernando de Noronha');
    expect(propostaCriada.consultor_avatar).toBe('https://cdn.paxflow.com/avatars/marcos.png');
    expect(propostaCriada.titulo_cabecalho).toBe('EXPERIÊNCIA EXCLUSIVA NORONHA');

    // Action 2: Carregar a proposta como faria a tela de visualização pública do passageiro
    const propostaCarregada = await StudioPropostasService.buscarPorId(propostaCriada.id!);

    // Assert 2: Desempacotamento de metadados transparente
    expect(propostaCarregada).not.toBeNull();
    expect(propostaCarregada?.id).toBe(propostaCriada.id);
    expect(propostaCarregada?.consultor_avatar).toBe('https://cdn.paxflow.com/avatars/marcos.png');
    expect(propostaCarregada?.titulo_cabecalho).toBe('EXPERIÊNCIA EXCLUSIVA NORONHA');

    // Action 3: Registrar acesso de leitura do cliente
    const aposLeitura = await StudioPropostasService.registrarAcessoLeitura(propostaCriada.id!);

    // Assert 3: Métricas de visualização incrementadas com sucesso
    expect(aposLeitura?.visualizacoes_count).toBe(1);
    expect(aposLeitura?.ultima_visualizacao_em).toBeDefined();

    // Action 4: Passageiro formaliza o aceite da viagem
    const aceiteFormal: StudioAceiteFormal = {
      data_aceite: new Date().toISOString(),
      cliente_nome: 'Sabrina Sato',
      documento: '333.444.555-66',
      ip: '201.82.100.15',
      dispositivo: 'iPad Air / Safari Mobile'
    };
    const propostaAprovada = await StudioPropostasService.registrarAceite(propostaCriada.id!, aceiteFormal);

    // Assert 4: Status APROVADO e dados de auditoria jurídica consolidados
    expect(propostaAprovada?.status).toBe('APROVADO');
    expect(propostaAprovada?.aceite_formal?.documento).toBe('333.444.555-66');

    // Assert 5: Prova definitiva de que global_settings NUNCA foi chamada como tabela de chave-valor
    const chamadasGlobalSettings = historicoTabelasChamadas.filter(t => t === 'global_settings');
    expect(chamadasGlobalSettings.length).toBe(0);
  });
});

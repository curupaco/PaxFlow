import { createClient } from '@supabase/supabase-js';
import { PerfilConsultor } from '../types';
import { obterAvatarLocal } from './avatars';

declare const process: any;

// Suporta ambientes baseados em Node (process.env) ou no navegador/Vite (import.meta.env)
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Aviso: As variáveis de ambiente SUPABASE_URL e/ou SUPABASE_ANON_KEY não foram configuradas. ' +
    'Certifique-se de defini-las para o correto funcionamento da conexão.'
  );
}
const realSupabase = createClient(supabaseUrl, supabaseAnonKey);

import {
  MOCK_CONSULTORES,
  MOCK_CLIENTES,
  MOCK_VIAGENS,
  MOCK_PRODUTOS,
  MOCK_ORCAMENTOS,
  MOCK_ALERTS,
  MOCK_REEMBOLSOS,
  MOCK_TIPOS_PRODUTO
} from '../utils/mockData';

const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));

const normalizeMockItem = (item: any): any => {
  if (!item || typeof item !== 'object') return item;
  const newItem = { ...item };
  
  const mappings: Record<string, string> = {
    // budgets
    consultorId: 'consultor_id',
    clienteId: 'cliente_id',
    nomeCliente: 'nome_cliente',
    dataViagem: 'data_viagem',
    subStatus: 'sub_status',
    notasNegociacao: 'notas_negociacao',
    valorProposta: 'valor_proposta',
    valorViagem: 'valor_viagem',
    documentosUrl: 'documentos_url',
    
    // clients
    dataNascimento: 'data_nascimento',
    consultorResponsavelId: 'consultor_responsavel_id',
    passaporteNumero: 'passaporte_numero',
    passaporteValidade: 'passaporte_validade',
    vistosInformacoes: 'vistos_informacoes',
    googleDriveFolderUrl: 'google_drive_folder_url',
    
    // trips
    dataIda: 'data_ida',
    dataVolta: 'data_volta',
    valorTotal: 'valor_total',
    codigoLocalizador: 'codigo_localizador',
    dataFinanceiro: 'data_financeiro',
    
    // products
    viagemId: 'viagem_id',
    codigoReserva: 'codigo_reserva',
    valorCusto: 'valor_custo',
    valorVenda: 'valor_venda',
    dataServico: 'data_servico',
    datasAdicionais: 'datas_adicionais',
    dadosAdicionais: 'dados_adicionais',
    
    // refunds
    viagemIdRefund: 'viagem_id',
    produtoViagemId: 'produto_viagem_id',
    consultorSolicitanteId: 'consultor_solicitante_id',
    valorSolicitado: 'valor_solicitado',
    valorAprovado: 'valor_aprovado',
    taxaRetencao: 'taxa_retencao',
    motivoCancelamento: 'motivo_cancelamento',
    observacoesFinanceiras: 'observacoes_financeiras',
    dataSolicitacao: 'data_solicitacao',
    dataResolucao: 'data_resolucao',

    // general
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  };

  for (const [camel, snake] of Object.entries(mappings)) {
    if (camel in item && !(snake in item)) {
      newItem[snake] = item[camel];
    }
    if (snake in item && !(camel in item)) {
      newItem[camel] = item[snake];
    }
  }
  return newItem;
};

const getMockDataForTable = (table: string): any[] => {
  const localData = localStorage.getItem(`sandbox-paxflow-${table}`);
  if (localData) {
    try { 
      return JSON.parse(localData).map((item: any) => normalizeMockItem(item)); 
    } catch (e) {}
  }
  let defaultData: any[] = [];
  if (table === 'clientes') defaultData = MOCK_CLIENTES;
  else if (table === 'viagens') defaultData = MOCK_VIAGENS;
  else if (table === 'produtos_viagem') defaultData = MOCK_PRODUTOS;
  else if (table === 'orcamentos') defaultData = MOCK_ORCAMENTOS;
  else if (table === 'profiles') defaultData = MOCK_CONSULTORES;
  else if (table === 'reembolsos') defaultData = MOCK_REEMBOLSOS;
  else if (table === 'tipos_produto') defaultData = MOCK_TIPOS_PRODUTO;
  else if (table === 'lembretes') defaultData = [];
  else if (table === 'notificacoes') {
    defaultData = MOCK_ALERTS.map((a, index) => ({
      id: a.id.replace('mention-', '').replace('passport-', '').replace('refund-', ''),
      user_id: 'sandbox-user-id',
      tipo_item: a.type === 'passport' ? 'viagem' : 'mensagem',
      item_id: a.targetId,
      parent_id: a.targetId,
      lida: a.arquivado,
      arquivada: a.arquivado,
      created_at: a.createdAt,
      comentario: a.type === 'mention' ? { texto: a.body.substring(0, 100) } : null,
      mensagem: a.type === 'direct_message' ? {
        id: a.targetId,
        assunto: a.title,
        conteudo: a.body,
        created_at: a.createdAt,
        remetente_id: a.senderId,
        remetente: MOCK_CONSULTORES.find(c => c.id === a.senderId) || MOCK_CONSULTORES[1]
      } : null
    }));
  } else if (table === 'mensagens_diretas') {
    defaultData = MOCK_ALERTS.filter(a => a.type === 'direct_message').map(a => ({
      id: a.targetId,
      remetente_id: a.senderId,
      assunto: a.title,
      conteudo: a.body,
      created_at: a.createdAt,
      remetente: MOCK_CONSULTORES.find(c => c.id === a.senderId) || MOCK_CONSULTORES[1]
    }));
  }
  
  const normalized = defaultData.map((item: any) => normalizeMockItem(item));
  localStorage.setItem(`sandbox-paxflow-${table}`, JSON.stringify(normalized));
  return normalized;
};

const saveMockDataForTable = (table: string, data: any[]) => {
  const normalized = data.map((item: any) => normalizeMockItem(item));
  localStorage.setItem(`sandbox-paxflow-${table}`, JSON.stringify(normalized));
};

export const supabase = new Proxy(realSupabase, {
  get(target, prop, receiver) {
    if (typeof window !== 'undefined' && (window as any).paxflowSandbox) {
      if (prop === 'auth') {
        return {
          signInWithPassword: () => Promise.resolve({ data: { user: { id: 'sandbox-user-id' } }, error: null }),
          signOut: () => Promise.resolve({ error: null }),
          getSession: () => Promise.resolve({ data: { session: { user: { id: 'sandbox-user-id' } } }, error: null }),
          updateUser: () => Promise.resolve({ error: null })
        };
      }
      if (prop === 'from') {
        return (table: string) => {
          const getData = () => getMockDataForTable(table);
          const saveData = (data: any[]) => saveMockDataForTable(table, data);

          const makeQueryBuilder = (currentData: any[]): any => {
            const builder: any = {
              select: (columns: string, options?: any) => {
                return makeQueryBuilder(currentData);
              },
              eq: (column: string, value: any) => {
                const filtered = currentData.filter(item => {
                  const val = item[column] !== undefined ? item[column] : item[toCamel(column)];
                  return String(val) === String(value);
                });
                return makeQueryBuilder(filtered);
              },
              neq: (column: string, value: any) => {
                const filtered = currentData.filter(item => {
                  const val = item[column] !== undefined ? item[column] : item[toCamel(column)];
                  return String(val) !== String(value);
                });
                return makeQueryBuilder(filtered);
              },
              not: (column: string, operator: string, value: any) => {
                return makeQueryBuilder(currentData);
              },
              or: (filterStr: string) => {
                return makeQueryBuilder(currentData);
              },
              order: (column: string, options?: any) => {
                return makeQueryBuilder(currentData);
              },
              range: (from: number, to: number) => {
                return makeQueryBuilder(currentData.slice(from, to + 1));
              },
              single: () => {
                return Promise.resolve({ data: currentData[0] || null, error: currentData[0] ? null : new Error('Not found') });
              },
              maybeSingle: () => {
                return Promise.resolve({ data: currentData[0] || null, error: null });
              },
              insert: (payload: any) => {
                const arrayPayload = Array.isArray(payload) ? payload : [payload];
                const db = getData();
                const newItems = arrayPayload.map(item => ({
                  id: item.id || 'sandbox-id-' + Math.random().toString(36).substr(2, 9),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...item
                }));
                saveData([...db, ...newItems]);
                return Promise.resolve({ data: newItems, error: null });
              },
              update: (payload: any) => {
                return {
                  eq: (column: string, value: any) => {
                    const db = getData();
                    const updatedItems: any[] = [];
                    const nextDb = db.map(item => {
                      if (String(item[column]) === String(value)) {
                        const updated = { ...item, ...payload, updated_at: new Date().toISOString() };
                        updatedItems.push(updated);
                        return updated;
                      }
                      return item;
                    });
                    saveData(nextDb);
                    return Promise.resolve({ data: updatedItems, error: null });
                  }
                };
              },
              delete: () => {
                return {
                  eq: (column: string, value: any) => {
                    const db = getData();
                    const nextDb = db.filter(item => String(item[column]) !== String(value));
                    saveData(nextDb);
                    return Promise.resolve({ data: [], error: null });
                  }
                };
              },
              then: (resolve: any) => {
                resolve({ data: currentData, error: null, count: currentData.length });
              }
            };
            return builder;
          };

          return makeQueryBuilder(getData());
        };
      }
      if (prop === 'channel') {
        return () => {
          const channelObj: any = {
            on: () => channelObj,
            subscribe: () => ({ unsubscribe: () => {} }),
            unsubscribe: () => {}
          };
          return channelObj;
        };
      }
    }
    return Reflect.get(target, prop, receiver);
  }
});

// Sobrescrita do localStorage para isolamento total do Sandbox
if (typeof window !== 'undefined') {
  const originalGetItem = localStorage.getItem;
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;

  localStorage.getItem = function (key: string) {
    if ((window as any).paxflowSandbox) {
      return originalGetItem.call(localStorage, 'sandbox-' + key);
    }
    return originalGetItem.call(localStorage, key);
  };

  localStorage.setItem = function (key: string, value: string) {
    if ((window as any).paxflowSandbox) {
      originalSetItem.call(localStorage, 'sandbox-' + key, value);
      return;
    }
    originalSetItem.call(localStorage, key, value);
  };

  localStorage.removeItem = function (key: string) {
    if ((window as any).paxflowSandbox) {
      originalRemoveItem.call(localStorage, 'sandbox-' + key);
      return;
    }
    originalRemoveItem.call(localStorage, key);
  };
}


/**
 * Realiza o login de um consultor usando email e senha.
 * Retorna os dados do usuário autenticado e seu perfil com a respectiva role (admin ou consultor).
 */
let cachedSessionResult: { user: any; perfil: PerfilConsultor | null; error: any } | null = null;

export async function loginConsultor(email: string, password: string): Promise<{
  user: any;
  perfil: PerfilConsultor | null;
  error: any;
}> {
  try {
    cachedSessionResult = null; // Limpa cache anterior ao efetuar login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { user: null, perfil: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, perfil: null, error: new Error('Usuário não retornado após o login.') };
    }

    // Busca os dados do perfil do consultor na tabela 'profiles' para coletar a role (admin ou consultor)
    const { data: perfilData, error: perfilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (perfilError) {
      console.warn('Perfil não encontrado ou erro ao buscar. Criando perfil padrão de fallback:', perfilError.message);
      
      const fallbackPerfil: PerfilConsultor = {
        id: authData.user.id,
        nome: authData.user.user_metadata?.nome || 'Consultor Novo',
        email: authData.user.email || '',
        role: 'consultor',
        ativo: true,
        avatar_url: authData.user.user_metadata?.avatar_url || authData.user.user_metadata?.avatar || undefined
      };

      // Tenta criar ou atualizar o perfil no banco de forma proativa para consultas futuras (incluindo avatar_url)
      try {
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: fallbackPerfil.id,
          nome: fallbackPerfil.nome,
          email: fallbackPerfil.email,
          role: fallbackPerfil.role,
          ativo: fallbackPerfil.ativo,
          avatar_url: fallbackPerfil.avatar_url
        });
        if (upsertErr) {
          console.warn('Erro ao upsertar perfil padrão de fallback:', upsertErr);
        }
      } catch (insertErr) {
        console.warn('Erro ao inserir perfil padrão de fallback:', insertErr);
      }

      return {
        user: authData.user,
        perfil: fallbackPerfil,
        error: null, // Retorna null no erro para que o login prossiga com sucesso
      };
    }
    
    if (perfilData) {
      // Prioriza o avatar vindo do banco de dados. Caso seja nulo/indefinido, busca no localStorage como fallback
      if (!perfilData.avatar_url) {
        const local = obterAvatarLocal(perfilData.id) || 
                      obterAvatarLocal(perfilData.email) || 
                      obterAvatarLocal('mock-id-' + perfilData.email.replace(/[^a-zA-Z0-9]/g, ''));
        if (local) {
          (perfilData as PerfilConsultor).avatar_url = local;
        }
      }
    }

    return {
      user: authData.user,
      perfil: perfilData as PerfilConsultor,
      error: null,
    };
  } catch (err: any) {
    return { user: null, perfil: null, error: err };
  }
}

/**
 * Realiza o logout do consultor autenticado.
 */
export async function logoutConsultor(): Promise<{ error: any }> {
  cachedSessionResult = null; // Limpa cache ao deslogar
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Recupera a sessão ativa atual e o perfil completo do consultor logado (incluindo sua role).
 */
export async function getSessaoAtual(): Promise<{
  user: any;
  perfil: PerfilConsultor | null;
  error: any;
}> {
  if (typeof window !== 'undefined' && (window as any).paxflowSandbox) {
    return {
      user: { id: 'sandbox-user-id', email: 'consultor.fake@paxflowdemo.com' },
      perfil: {
        id: 'sandbox-user-id',
        nome: 'Consultor Demonstrativo',
        email: 'consultor.fake@paxflowdemo.com',
        role: 'admin',
        ativo: true,
        xp: 1500,
        nivel: 3,
        avatar_url: 'lion'
      },
      error: null
    };
  }
  if (cachedSessionResult) {
    return cachedSessionResult;
  }
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return { user: null, perfil: null, error: sessionError };
    }

    if (!session || !session.user) {
      return { user: null, perfil: null, error: null };
    }

    // Busca os dados do perfil vinculados ao ID do usuário na sessão ativa
    const { data: perfilData, error: perfilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (perfilError) {
      console.warn('Perfil ausente na sessão ativa. Usando perfil padrão de fallback:', perfilError.message);
      
      const fallbackPerfil: PerfilConsultor = {
        id: session.user.id,
        nome: session.user.user_metadata?.nome || 'Consultor Novo',
        email: session.user.email || '',
        role: 'consultor',
        ativo: true,
        avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.avatar || undefined
      };

      return {
        user: session.user,
        perfil: fallbackPerfil,
        error: null, // Retorna null para prosseguir a sessão ativa sem travar a interface
      };
    }
    
    if (perfilData) {
      // Prioriza o avatar vindo do banco de dados. Caso seja nulo/indefinido, busca no localStorage como fallback
      if (!perfilData.avatar_url) {
        const local = obterAvatarLocal(perfilData.id) || 
                      obterAvatarLocal(perfilData.email) || 
                      obterAvatarLocal('mock-id-' + perfilData.email.replace(/[^a-zA-Z0-9]/g, ''));
        if (local) {
          (perfilData as PerfilConsultor).avatar_url = local;
        }
      }
    }

    cachedSessionResult = {
      user: session.user,
      perfil: perfilData as PerfilConsultor,
      error: null,
    };
    return cachedSessionResult;
  } catch (err: any) {
    return { user: null, perfil: null, error: err };
  }
}

// Sincroniza o perfil em cache caso ocorra atualização reativa no sistema
if (typeof window !== 'undefined') {
  window.addEventListener('paxflow-profile-updated', (e: any) => {
    const { nome, avatar_url } = e.detail;
    if (cachedSessionResult && cachedSessionResult.perfil) {
      cachedSessionResult.perfil.nome = nome;
      cachedSessionResult.perfil.avatar_url = avatar_url;
    }
  });
}

/**
 * Atualiza a senha da conta atualmente autenticada na sessão ativa.
 */
export async function atualizarSenhaAtual(password: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}


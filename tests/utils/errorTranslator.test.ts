import { describe, it, expect } from 'vitest';
import { traduzirErro } from '../../src/utils/errorTranslator';

describe('ErrorTranslator - Testes Subcutâneos', () => {
  it('deve traduzir erros comuns de autenticação do Supabase Auth para português amigável', () => {
    // Setup & Action
    const errCreds = traduzirErro('Invalid login credentials');
    const errNotConfirmed = traduzirErro(new Error('Email not confirmed'));
    const errUserNotFound = traduzirErro({ message: 'User not found' });
    const errPassword = traduzirErro({ error_description: 'Password should be at least 6 characters' });
    const errRateLimit = traduzirErro('rate_limit_exceeded');

    // Assert
    expect(errCreds).toBe('E-mail ou senha inválidos. Por favor, verifique suas credenciais.');
    expect(errNotConfirmed).toBe('O e-mail informado ainda não foi confirmado. Verifique sua caixa de entrada.');
    expect(errUserNotFound).toBe('Usuário não cadastrado no sistema.');
    expect(errPassword).toBe('A senha deve conter pelo menos 6 caracteres.');
    expect(errRateLimit).toBe('Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.');
  });

  it('deve traduzir violações de integridade do banco de dados (PostgreSQL / RLS)', () => {
    // Setup & Action
    const errFk = traduzirErro('violates foreign key constraint');
    const errUnique = traduzirErro('duplicate key value violates unique constraint');
    const errRls = traduzirErro('new row violates row-level security policy for table "orcamentos"');
    const errNotNull = traduzirErro('null value in column "cliente_id" violates not-null constraint');

    // Assert
    expect(errFk).toBe('Não foi possível salvar os dados pois existe um vínculo com outra informação que não foi encontrada.');
    expect(errUnique).toBe('Já existe um registro com estes mesmos dados cadastrados.');
    expect(errRls).toBe('Acesso negado. Você não tem permissão para realizar esta operação.');
    expect(errNotNull).toBe('Campo obrigatório não informado. Por favor, preencha todos os campos.');
  });

  it('deve traduzir erros de conexão de rede e storage', () => {
    // Setup & Action
    const errNetwork = traduzirErro('Failed to fetch');
    const errTimeout = traduzirErro('request timed out');
    const errNotFound = traduzirErro('object not found');
    const errTooLarge = traduzirErro('payload too large');

    // Assert
    expect(errNetwork).toBe('Falha na conexão de rede. Verifique sua conexão com a internet e tente novamente.');
    expect(errTimeout).toBe('O servidor demorou muito para responder. Tente novamente mais tarde.');
    expect(errNotFound).toBe('O arquivo solicitado não foi encontrado no servidor.');
    expect(errTooLarge).toBe('O tamanho do arquivo excede o limite máximo permitido.');
  });

  it('deve retornar mensagem padrão segura se o erro for nulo ou desconhecido', () => {
    // Setup & Action
    const errNull = traduzirErro(null);
    const errUndefined = traduzirErro(undefined);
    const errVazio = traduzirErro('');

    // Assert
    expect(errNull).toBe('Erro desconhecido.');
    expect(errUndefined).toBe('Erro desconhecido.');
    expect(errVazio).toBe('Erro desconhecido.');
  });
});

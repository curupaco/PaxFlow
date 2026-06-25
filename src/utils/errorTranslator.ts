/**
 * Utilitário de mapeamento e tradução de mensagens de erro para o Português do Brasil.
 * Converte erros em inglês do Supabase Auth, Banco de Dados (PostgreSQL/PostgREST),
 * Storage e Rede para termos amigáveis no padrão do sistema.
 */
export function traduzirErro(erro: any): string {
  if (!erro) return 'Erro desconhecido.';
  
  let mensagem = '';
  if (typeof erro === 'string') {
    mensagem = erro;
  } else if (erro instanceof Error) {
    mensagem = erro.message;
  } else if (typeof erro === 'object') {
    mensagem = erro.message || erro.error_description || erro.error || JSON.stringify(erro);
  }

  const msgLower = mensagem.toLowerCase().trim();

  // Mapeamento de erros de autenticação (Supabase Auth)
  if (
    msgLower.includes('invalid login credentials') || 
    msgLower.includes('invalid credentials') || 
    msgLower.includes('invalid_credentials')
  ) {
    return 'E-mail ou senha inválidos. Por favor, verifique suas credenciais.';
  }
  if (
    msgLower.includes('email not confirmed') || 
    msgLower.includes('email provider\'s confirmation is required') ||
    msgLower.includes('email_not_confirmed')
  ) {
    return 'O e-mail informado ainda não foi confirmado. Verifique sua caixa de entrada.';
  }
  if (msgLower.includes('user not found') || msgLower.includes('invalid user') || msgLower.includes('user_not_found')) {
    return 'Usuário não cadastrado no sistema.';
  }
  if (msgLower.includes('password should be') || msgLower.includes('password should be at least')) {
    return 'A senha deve conter pelo menos 6 caracteres.';
  }
  if (msgLower.includes('email address is invalid') || msgLower.includes('invalid email') || msgLower.includes('invalid_email')) {
    return 'O formato do e-mail inserido é inválido.';
  }
  if (
    msgLower.includes('too many requests') || 
    msgLower.includes('rate limit exceeded') || 
    msgLower.includes('rate_limit_exceeded') ||
    msgLower.includes('over_email_send_rate_limit')
  ) {
    return 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.';
  }
  if (msgLower.includes('user already registered') || msgLower.includes('user_already_exists') || msgLower.includes('email already in use')) {
    return 'Este endereço de e-mail já está registrado no sistema.';
  }
  if (msgLower.includes('signup_disabled') || msgLower.includes('signups are disabled')) {
    return 'Novos cadastros estão temporariamente desativados.';
  }
  if (msgLower.includes('new password should be different') || msgLower.includes('password must be different')) {
    return 'A nova senha deve ser diferente da senha atual.';
  }
  if (msgLower.includes('token expired') || msgLower.includes('invalid token') || msgLower.includes('session expired') || msgLower.includes('token_expired')) {
    return 'Sua sessão ou código de acesso expirou. Faça login novamente.';
  }

  // Mapeamento de erros de banco de dados / permissões (PostgREST/PostgreSQL/RLS)
  if (msgLower.includes('violates foreign key constraint') || msgLower.includes('foreign key constraint')) {
    return 'Não foi possível salvar os dados pois existe um vínculo com outra informação que não foi encontrada.';
  }
  if (msgLower.includes('duplicate key value') || msgLower.includes('violates unique constraint')) {
    return 'Já existe um registro com estes mesmos dados cadastrados.';
  }
  if (
    msgLower.includes('permission denied') || 
    msgLower.includes('row-level security') || 
    msgLower.includes('violates row-level security') ||
    msgLower.includes('insufficient privilege')
  ) {
    return 'Acesso negado. Você não tem permissão para realizar esta operação.';
  }
  if (msgLower.includes('null value in column') || msgLower.includes('violates not-null constraint')) {
    return 'Campo obrigatório não informado. Por favor, preencha todos os campos.';
  }

  // Mapeamento de erros de Storage / Arquivos
  if (msgLower.includes('object not found') || msgLower.includes('file not found')) {
    return 'O arquivo solicitado não foi encontrado no servidor.';
  }
  if (msgLower.includes('bucket not found')) {
    return 'O repositório de arquivos não foi encontrado.';
  }
  if (msgLower.includes('payload too large') || msgLower.includes('file too large')) {
    return 'O tamanho do arquivo excede o limite máximo permitido.';
  }

  // Mapeamento de erros de rede
  if (
    msgLower.includes('failed to fetch') || 
    msgLower.includes('network error') || 
    msgLower.includes('networkrequestfailed') ||
    msgLower.includes('load failed')
  ) {
    return 'Falha na conexão de rede. Verifique sua conexão com a internet e tente novamente.';
  }
  if (msgLower.includes('timeout') || msgLower.includes('request timed out')) {
    return 'O servidor demorou muito para responder. Tente novamente mais tarde.';
  }

  // Fallbacks genéricos
  if (msgLower.includes('database error')) {
    return 'Ocorreu um erro no banco de dados. Tente novamente.';
  }
  if (msgLower.includes('internal server error')) {
    return 'Erro interno no servidor do sistema.';
  }

  // Se a mensagem original não for mapeada, tenta enriquecer com detalhes adicionais do Postgres se existirem
  if (typeof erro === 'object' && erro) {
    let extra = '';
    if (erro.details) extra += ` ${erro.details}`;
    if (erro.hint) extra += ` ${erro.hint}`;
    if (extra) {
      return `${mensagem}.${extra}`;
    }
  }

  // Se a mensagem original não for mapeada em inglês, retorna a original
  return mensagem;
}

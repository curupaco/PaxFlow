/**
 * Utilitário centralizado de controle de permissão ao módulo Financeiro do PaxFlow
 * 
 * Regra de Negócio:
 * - Usuários com papel dedicado 'financeiro' têm acesso ao módulo.
 * - Usuários (INCLUINDO Administradores) com acesso_financeiro === false NÃO TÊM ACESSO.
 * - Usuários com acesso_financeiro === true TÊM ACESSO.
 * - Administradores cujo acesso_financeiro ainda não foi configurado (undefined/null) têm acesso por padrão.
 * - Consultores e outros papéis sem flag configurada não têm acesso por padrão.
 */
export function podeAcessarFinanceiro(perfil: any): boolean {
  if (!perfil) return false;
  if (perfil.role === 'financeiro') return true;

  const flag = perfil.acesso_financeiro !== undefined 
    ? perfil.acesso_financeiro 
    : perfil.acessoFinanceiro;

  // Se foi explicitamente revogado (false), bloqueia mesmo que seja admin
  if (flag === false) {
    return false;
  }

  // Se foi explicitamente concedido (true), libera
  if (flag === true) {
    return true;
  }

  // Fallback para administradores existentes onde a coluna ainda não foi preenchida
  return perfil.role === 'admin';
}

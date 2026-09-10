/**
 * CadastrosController
 * Funções puras de controle e regras de negócio para Gestão Cadastral de Fornecedores e Produtos.
 */

export function normalizarTipoProduto(tipo: string): string {
  if (!tipo) return 'OUTROS';
  const clean = tipo
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (clean.includes('AEREO') || clean.includes('VOO')) return 'AEREO';
  if (clean.includes('HOTEL') || clean.includes('HOSPEDAGEM') || clean.includes('RESORT')) return 'HOTEL';
  if (clean.includes('CRUZEIRO') || clean.includes('NAVIO') || clean.includes('MSC')) return 'CRUZEIRO';
  if (clean.includes('PACOTE')) return 'PACOTE';
  if (clean.includes('SEGURO')) return 'SEGURO';
  if (clean.includes('TRANSFER') || clean.includes('TRASLADO')) return 'TRANSFER';
  if (clean.includes('PASSEIO') || clean.includes('INGRESSO') || clean.includes('TOUR')) return 'PASSEIO';

  return 'OUTROS';
}

export function sanitizarCadastroFornecedor(dados: any): {
  nome: string;
  cnpj: string | null;
  email: string | null;
  comissaoPadrao: number;
} {
  const nome = (dados.nome || dados.razao_social || '').trim();
  const rawCnpj = (dados.cnpj || '').replace(/\D/g, '');
  const cnpj = rawCnpj.length === 14 ? rawCnpj : null;

  const rawEmail = (dados.email || dados.email_reservas || '').trim().toLowerCase();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;

  let comissaoPadrao = Number(dados.comissao_padrao || dados.comissaoPadrao || 0);
  if (isNaN(comissaoPadrao) || comissaoPadrao < 0) comissaoPadrao = 0;
  if (comissaoPadrao > 100) comissaoPadrao = 100;

  return {
    nome: nome || 'Fornecedor Não Identificado',
    cnpj,
    email: emailValido,
    comissaoPadrao,
  };
}

export function verificarDuplicidadeFornecedor(
  existentes: any[],
  novoNome: string,
  novoCnpj?: string
): { duplicado: boolean; motivo?: string } {
  const nomeNorm = novoNome.trim().toLowerCase();
  const cnpjClean = (novoCnpj || '').replace(/\D/g, '');

  for (const f of existentes) {
    const fCnpj = (f.cnpj || '').replace(/\D/g, '');
    if (cnpjClean && fCnpj && cnpjClean === fCnpj) {
      return { duplicado: true, motivo: `CNPJ já cadastrado para o fornecedor: ${f.nome}` };
    }

    const fNome = (f.nome || f.razao_social || '').trim().toLowerCase();
    if (fNome === nomeNorm) {
      return { duplicado: true, motivo: `Já existe um fornecedor cadastrado com o nome: ${f.nome}` };
    }
  }

  return { duplicado: false };
}

import { describe, it, expect } from 'vitest';

// Funções puras de controle extraídas e espelhadas da tela de Cadastros e Gestão de Fornecedores
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

describe('CadastrosController - Gestão e Consistência Cadastral de Fornecedores e Produtos', () => {
  it('deve normalizar tipos de produtos e remover variações de acentuação', () => {
    // Setup & Action & Assert
    expect(normalizarTipoProduto('aéreo')).toBe('AEREO');
    expect(normalizarTipoProduto('Hospedagem')).toBe('HOTEL');
    expect(normalizarTipoProduto('cruzeiro marítimo')).toBe('CRUZEIRO');
    expect(normalizarTipoProduto('ingresso')).toBe('PASSEIO');
    expect(normalizarTipoProduto('qualquer_outro')).toBe('OUTROS');
  });

  it('deve sanitizar cadastro de fornecedor formatando CNPJ e validando e-mail e comissão', () => {
    // Setup
    const fornecedorBruto = {
      nome: '  Agaxtur Operadora Turística  ',
      cnpj: '12.345.678/0001-99',
      email: '  RESERVAS@AGAXTUR.COM.BR  ',
      comissao_padrao: 12.5,
    };

    // Action
    const sanitizado = sanitizarCadastroFornecedor(fornecedorBruto);

    // Assert
    expect(sanitizado.nome).toBe('Agaxtur Operadora Turística');
    expect(sanitizado.cnpj).toBe('12345678000199');
    expect(sanitizado.email).toBe('reservas@agaxtur.com.br');
    expect(sanitizado.comissaoPadrao).toBe(12.5);
  });

  it('deve descartar CNPJ e e-mail inválidos preservando a integridade do registro', () => {
    // Setup
    const fornecedorInvalido = {
      nome: 'Hotel Pousada',
      cnpj: '123', // Menor que 14 dígitos
      email: 'email_invalido_sem_arroba',
      comissao_padrao: -5, // Comissão negativa
    };

    // Action
    const sanitizado = sanitizarCadastroFornecedor(fornecedorInvalido);

    // Assert
    expect(sanitizado.cnpj).toBeNull();
    expect(sanitizado.email).toBeNull();
    expect(sanitizado.comissaoPadrao).toBe(0);
  });

  it('deve identificar duplicidade por CNPJ ou por Nome idêntico ignorando maiúsculas', () => {
    // Setup
    const fornecedoresCadastrados = [
      { id: '1', nome: 'CVC Brasil', cnpj: '11222333000144' },
      { id: '2', nome: 'Visual Turismo', cnpj: '55666777000188' },
    ];

    // Action
    const dupCnpj = verificarDuplicidadeFornecedor(fornecedoresCadastrados, 'Nova CVC', '11.222.333/0001-44');
    const dupNome = verificarDuplicidadeFornecedor(fornecedoresCadastrados, 'visual turismo');
    const semDup = verificarDuplicidadeFornecedor(fornecedoresCadastrados, 'Trend Operadora', '99888777000166');

    // Assert
    expect(dupCnpj.duplicado).toBe(true);
    expect(dupCnpj.motivo).toContain('CNPJ já cadastrado');

    expect(dupNome.duplicado).toBe(true);
    expect(dupNome.motivo).toContain('Já existe um fornecedor cadastrado com o nome');

    expect(semDup.duplicado).toBe(false);
  });
});

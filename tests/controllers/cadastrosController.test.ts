import { describe, it, expect } from 'vitest';
import {
  normalizarTipoProduto,
  sanitizarCadastroFornecedor,
  verificarDuplicidadeFornecedor
} from '../../src/controllers/cadastrosController';

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

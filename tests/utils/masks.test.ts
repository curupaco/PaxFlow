import { describe, it, expect } from 'vitest';
import {
  parseDoubleBr,
  parsePastedCurrency,
  formatCurrencyValue,
  formatMoney,
  formatBrDateToIso,
  formatIsoDateToBr,
  validateDate,
  validateCpf,
  validateCnpj,
  validateCpfCnpj,
  formatCpfCnpj,
  validateEmail,
  validatePhone
} from '../../src/utils/masks';

describe('Masks & Financial Engine - Testes Subcutâneos', () => {
  // ==========================================
  // PARSING & FORMATAÇÃO FINANCEIRA
  // ==========================================

  it('deve converter valores monetários em formato brasileiro para ponto flutuante sem perda de centavos', () => {
    // Setup
    const entradaNormal = 'R$ 1.540,75';
    const entradaMilhar = '10.250,00';
    const entradaSemMilhar = '450,50';
    const entradaVazia = '';

    // Action
    const resNormal = parseDoubleBr(entradaNormal);
    const resMilhar = parseDoubleBr(entradaMilhar);
    const resSemMilhar = parseDoubleBr(entradaSemMilhar);
    const resVazia = parseDoubleBr(entradaVazia);

    // Assert
    expect(resNormal).toBe(1540.75);
    expect(resMilhar).toBe(10250.0);
    expect(resSemMilhar).toBe(450.5);
    expect(resVazia).toBe(0);
  });

  it('deve normalizar colagem acidental de valores monetários com separadores múltiplos', () => {
    // Setup
    const textoColadoBR = 'R$ 2.450,80';
    const textoColadoUS = '2,450.80';
    const textoComCentavosDuplicados = '1.200,000,00';

    // Action
    const numBR = parsePastedCurrency(textoColadoBR);
    const numUS = parsePastedCurrency(textoColadoUS);
    const numLimpo = parsePastedCurrency(textoComCentavosDuplicados);

    // Assert
    expect(numBR).toBe(2450.8);
    expect(numUS).toBe(2450.8);
    expect(numLimpo).toBe(1200);
  });

  it('deve formatar número para padrão de exibição monetária brasileiro', () => {
    // Setup
    const valor = 1250.5;
    const valorZero = 0;

    // Action
    const formatado = formatCurrencyValue(valor);
    const formatadoZero = formatCurrencyValue(valorZero);
    const formatadoMoney = formatMoney(valor);

    // Assert
    expect(formatado).toBe('1.250,50');
    expect(formatadoZero).toBe('0,00');
    expect(formatadoMoney).toBe('1.250,50');
  });

  // ==========================================
  // CONVERSÃO E VALIDAÇÃO DE DATAS
  // ==========================================

  it('deve converter data brasileira DD/MM/AAAA para ISO YYYY-MM-DD e vice-versa', () => {
    // Setup
    const dataBr = '25/12/2026';
    const dataIso = '2026-12-25';

    // Action
    const convertidaParaIso = formatBrDateToIso(dataBr);
    const convertidaParaBr = formatIsoDateToBr(dataIso);

    // Assert
    expect(convertidaParaIso).toBe('2026-12-25');
    expect(convertidaParaBr).toBe('25/12/2026');
  });

  it('deve rejeitar datas inválidas ou inexistentes no calendário', () => {
    // Setup
    const dataInexistenteFevereiro = '30/02/2026';
    const mesInvalido = '15/13/2026';
    const dataValida = '28/02/2026';

    // Action
    const resFeb = validateDate(dataInexistenteFevereiro);
    const resMes = validateDate(mesInvalido);
    const resValida = validateDate(dataValida);

    // Assert
    expect(resFeb.isValid).toBe(false);
    expect(resMes.isValid).toBe(false);
    expect(resValida.isValid).toBe(true);
  });

  // ==========================================
  // CPF, CNPJ, EMAIL E TELEFONE
  // ==========================================

  it('deve validar e formatar CPF e CNPJ corretamente', () => {
    // Setup
    // CPFs com dígitos verificadores matematicamente corretos
    const cpfValido = '52998224725';
    const cpfInvalido = '11111111111';
    const cnpjValido = '11222333000181';

    // Action
    const isCpfOk = validateCpf(cpfValido);
    const isCpfFalso = validateCpf(cpfInvalido);
    const isCnpjOk = validateCnpj(cnpjValido);
    const cpfFormatado = formatCpfCnpj(cpfValido);
    const cnpjFormatado = formatCpfCnpj(cnpjValido);

    // Assert
    expect(isCpfOk).toBe(true);
    expect(isCpfFalso).toBe(false);
    expect(isCnpjOk).toBe(true);
    expect(cpfFormatado).toBe('529.982.247-25');
    expect(cnpjFormatado).toBe('11.222.333/0001-81');
  });

  it('deve validar e-mails e telefones de acordo com o padrão esperado', () => {
    // Setup
    const emailBom = 'consultor@paxflow.com.br';
    const emailRuim = 'invalido@@paxflow';
    const telBom = '11988887777';
    const telCurto = '12345';

    // Action
    const resEmailBom = validateEmail(emailBom);
    const resEmailRuim = validateEmail(emailRuim);
    const resTelBom = validatePhone('+55', telBom);
    const resTelRuim = validatePhone('+55', telCurto);

    // Assert
    expect(resEmailBom.isValid).toBe(true);
    expect(resEmailRuim.isValid).toBe(false);
    expect(resTelBom.isValid).toBe(true);
    expect(resTelRuim.isValid).toBe(false);
  });
});

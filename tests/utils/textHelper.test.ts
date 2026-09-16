import { describe, it, expect } from 'vitest';
import { highlightMatch } from '../../src/utils/textHelper';

describe('textHelper - highlightMatch (Subcutâneo)', () => {
  // Setup & Action & Assert

  it('deve retornar texto vazio se o texto for nulo, indefinido ou vazio', () => {
    // Action & Assert
    expect(highlightMatch(null, 'teste')).toBe('');
    expect(highlightMatch(undefined, 'teste')).toBe('');
    expect(highlightMatch('', 'teste')).toBe('');
  });

  it('deve retornar o texto original se a query for vazia ou nula', () => {
    // Action & Assert
    expect(highlightMatch('Viagem Paris', '')).toBe('Viagem Paris');
    expect(highlightMatch('Viagem Paris', '   ')).toBe('Viagem Paris');
    expect(highlightMatch('Viagem Paris', null)).toBe('Viagem Paris');
    expect(highlightMatch('Viagem Paris', undefined)).toBe('Viagem Paris');
  });

  it('deve envolver o termo correspondente em tag mark com classes visuais sem case sensitivity', () => {
    // Setup
    const texto = 'Reserva de Hotel em PARIS com PaxFlow';
    const query = 'paris';

    // Action
    const resultado = highlightMatch(texto, query);

    // Assert
    expect(resultado).toContain('<mark class="bg-amber-200/80 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-1 py-0.5 rounded font-black">PARIS</mark>');
  });

  it('deve escapar caracteres especiais de regex corretamente', () => {
    // Setup
    const texto = 'Valor: R$ 1.500,00 (Taxa: 10%) [VIP]';
    const query = '(Taxa: 10%)';

    // Action
    const resultado = highlightMatch(texto, query);

    // Assert
    expect(resultado).toContain('<mark class="bg-amber-200/80 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-1 py-0.5 rounded font-black">(Taxa: 10%)</mark>');
  });

  it('deve realçar múltiplas ocorrências na mesma string', () => {
    // Setup
    const texto = 'Nova York e Nova Zelândia';
    const query = 'Nova';

    // Action
    const resultado = highlightMatch(texto, query);

    // Assert
    const matches = (resultado.match(/<mark/g) || []).length;
    expect(matches).toBe(2);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { highlightMatch, escapeHtml, debounce } from '../../src/utils/textHelper';

describe('textHelper - highlightMatch e escapeHtml (Subcutâneo)', () => {
  // Setup & Action & Assert

  it('deve escapar caracteres HTML perigosos contra ataques XSS', () => {
    // Action & Assert
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('Tom & Jerry "O Filme"')).toBe('Tom &amp; Jerry &quot;O Filme&quot;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('deve sanitizar texto contendo HTML antes de aplicar highlight', () => {
    // Setup
    const textoPerigoso = '<img src=x onerror=alert(1)> Viagem Paris';
    const query = 'Paris';

    // Action
    const resultado = highlightMatch(textoPerigoso, query);

    // Assert
    expect(resultado).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(resultado).toContain('<mark class="bg-amber-200/80 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-1 py-0.5 rounded font-black">Paris</mark>');
  });

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

  it('deve agrupar execuções rápidas e disparar debounce apenas após o intervalo especificado', () => {
    // Setup
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, 300);

    // Action
    debounced('a');
    debounced('ab');
    debounced('abc');

    // Assert
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('abc');

    vi.useRealTimers();
  });
});


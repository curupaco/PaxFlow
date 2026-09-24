/**
 * Utilitário puro para escape seguro de caracteres especiais em HTML
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Utilitário puro para realce visual de termos de pesquisa (Search Highlighting) com sanitização de HTML
 */
export function highlightMatch(text: string | null | undefined, query: string | null | undefined): string {
  if (!text) return '';
  const safeText = escapeHtml(text);
  if (!query || !query.trim()) return safeText;

  const q = query.trim();
  // Escapa caracteres especiais para Regex seguro
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');

  return safeText.replace(regex, '<mark class="bg-amber-200/80 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-1 py-0.5 rounded font-black">$1</mark>');
}

/**
 * Utilitário puro de debounce para otimização de inputs de busca e filtragem contínua
 */
export function debounce<T extends (...args: any[]) => void>(func: T, waitMs: number = 300): (...args: Parameters<T>) => void {
  let timeout: any = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, waitMs);
  };
}


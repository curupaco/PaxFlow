/**
 * Utilitário puro para realce visual de termos de pesquisa (Search Highlighting)
 */

export function highlightMatch(text: string | null | undefined, query: string | null | undefined): string {
  if (!text) return '';
  if (!query || !query.trim()) return text;

  const q = query.trim();
  // Escapa caracteres especiais para Regex seguro
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');

  return text.replace(regex, '<mark class="bg-amber-200/80 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-1 py-0.5 rounded font-black">$1</mark>');
}

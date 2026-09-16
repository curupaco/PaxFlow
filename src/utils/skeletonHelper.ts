/**
 * SkeletonHelper
 * Gera placeholders estruturados e pulsantes para eliminar o salto de layout (CLS) durante o carregamento de dados.
 */

export function renderSkeletonTable(rows: number = 6, cols: number = 6): string {
  return `
    <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
      <!-- Header Skeleton -->
      <div class="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div>
      </div>
      <!-- Rows Skeleton -->
      <div class="divide-y divide-slate-100 dark:divide-slate-800/60">
        ${Array.from({ length: rows }).map(() => `
          <div class="p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-1">
              <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0"></div>
              <div class="space-y-1.5 flex-1">
                <div class="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div class="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
              </div>
            </div>
            <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 shrink-0 hidden sm:block"></div>
            <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 shrink-0 hidden md:block"></div>
            <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-16 shrink-0"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderSkeletonCards(count: number = 4): string {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      ${Array.from({ length: count }).map(() => `
        <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
            <div class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          </div>
          <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div class="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
            <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3"></div>
          </div>
          <div class="flex items-center justify-between pt-2">
            <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-16"></div>
            <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-16"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderSkeletonClientDetail(): string {
  return `
    <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6 animate-pulse">
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
          <div class="space-y-2">
            <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
            <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-32"></div>
          </div>
        </div>
        <div class="h-9 bg-slate-200 dark:bg-slate-700 rounded-xl w-28"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        <div class="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        <div class="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        <div class="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  `;
}

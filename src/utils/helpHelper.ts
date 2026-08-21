/**
 * Retorna o HTML de um ícone de informação clicável que abre a explicação do campo na Central de Ajuda.
 * @param helpId Identificador único do termo configurado em src/config/ajuda.ts
 */
export function renderHelpIcon(helpId: string): string {
  return `
    <span 
      class="help-shortcut inline-flex items-center justify-center ml-1 cursor-pointer text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-all select-none hover:scale-110 active:scale-95 text-[10px] bg-slate-100 dark:bg-slate-800/80 w-4 h-4 rounded-full border border-slate-200/40 dark:border-slate-700/40" 
      data-help-id="${helpId}" 
      title="Clique para ver explicação"
    >
      i
    </span>
  `.trim();
}

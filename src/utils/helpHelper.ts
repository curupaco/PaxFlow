/**
 * Retorna o HTML de um ícone de informação clicável que abre a explicação do campo na Central de Ajuda.
 * @param helpId Identificador único do termo configurado em src/config/ajuda.ts
 */
export function renderHelpIcon(helpId: string): string {
  return `
    <button 
      type="button" 
      class="help-shortcut inline-flex items-center justify-center ml-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-all duration-200 select-none hover:scale-115 active:scale-95 text-[11px] font-black w-5 h-5 rounded-full border border-indigo-200 dark:border-indigo-800/80 shadow-sm shrink-0 inline-block align-middle" 
      data-help-id="${helpId}" 
      title="Clique para abrir na Central de Ajuda"
      aria-label="Ajuda sobre este recurso"
    >
      ?
    </button>
  `.trim();
}

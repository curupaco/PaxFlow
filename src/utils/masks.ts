export interface FieldConfig {
  id: string;
  type: 'phone' | 'email' | 'currency' | 'date';
  required?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

// Lista detalhada de DDIs suportados
export const DDIS = [
  { code: '+55', flag: '🇧🇷' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+351', flag: '🇵🇹' },
  { code: '+34', flag: '🇪🇸' },
  { code: '+54', flag: '🇦🇷' },
  { code: '+598', flag: '🇺🇾' },
  { code: '+595', flag: '🇵🇾' },
  { code: '+56', flag: '🇨🇱' },
  { code: '+591', flag: '🇧🇴' },
  { code: '+51', flag: '🇵🇪' },
  { code: '+593', flag: '🇪🇨' },
  { code: '+57', flag: '🇨🇴' },
  { code: '+58', flag: '🇻🇪' },
  { code: '+592', flag: '🇬🇾' },
  { code: '+597', flag: '🇸🇷' },
  { code: '+594', flag: '🇬🇫' },
  { code: '+1', flag: '🇨🇦' },
  { code: '+39', flag: '🇮🇹' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+49', flag: '🇩🇪' },
  { code: '+44', flag: '🇬🇧' }
];

/**
 * Converte datas brasileiras (DD/MM/YYYY hh:mm:ss ou DD/MM/YYYY) para formato ISO DATE (YYYY-MM-DD)
 */
export function formatBrDateToIso(brStr: string): string | null {
  if (!brStr) return null;
  const datePart = brStr.trim().split(' ')[0];
  if (!datePart) return null;
  const parts = datePart.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
export function formatIsoDateToBr(isoStr: string): string {
  if (!isoStr) return '';
  const dateOnly = isoStr.includes('T') ? isoStr.split('T')[0] : isoStr.split(' ')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Converte representações monetárias brasileiras (ex: R$ 1.234,56 ou 1.234,56) para float padrão
 */
export function parseDoubleBr(valStr: string): number {
  if (!valStr) return 0;
  const clean = valStr.replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formata um número ou string numérica para a máscara monetária brasileira 1.234,56
 */
export function formatCurrencyValue(val: string | number): string {
  if (val === undefined || val === null || val === '') return '0,00';
  let num: number;
  if (typeof val === 'string') {
    const digits = val.replace(/\D/g, '');
    if (!digits) return '0,00';
    num = parseInt(digits, 10) / 100;
  } else {
    num = val;
  }
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formata dígitos para o formato de telefone brasileiro: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
 */
export function formatBrazilPhone(digits: string): string {
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  } else {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
}

/**
 * Formata dígitos para o formato de data brasileiro: DD/MM/AAAA
 */
export function formatDateBr(digits: string): string {
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Analisa um número do banco de dados (ex: +55 (11) 98888-7777) para extrair o DDI (padrão +55) e o número restante
 */
export function parsePhoneValue(dbValue: string): { ddi: string; number: string } {
  if (!dbValue) return { ddi: '+55', number: '' };
  
  const clean = dbValue.trim();
  
  // Ordena os DDIs pelo tamanho para casar o mais específico primeiro (ex: +598 antes de +5)
  const sortedDdis = [...DDIS].sort((a, b) => b.code.length - a.code.length);
  
  for (const ddi of sortedDdis) {
    if (clean.startsWith(ddi.code)) {
      const rest = clean.substring(ddi.code.length).trim();
      return { ddi: ddi.code, number: rest };
    }
  }
  
  // Fallback para quando o número foi salvo sem o sinal "+" (ex: 5511999999999)
  if (clean.startsWith('55') && clean.length > 10) {
    return { ddi: '+55', number: clean.substring(2).trim() };
  }
  
  return { ddi: '+55', number: clean };
}

/**
 * Obtém o valor completo do telefone combinando o DDI selecionado e o número digitado
 */
export function getFormattedPhoneToDb(inputId: string): string {
  const inputEl = document.getElementById(inputId) as HTMLInputElement;
  const ddiSelect = document.getElementById(`${inputId}-ddi`) as HTMLSelectElement;
  if (!inputEl) return '';
  const ddi = ddiSelect ? ddiSelect.value : '+55';
  const val = inputEl.value.trim();
  if (!val) return '';
  return `${ddi} ${val}`;
}

/**
 * Validação de telefones por DDI
 */
export function validatePhone(ddi: string, number: string): ValidationResult {
  const digits = number.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, message: 'O telefone é obrigatório.' };
  }
  
  if (ddi === '+55') {
    if (digits.length !== 10 && digits.length !== 11) {
      return { isValid: false, message: 'Deve conter DDD + 8 ou 9 dígitos (ex: 11 99999-9999).' };
    }
  } else {
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, message: 'Número internacional deve conter entre 7 e 15 dígitos.' };
    }
  }
  return { isValid: true, message: '' };
}

/**
 * Validação de e-mails usando regex padrão e tamanho coerente
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, message: 'O e-mail é obrigatório.' };
  }
  if (!trimmed.includes('@')) {
    return { isValid: false, message: 'O e-mail deve conter "@".' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Formato de e-mail inválido.' };
  }
  
  if (trimmed.length < 5 || trimmed.length > 254) {
    return { isValid: false, message: 'O e-mail deve ter entre 5 e 254 caracteres.' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validação de valores monetários
 */
export function validateCurrency(val: string): ValidationResult {
  const digits = val.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, message: 'O valor é obrigatório.' };
  }
  
  const num = parseInt(digits, 10) / 100;
  if (isNaN(num) || num <= 0) {
    return { isValid: false, message: 'O valor deve ser maior que zero.' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validação de datas (DD/MM/AAAA)
 */
export function validateDate(val: string): ValidationResult {
  const trimmed = val.trim();
  if (!trimmed) {
    return { isValid: false, message: 'A data é obrigatória.' };
  }
  
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!dateRegex.test(trimmed)) {
    return { isValid: false, message: 'Formato inválido. Use DD/MM/AAAA.' };
  }
  
  const match = trimmed.match(dateRegex);
  if (!match) return { isValid: false, message: 'Formato inválido.' };
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (month < 1 || month > 12) {
    return { isValid: false, message: 'Mês inválido (01 a 12).' };
  }
  
  const maxDays = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDays) {
    return { isValid: false, message: `Dia inválido para este mês (máximo ${maxDays} dias).` };
  }
  
  if (year < 1900 || year > 2100) {
    return { isValid: false, message: 'Ano inválido (deve ser entre 1900 e 2100).' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Renderiza HTML para campo de telefone premium
 */
export function renderPhoneInputHTML(id: string, value: string, placeholder = '(11) 99999-9999', required = true, readonly = false): string {
  const { ddi, number } = parsePhoneValue(value);
  const selectId = `${id}-ddi`;
  const containerId = `${id}-container`;
  const errorId = `${id}-error`;
  
  const optionsHtml = DDIS.map(c => 
    `<option value="${c.code}" ${c.code === ddi ? 'selected' : ''}>${c.flag} ${c.code}</option>`
  ).join('');

  const readonlyAttr = readonly ? 'readonly' : '';
  const disabledClass = readonly ? 'bg-slate-50 dark:bg-slate-900 cursor-not-allowed text-slate-550 dark:text-slate-405' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';

  return `
    <div id="${containerId}" class="phone-field-wrapper w-full">
      <div class="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden w-full transition duration-150">
        <select id="${selectId}" ${readonly ? 'disabled' : ''} class="px-2 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none cursor-pointer">
          ${optionsHtml}
        </select>
        <input id="${id}" type="tel" ${readonlyAttr} ${required ? 'required' : ''} value="${number}" placeholder="${placeholder}" class="w-full px-3 py-2.5 bg-transparent outline-none focus:outline-none text-slate-800 dark:text-slate-100 font-semibold text-sm ${disabledClass}" autocomplete="off" />
      </div>
      <p id="${errorId}" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
    </div>
  `;
}

/**
 * Renderiza HTML para campo de valor em reais premium
 */
export function renderCurrencyInputHTML(id: string, initialValue: number | string, placeholder = '0,00', required = true, readonly = false): string {
  const formatted = formatCurrencyValue(initialValue);
  const containerId = `${id}-container`;
  const errorId = `${id}-error`;
  const readonlyAttr = readonly ? 'readonly' : '';
  const disabledClass = readonly ? 'bg-slate-50 dark:bg-slate-900 cursor-not-allowed text-slate-550 dark:text-slate-405' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';

  return `
    <div id="${containerId}" class="currency-field-wrapper w-full">
      <div class="flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden w-full transition duration-150">
        <div class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm font-black select-none">
          R$
        </div>
        <input id="${id}" type="text" ${readonlyAttr} ${required ? 'required' : ''} value="${formatted}" placeholder="${placeholder}" class="w-full px-3.5 py-2.5 bg-transparent outline-none focus:outline-none text-slate-800 dark:text-slate-100 font-semibold text-sm ${disabledClass}" autocomplete="off" />
      </div>
      <p id="${errorId}" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
    </div>
  `;
}

/**
 * Renderiza HTML para campo de e-mail premium
 */
export function renderEmailInputHTML(id: string, initialValue: string, placeholder = 'email@exemplo.com', required = true, readonly = false): string {
  const containerId = `${id}-container`;
  const errorId = `${id}-error`;
  const readonlyAttr = readonly ? 'readonly' : '';
  const disabledClass = readonly ? 'bg-slate-50 dark:bg-slate-900 cursor-not-allowed text-slate-550 dark:text-slate-405' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';

  return `
    <div id="${containerId}" class="email-field-wrapper w-full">
      <input id="${id}" type="email" ${readonlyAttr} ${required ? 'required' : ''} value="${initialValue || ''}" placeholder="${placeholder}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155 ${disabledClass}" autocomplete="off" />
      <p id="${errorId}" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
    </div>
  `;
}

/**
 * Renderiza HTML para campo de data premium
 */
export function renderDateInputHTML(id: string, initialValue: string, placeholder = 'DD/MM/AAAA', required = true, readonly = false): string {
  const formatted = initialValue && initialValue.includes('-') 
    ? formatIsoDateToBr(initialValue) 
    : initialValue;
    
  const containerId = `${id}-container`;
  const errorId = `${id}-error`;
  const readonlyAttr = readonly ? 'readonly' : '';
  const disabledClass = readonly ? 'bg-slate-50 dark:bg-slate-900 cursor-not-allowed text-slate-550 dark:text-slate-405' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';

  return `
    <div id="${containerId}" class="date-field-wrapper w-full">
      <input id="${id}" type="text" ${readonlyAttr} ${required ? 'required' : ''} value="${formatted || ''}" placeholder="${placeholder}" class="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-semibold text-sm transition duration-155 ${disabledClass}" autocomplete="off" />
      <p id="${errorId}" class="hidden text-xs text-rose-500 font-bold mt-1.5"></p>
    </div>
  `;
}

/**
 * Gerencia a validação em tempo real e regras de envio dos formulários
 */
export function setupFormValidation(
  formId: string,
  fieldConfigs: FieldConfig[]
): { validateAll: () => boolean } {
  const form = document.getElementById(formId) as HTMLFormElement;
  if (!form) {
    return { validateAll: () => true };
  }

  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  const errors = new Map<string, boolean>();

  const setFieldError = (id: string, isValid: boolean, message: string) => {
    const inputEl = document.getElementById(id) as HTMLInputElement;
    const errorEl = document.getElementById(`${id}-error`);
    const containerEl = document.getElementById(`${id}-container`) || inputEl?.parentElement;
    
    errors.set(id, !isValid);

    if (!inputEl) return;

    if (isValid) {
      if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
      }
      if (containerEl) {
        if (containerEl.classList.contains('flex')) {
          containerEl.classList.remove('border-rose-500', 'dark:border-rose-500', 'focus-within:ring-rose-500');
          containerEl.classList.add('border-slate-200', 'dark:border-slate-700');
        } else {
          inputEl.classList.remove('border-rose-500', 'dark:border-rose-500', 'focus:ring-rose-500');
          inputEl.classList.add('border-slate-200', 'dark:border-slate-700');
        }
      }
    } else {
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = message;
      }
      if (containerEl) {
        if (containerEl.classList.contains('flex')) {
          containerEl.classList.remove('border-slate-200', 'dark:border-slate-700', 'focus-within:ring-indigo-500');
          containerEl.classList.add('border-rose-500', 'dark:border-rose-500', 'focus-within:ring-rose-500');
        } else {
          inputEl.classList.remove('border-slate-200', 'dark:border-slate-700', 'focus:ring-indigo-500');
          inputEl.classList.add('border-rose-500', 'dark:border-rose-500', 'focus:ring-rose-500');
        }
      }
    }

    updateSubmitButtonState();
  };

  const updateSubmitButtonState = () => {
    const hasErrors = Array.from(errors.values()).some(err => err === true);
    if (submitButton) {
      if (hasErrors) {
        submitButton.disabled = true;
        submitButton.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  };

  const validateField = (config: FieldConfig, isBlur = false): boolean => {
    const inputEl = document.getElementById(config.id) as HTMLInputElement;
    if (!inputEl) return true;

    const value = inputEl.value;
    const required = config.required !== false;

    // Se estiver vazio e não for obrigatório, é válido
    if (!required && !value.trim()) {
      if (config.type === 'phone') {
        const val = value.trim();
        if (!val || val === '(11)' || val === '(11) ' || val === '(' || val === '(1') {
          setFieldError(config.id, true, '');
          return true;
        }
      } else {
        setFieldError(config.id, true, '');
        return true;
      }
    }

    if (config.type === 'phone') {
      const ddiSelect = document.getElementById(`${config.id}-ddi`) as HTMLSelectElement;
      const ddi = ddiSelect ? ddiSelect.value : '+55';
      const result = validatePhone(ddi, value);
      
      if (isBlur || value.trim().length > 5) {
        setFieldError(config.id, result.isValid, result.message);
      } else {
        errors.set(config.id, !result.isValid);
        updateSubmitButtonState();
      }
      return result.isValid;
    }

    if (config.type === 'email') {
      const result = validateEmail(value);
      if (isBlur || (value.includes('@') && value.includes('.'))) {
        setFieldError(config.id, result.isValid, result.message);
      } else {
        errors.set(config.id, !result.isValid);
        updateSubmitButtonState();
      }
      return result.isValid;
    }

    if (config.type === 'currency') {
      const result = validateCurrency(value);
      if (isBlur || value.trim() !== '') {
        setFieldError(config.id, result.isValid, result.message);
      } else {
        errors.set(config.id, !result.isValid);
        updateSubmitButtonState();
      }
      return result.isValid;
    }

    if (config.type === 'date') {
      const result = validateDate(value);
      if (isBlur || value.trim().length === 10) {
        setFieldError(config.id, result.isValid, result.message);
      } else {
        errors.set(config.id, !result.isValid);
        updateSubmitButtonState();
      }
      return result.isValid;
    }

    return true;
  };

  fieldConfigs.forEach(config => {
    const inputEl = document.getElementById(config.id) as HTMLInputElement;
    if (!inputEl) return;

    if (config.type === 'phone') {
      const ddiSelect = document.getElementById(`${config.id}-ddi`) as HTMLSelectElement;

      inputEl.addEventListener('focus', () => {
        const ddi = ddiSelect ? ddiSelect.value : '+55';
        if (ddi === '+55') {
          const val = inputEl.value.trim();
          if (!val || val === '(' || val === '(1') {
            inputEl.value = '(11) ';
            setTimeout(() => {
              inputEl.setSelectionRange(5, 5);
            }, 0);
          }
        }
      });

      inputEl.addEventListener('blur', () => {
        const val = inputEl.value.trim();
        if (val === '(11)' || val === '(11) ' || val === '(' || val === '(1') {
          inputEl.value = '';
        }
        validateField(config, true);
      });

      inputEl.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const ddi = ddiSelect ? ddiSelect.value : '+55';
        let val = target.value;
        let digits = val.replace(/\D/g, '');

        if (ddi === '+55') {
          if (digits.length > 11) digits = digits.slice(0, 11);
          target.value = formatBrazilPhone(digits);
        } else {
          if (digits.length > 15) digits = digits.slice(0, 15);
          target.value = digits;
        }

        validateField(config, false);
      });

      if (ddiSelect) {
        ddiSelect.addEventListener('change', () => {
          const ddi = ddiSelect.value;
          const val = inputEl.value;
          let digits = val.replace(/\D/g, '');
          
          if (ddi === '+55') {
            inputEl.placeholder = '(11) 99999-9999';
            if (digits.length > 11) digits = digits.slice(0, 11);
            inputEl.value = formatBrazilPhone(digits);
          } else {
            inputEl.placeholder = 'Digite o número';
            if (digits.length > 15) digits = digits.slice(0, 15);
            inputEl.value = digits;
          }
          
          validateField(config, true);
        });
      }
    }

    if (config.type === 'email') {
      inputEl.addEventListener('input', () => {
        validateField(config, false);
      });

      inputEl.addEventListener('blur', () => {
        validateField(config, true);
      });
    }

    if (config.type === 'currency') {
      inputEl.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        let val = target.value;
        let digits = val.replace(/\D/g, '');
        
        if (digits.length > 12) {
          digits = digits.slice(0, 12);
        }

        if (!digits) {
          target.value = '0,00';
          validateField(config, false);
          return;
        }

        const num = parseInt(digits, 10) / 100;
        target.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        target.setSelectionRange(target.value.length, target.value.length);
        
        validateField(config, false);
      });

      inputEl.addEventListener('blur', () => {
        validateField(config, true);
      });
    }

    if (config.type === 'date') {
      inputEl.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        let val = target.value;
        let digits = val.replace(/\D/g, '');
        if (digits.length > 8) {
          digits = digits.slice(0, 8);
        }
        target.value = formatDateBr(digits);
        validateField(config, false);
      });

      inputEl.addEventListener('blur', () => {
        validateField(config, true);
      });
    }

    // Inicializa o estado de erro
    validateField(config, false);
  });

  const validateAll = (): boolean => {
    let allValid = true;
    fieldConfigs.forEach(config => {
      const isValid = validateField(config, true);
      if (!isValid) allValid = false;
    });
    return allValid;
  };

  return { validateAll };
}

import { supabase } from './supabase';
import { Orcamento } from '../types';

/**
 * Faz o parsing de uma string de CSV para uma matriz bidimensional (linhas e colunas),
 * tratando delimitadores (; ou ,), aspas duplas, aspas duplas escapadas ("")
 * e quebras de linha dentro de campos com aspas.
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  // Auto-detecta o delimitador na primeira linha
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount >= commaCount ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Aspas duplas escapadas ("") dentro de um campo entre aspas
          currentVal += '"';
          i++; // Pula as próximas aspas
        } else {
          // Fim do campo entre aspas
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++; // Pula o \n
        }
        row.push(currentVal.trim());
        // Apenas insere linhas não vazias
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  // Insere a última linha se houver valor
  if (currentVal !== '' || row.length > 0) {
    row.push(currentVal.trim());
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
  }

  return lines;
}

/**
 * Insere em lote (batch insert) uma lista de orçamentos mapeados no banco Supabase ou
 * no LocalStorage caso o sistema esteja operando em modo offline/fallback.
 */
export async function batchInsertOrcamentos(
  orcamentos: any[],
  userId: string,
  isOffline: boolean
): Promise<{ success: boolean; count: number; error?: any }> {
  if (orcamentos.length === 0) {
    return { success: true, count: 0 };
  }

  if (isOffline) {
    return { success: false, count: 0, error: new Error('Conexão indisponível. Conecte-se à internet para importar orçamentos.') };
  }

  // Persistência oficial em lote no Supabase
  try {
    const { data, error } = await supabase
      .from('orcamentos')
      .insert(orcamentos);

    if (error) {
      // Trata cenário de coluna 'valor_proposta' inexistente no Supabase de forma resiliente
      if (error.code === '42703' || (error.message && error.message.includes('column') && error.message.includes('does not exist'))) {
        console.warn('Banco desatualizado (colunas extras). Tentando salvar limpando campos opcionais.');
        
        // Remove campos opcionais que podem não existir no banco (ex: valor_proposta se for passado)
        const cleanedOrcamentos = orcamentos.map(o => {
          const { valor_proposta, ...rest } = o;
          return rest;
        });

        const { error: retryErr } = await supabase
          .from('orcamentos')
          .insert(cleanedOrcamentos);

        if (retryErr) throw retryErr;
        return { success: true, count: cleanedOrcamentos.length };
      }
      throw error;
    }

    return { success: true, count: orcamentos.length };
  } catch (err: any) {
    console.error('Erro na importação em lote no Supabase:', err);
    return { success: false, count: 0, error: err };
  }
}

/**
 * Converte datas brasileiras (DD/MM/YYYY hh:mm:ss ou DD/MM/YYYY) para formato ISO DATE (YYYY-MM-DD)
 */
export function formatBrDateToYmd(dateStr: string): string | null {
  if (!dateStr) return null;
  const datePart = dateStr.trim().split(' ')[0];
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
 * Converte representações monetárias brasileiras (ex: R$ 1.234,56 ou 1234,56) para float padrão
 */
export function parseBrFloat(valStr: string): number | null {
  if (!valStr) return null;
  let str = String(valStr).trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  if (!str) return null;

  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

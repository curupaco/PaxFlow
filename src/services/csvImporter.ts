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
    // Persistência em lote no LocalStorage
    try {
      const key = `paxflow-orcamentos-${userId || 'global'}`;
      const saved = localStorage.getItem(key);
      let localList: Orcamento[] = [];

      if (saved) {
        try {
          localList = JSON.parse(saved);
        } catch (e) {
          console.error('Erro ao fazer parse dos orçamentos locais durante importação:', e);
          localList = [];
        }
      }

      const mappedLocals: Orcamento[] = orcamentos.map((o, idx) => ({
        id: 'orc-imported-' + Math.random().toString(36).substring(2, 9) + '-' + idx,
        consultorId: o.consultor_id,
        nomeCliente: o.nome_cliente,
        contato: o.contato,
        destino: o.destino,
        dataViagem: o.data_viagem || undefined,
        temperatura: o.temperatura || 'Normal',
        tags: o.tags || [],
        status: o.status || 'SOLICITADO',
        notasNegociacao: o.notas_negociacao || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Adiciona no início da lista local
      localList = [...mappedLocals, ...localList];
      localStorage.setItem(key, JSON.stringify(localList));

      return { success: true, count: mappedLocals.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err };
    }
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

import { supabase } from './supabase';
import { formatCpfCnpj } from '../utils/masks';

export interface ParametrosBuscaClientes {
  termo: string;
  paginaAtual?: number;
  limitePagina?: number;
  consultorId?: string | null;
  isAdmin?: boolean;
  clientOverride?: any; // Injeção de dependência para testes subcutâneos
}

export interface ResultadoBuscaClientes {
  data: any[];
  count: number;
  fallbackUsed: boolean;
}

export class ClienteSearchService {
  /**
   * Constrói a cláusula OR para filtragem no PostgREST/Supabase.
   * Suporta busca por texto geral e por dígitos limpos (quando houver 3 ou mais números).
   */
  public static buildOrFilter(termo: string, includeCleanColumns: boolean = false): string {
    const raw = termo.trim();
    if (!raw) return '';

    const cleanDigits = raw.replace(/\D/g, '');
    const orConditions: string[] = [
      `nome.ilike.%${raw}%`,
      `email.ilike.%${raw}%`,
      `documento.ilike.%${raw}%`,
      `telefone.ilike.%${raw}%`,
      `codigo_ref.ilike.%${raw}%`
    ];

    if (cleanDigits.length >= 3) {
      if (includeCleanColumns) {
        orConditions.push(`documento_limpo.ilike.%${cleanDigits}%`);
        orConditions.push(`telefone_limpo.ilike.%${cleanDigits}%`);
      }

      // Variações formatadas (CPF/CNPJ)
      const formattedDoc = formatCpfCnpj(cleanDigits);
      if (formattedDoc && formattedDoc !== raw) {
        orConditions.push(`documento.ilike.%${formattedDoc}%`);
      }

      // Variações de telefone (ex: dígitos limpos ou sufixo dos últimos 8 dígitos)
      if (cleanDigits.length >= 8) {
        const last8 = cleanDigits.slice(-8);
        orConditions.push(`telefone.ilike.%${last8}%`);
      }
      if (cleanDigits !== raw) {
        orConditions.push(`telefone.ilike.%${cleanDigits}%`);
      }
    }

    return orConditions.join(',');
  }

  /**
   * Avalia em memória se um cliente corresponde ao termo digitado.
   * Útil para filtros locais, fallback resiliente e autocompletes.
   */
  public static matchCliente(
    cliente: {
      nome?: string | null;
      email?: string | null;
      documento?: string | null;
      telefone?: string | null;
      codigo_ref?: string | null;
      codigoRef?: string | null;
      cpf?: string | null;
      documento_limpo?: string | null;
      telefone_limpo?: string | null;
    },
    termo: string
  ): boolean {
    if (!termo || !termo.trim()) return true;

    const raw = termo.trim().toLowerCase();
    const rawNormalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanDigits = raw.replace(/\D/g, '');
    const isNumericOrMask = /^[0-9.\-()/+ ]+$/.test(raw);

    const cNome = (cliente.nome || '').toLowerCase();
    const cNomeNormalized = cNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cEmail = (cliente.email || '').toLowerCase();
    const cRef = (cliente.codigo_ref || cliente.codigoRef || '').toLowerCase();
    const cDocRaw = (cliente.documento || cliente.cpf || '').toLowerCase();
    const cTelRaw = (cliente.telefone || '').toLowerCase();

    // 1. Busca textual direta e insensível a acentuação no nome
    if (cNomeNormalized.includes(rawNormalized)) return true;
    if (cEmail && cEmail.includes(raw)) return true;
    if (cRef && cRef.includes(raw)) return true;
    if (cDocRaw && cDocRaw.includes(raw)) return true;
    if (cTelRaw && cTelRaw.includes(raw)) return true;

    // 2. Busca por dígitos limpos (mínimo 3 números) apenas para termos numéricos/formatados
    if (isNumericOrMask && cleanDigits.length >= 3) {
      const cDocClean = (cliente.documento_limpo || cliente.documento || cliente.cpf || '').replace(/\D/g, '');
      const cTelClean = (cliente.telefone_limpo || cliente.telefone || '').replace(/\D/g, '');

      if (cDocClean && cDocClean.includes(cleanDigits)) return true;
      if (cTelClean && cTelClean.includes(cleanDigits)) return true;
      if (cleanDigits.length >= 8 && cTelClean && cTelClean.slice(-8).includes(cleanDigits.slice(-8))) return true;
    }

    return false;
  }

  /**
   * Realiza a consulta de clientes no Supabase com paginação e busca resiliente.
   * Implementa o padrão Zero-Break: se as colunas geradas não existirem (erro 42703),
   * executa automaticamente o fallback sem quebrar a tela.
   */
  public static async buscarClientes(params: ParametrosBuscaClientes): Promise<ResultadoBuscaClientes> {
    const {
      termo,
      paginaAtual = 0,
      limitePagina = 30,
      consultorId = null,
      isAdmin = false,
      clientOverride
    } = params;

    const client = clientOverride || supabase;
    const temBusca = Boolean(termo && termo.trim());

    const buildBaseQuery = () => {
      let q = client
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('nome', { ascending: true })
        .range(paginaAtual * limitePagina, (paginaAtual + 1) * limitePagina - 1);

      if (!temBusca && !isAdmin && consultorId) {
        q = q.eq('consultor_responsavel_id', consultorId);
      }
      return q;
    };

    if (!temBusca) {
      const { data, error, count } = await buildBaseQuery();
      if (error) throw error;
      return { data: data || [], count: count || 0, fallbackUsed: false };
    }

    // Executa busca nativa com as colunas oficiais do schema
    const orFilter = this.buildOrFilter(termo, false);
    const { data, error, count } = await buildBaseQuery().or(orFilter);

    if (error) {
      throw error;
    }

    let rows = data || [];
    const cleanDigits = termo.replace(/\D/g, '');
    if (cleanDigits.length >= 3) {
      rows = rows.filter((c: any) => this.matchCliente(c, termo));
    }

    return { data: rows, count: count || rows.length, fallbackUsed: false };
  }
}

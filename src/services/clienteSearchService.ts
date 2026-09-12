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
  public static buildOrFilter(termo: string, includeCleanColumns: boolean = true): string {
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
      // Se habilitado e suportado pelo banco (colunas geradas indexadas)
      if (includeCleanColumns) {
        orConditions.push(`documento_limpo.ilike.%${cleanDigits}%`);
        orConditions.push(`telefone_limpo.ilike.%${cleanDigits}%`);
      }

      // Variações formatadas (CPF/CNPJ) para compatibilidade com ou sem colunas geradas
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
    },
    termo: string
  ): boolean {
    if (!termo || !termo.trim()) return true;

    const raw = termo.trim().toLowerCase();
    const cleanDigits = raw.replace(/\D/g, '');

    const cNome = (cliente.nome || '').toLowerCase();
    const cEmail = (cliente.email || '').toLowerCase();
    const cRef = (cliente.codigo_ref || cliente.codigoRef || '').toLowerCase();
    const cDocRaw = (cliente.documento || '').toLowerCase();
    const cTelRaw = (cliente.telefone || '').toLowerCase();

    // 1. Busca textual direta
    if (cNome.includes(raw)) return true;
    if (cEmail && cEmail.includes(raw)) return true;
    if (cRef && cRef.includes(raw)) return true;
    if (cDocRaw && cDocRaw.includes(raw)) return true;
    if (cTelRaw && cTelRaw.includes(raw)) return true;

    // 2. Busca por dígitos limpos (mínimo 3 números)
    if (cleanDigits.length >= 3) {
      const cDocClean = (cliente.documento || '').replace(/\D/g, '');
      const cTelClean = (cliente.telefone || '').replace(/\D/g, '');

      if (cDocClean && cDocClean.includes(cleanDigits)) return true;
      if (cTelClean && cTelClean.includes(cleanDigits)) return true;
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

    // 1. Tentativa com colunas geradas de alta performance (documento_limpo / telefone_limpo)
    try {
      const orFilterWithClean = this.buildOrFilter(termo, true);
      const { data, error, count } = await buildBaseQuery().or(orFilterWithClean);

      if (error) {
        // Verifica se é erro de coluna inexistente (Schema Drift 42703)
        const isColumnMissing =
          error.code === '42703' ||
          (error.message && (error.message.includes('42703') || error.message.includes('documento_limpo') || error.message.includes('telefone_limpo')));

        if (isColumnMissing) {
          console.warn('[ClienteSearchService] Colunas de busca otimizada não encontradas (42703). Acionando fallback resiliente.');
          return await this.executarFallback(termo, buildBaseQuery());
        }
        throw error;
      }

      return { data: data || [], count: count || 0, fallbackUsed: false };
    } catch (err: any) {
      const isColumnMissing =
        err.code === '42703' ||
        (err.message && (err.message.includes('42703') || err.message.includes('documento_limpo') || err.message.includes('telefone_limpo')));

      if (isColumnMissing) {
        console.warn('[ClienteSearchService] Erro 42703 capturado no bloco catch. Acionando fallback resiliente.');
        return await this.executarFallback(termo, buildBaseQuery());
      }
      throw err;
    }
  }

  /**
   * Fallback resiliente que consulta apenas as colunas nativas e filtra em memória se necessário
   */
  private static async executarFallback(termo: string, baseQuery: any): Promise<ResultadoBuscaClientes> {
    const fallbackOr = this.buildOrFilter(termo, false);
    const { data, error, count } = await baseQuery.or(fallbackOr);

    if (error) throw error;

    let rows = data || [];
    // Garante que se o termo possuir dígitos (ex: 336875 ou 33687583813), a filtragem precisa também seja aplicada
    const cleanDigits = termo.replace(/\D/g, '');
    if (cleanDigits.length >= 3) {
      rows = rows.filter((c: any) => this.matchCliente(c, termo));
    }

    return {
      data: rows,
      count: count || rows.length,
      fallbackUsed: true
    };
  }
}

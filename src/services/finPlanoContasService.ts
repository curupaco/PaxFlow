import { supabase } from './supabase';
import { FinTipoCusto, FinCategoria, FinSubcategoria, FinContaBancaria } from '../types';

/**
 * Tipos de Custo estáticos de contingência caso a migração ainda não tenha sido executada (Zero-Break)
 */
export const TIPOS_CUSTO_FALLBACK: FinTipoCusto[] = [
  { id: 'tipo-1', codigo: 1, nome: 'Custos Diretos', ativo: true, ordem: 1 },
  { id: 'tipo-2', codigo: 2, nome: 'Despesas Fixas', ativo: true, ordem: 2 },
  { id: 'tipo-3', codigo: 3, nome: 'Despesas Variáveis', ativo: true, ordem: 3 },
  { id: 'tipo-4', codigo: 4, nome: 'Investimentos', ativo: true, ordem: 4 },
  { id: 'tipo-5', codigo: 5, nome: 'Gastos Não Operacionais', ativo: true, ordem: 5 }
];

export const CATEGORIAS_FALLBACK: FinCategoria[] = [
  // 1. Custos Diretos
  { id: 'cat-1', tipo_custo_id: 'tipo-1', nome: 'COMISSÕES', ativo: true, ordem: 1 },
  { id: 'cat-2', tipo_custo_id: 'tipo-1', nome: 'PREMIAÇÕES + CAMPANHAS', ativo: true, ordem: 2 },
  { id: 'cat-3', tipo_custo_id: 'tipo-1', nome: 'ROYALTIES', ativo: true, ordem: 3 },
  { id: 'cat-4', tipo_custo_id: 'tipo-1', nome: 'TAXA MARKETING', ativo: true, ordem: 4 },
  { id: 'cat-5', tipo_custo_id: 'tipo-1', nome: 'IMPOSTO', ativo: true, ordem: 5 },
  { id: 'cat-6', tipo_custo_id: 'tipo-1', nome: 'IMPOSTO PARCELADO', ativo: true, ordem: 6 },
  // 2. Despesas Fixas
  { id: 'cat-7', tipo_custo_id: 'tipo-2', nome: 'ALUGUEL', ativo: true, ordem: 1 },
  { id: 'cat-8', tipo_custo_id: 'tipo-2', nome: 'BENEFÍCIOS', ativo: true, ordem: 2 },
  { id: 'cat-9', tipo_custo_id: 'tipo-2', nome: 'CONDOMÍNIO', ativo: true, ordem: 3 },
  { id: 'cat-10', tipo_custo_id: 'tipo-2', nome: 'CONTABILIDADE', ativo: true, ordem: 4 },
  { id: 'cat-11', tipo_custo_id: 'tipo-2', nome: 'ENERGIA ELÉTRICA', ativo: true, ordem: 5 },
  { id: 'cat-12', tipo_custo_id: 'tipo-2', nome: 'FÉRIAS', ativo: true, ordem: 6 },
  { id: 'cat-13', tipo_custo_id: 'tipo-2', nome: 'FGTS', ativo: true, ordem: 7 },
  { id: 'cat-14', tipo_custo_id: 'tipo-2', nome: 'IMPRESSORA', ativo: true, ordem: 8 },
  { id: 'cat-15', tipo_custo_id: 'tipo-2', nome: 'INTERNET', ativo: true, ordem: 9 },
  { id: 'cat-16', tipo_custo_id: 'tipo-2', nome: 'IPTU', ativo: true, ordem: 10 },
  { id: 'cat-17', tipo_custo_id: 'tipo-2', nome: 'MÁQUINA CAFÉ', ativo: true, ordem: 11 },
  { id: 'cat-18', tipo_custo_id: 'tipo-2', nome: 'MATERIAL DE ESCRITÓRIO', ativo: true, ordem: 12 },
  { id: 'cat-19', tipo_custo_id: 'tipo-2', nome: 'MATERIAL DE LIMPEZA', ativo: true, ordem: 13 },
  { id: 'cat-20', tipo_custo_id: 'tipo-2', nome: 'PLANO DE SAÚDE', ativo: true, ordem: 14 },
  { id: 'cat-21', tipo_custo_id: 'tipo-2', nome: 'SALÁRIO', ativo: true, ordem: 15 },
  { id: 'cat-22', tipo_custo_id: 'tipo-2', nome: 'SISTEMA', ativo: true, ordem: 16 },
  { id: 'cat-23', tipo_custo_id: 'tipo-2', nome: 'TARIFA BANCÁRIA', ativo: true, ordem: 17 },
  { id: 'cat-24', tipo_custo_id: 'tipo-2', nome: 'TELEFONE', ativo: true, ordem: 18 },
  { id: 'cat-25', tipo_custo_id: 'tipo-2', nome: 'LIMPEZA LOJA', ativo: true, ordem: 19 },
  { id: 'cat-26', tipo_custo_id: 'tipo-2', nome: 'SEGURO', ativo: true, ordem: 20 },
  { id: 'cat-27', tipo_custo_id: 'tipo-2', nome: 'INSS/IRPF', ativo: true, ordem: 21 },
  // 3. Despesas Variáveis
  { id: 'cat-28', tipo_custo_id: 'tipo-3', nome: 'BRINDE CLIENTE', ativo: true, ordem: 1 },
  { id: 'cat-29', tipo_custo_id: 'tipo-3', nome: 'BENFEITORIAS', ativo: true, ordem: 2 },
  { id: 'cat-30', tipo_custo_id: 'tipo-3', nome: 'COMEMORAÇÕES/REUNIÕES', ativo: true, ordem: 3 },
  { id: 'cat-31', tipo_custo_id: 'tipo-3', nome: 'MEDICINA DO TRABALHO', ativo: true, ordem: 4 },
  { id: 'cat-32', tipo_custo_id: 'tipo-3', nome: 'PREJUÍZO', ativo: true, ordem: 5 },
  { id: 'cat-33', tipo_custo_id: 'tipo-3', nome: 'UNIFORMES', ativo: true, ordem: 6 },
  { id: 'cat-34', tipo_custo_id: 'tipo-3', nome: 'REEMBOLSO PAX', ativo: true, ordem: 7 },
  { id: 'cat-35', tipo_custo_id: 'tipo-3', nome: 'PEDALADAS', ativo: true, ordem: 8 },
  { id: 'cat-36', tipo_custo_id: 'tipo-3', nome: 'REPASSE AGAXTUR', ativo: true, ordem: 9 },
  // 4. Investimentos
  { id: 'cat-37', tipo_custo_id: 'tipo-4', nome: 'SOCIAL MÍDEA', ativo: true, ordem: 1 },
  { id: 'cat-38', tipo_custo_id: 'tipo-4', nome: 'PATROCÍNIO DIGITAL', ativo: true, ordem: 2 },
  { id: 'cat-39', tipo_custo_id: 'tipo-4', nome: 'CURSOS E TREINAMENTOS', ativo: true, ordem: 3 },
  { id: 'cat-40', tipo_custo_id: 'tipo-4', nome: 'PARCERIAS / EVENTOS', ativo: true, ordem: 4 },
  // 5. Gastos Não Operacionais
  { id: 'cat-41', tipo_custo_id: 'tipo-5', nome: 'Despesas MKP', ativo: true, ordem: 1 }
];

export const CONTAS_BANCARIAS_FALLBACK: FinContaBancaria[] = [
  { id: 'banco-1', nome_banco: 'Banco Itaú', tipo: 'corrente', saldo_inicial: 0, ativo: true },
  { id: 'banco-2', nome_banco: 'Banco Cora', tipo: 'corrente', saldo_inicial: 0, ativo: true },
  { id: 'banco-3', nome_banco: 'Banco Santander', tipo: 'corrente', saldo_inicial: 0, ativo: true },
  { id: 'banco-4', nome_banco: 'Caixa Físico Loja', tipo: 'caixa', saldo_inicial: 0, ativo: true }
];

export class FinPlanoContasService {
  /**
   * Busca todos os Tipos de Custo ativos
   */
  public static async listarTiposCusto(): Promise<FinTipoCusto[]> {
    try {
      const { data, error } = await supabase
        .from('fin_tipos_custo')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          console.warn('[FinPlanoContasService] Tabela fin_tipos_custo pendente no banco. Fallback ativado.');
          return TIPOS_CUSTO_FALLBACK;
        }
        throw error;
      }
      return data && data.length > 0 ? data : TIPOS_CUSTO_FALLBACK;
    } catch (err) {
      console.warn('[FinPlanoContasService] Erro ao carregar tipos de custo:', err);
      return TIPOS_CUSTO_FALLBACK;
    }
  }

  /**
   * Busca todas as Categorias com seus Tipos de Custo
   */
  public static async listarCategorias(tipoCustoId?: string): Promise<FinCategoria[]> {
    try {
      let query = supabase
        .from('fin_categorias')
        .select('*, tipo_custo:fin_tipos_custo(*)');

      if (tipoCustoId) {
        query = query.eq('tipo_custo_id', tipoCustoId);
      }

      const { data, error } = await query.order('ordem', { ascending: true });
      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          console.warn('[FinPlanoContasService] Tabela fin_categorias pendente no banco. Fallback ativado.');
          return tipoCustoId 
            ? CATEGORIAS_FALLBACK.filter(c => c.tipo_custo_id === tipoCustoId)
            : CATEGORIAS_FALLBACK;
        }
        throw error;
      }
      return data && data.length > 0 
        ? data 
        : (tipoCustoId ? CATEGORIAS_FALLBACK.filter(c => c.tipo_custo_id === tipoCustoId) : CATEGORIAS_FALLBACK);
    } catch (err) {
      console.warn('[FinPlanoContasService] Erro ao carregar categorias:', err);
      return tipoCustoId 
        ? CATEGORIAS_FALLBACK.filter(c => c.tipo_custo_id === tipoCustoId)
        : CATEGORIAS_FALLBACK;
    }
  }

  /**
   * Busca Subcategorias de uma Categoria
   */
  public static async listarSubcategorias(categoriaId: string): Promise<FinSubcategoria[]> {
    try {
      const { data, error } = await supabase
        .from('fin_subcategorias')
        .select('*')
        .eq('categoria_id', categoriaId)
        .order('nome', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === '42703') return [];
        throw error;
      }
      return data || [];
    } catch (err) {
      console.warn('[FinPlanoContasService] Erro ao carregar subcategorias:', err);
      return [];
    }
  }

  /**
   * Busca Contas Bancárias e Caixas da agência
   */
  public static async listarContasBancarias(): Promise<FinContaBancaria[]> {
    try {
      const { data, error } = await supabase
        .from('fin_contas_bancarias')
        .select('*')
        .eq('ativo', true)
        .order('nome_banco', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.code === '42703') {
          return CONTAS_BANCARIAS_FALLBACK;
        }
        throw error;
      }
      return data && data.length > 0 ? data : CONTAS_BANCARIAS_FALLBACK;
    } catch (err) {
      console.warn('[FinPlanoContasService] Erro ao carregar contas bancárias:', err);
      return CONTAS_BANCARIAS_FALLBACK;
    }
  }

  /**
   * Salva ou cria uma nova Categoria
   */
  public static async salvarCategoria(
    nome: string, 
    tipoCustoId: string, 
    categoriaId?: string
  ): Promise<{ sucesso: boolean; id?: string; erro?: string }> {
    try {
      const payload: Partial<FinCategoria> = {
        nome: nome.trim(),
        tipo_custo_id: tipoCustoId,
        ativo: true
      };

      if (categoriaId) {
        const { error } = await supabase
          .from('fin_categorias')
          .update(payload)
          .eq('id', categoriaId);

        if (error) throw error;
        return { sucesso: true, id: categoriaId };
      } else {
        const { data, error } = await supabase
          .from('fin_categorias')
          .insert(payload)
          .select('id')
          .single();

        if (error) {
          if (error.code === '42P01' || error.code === '42703') {
            return { sucesso: true, id: `temp-${Date.now()}` };
          }
          throw error;
        }
        return { sucesso: true, id: data.id };
      }
    } catch (err: any) {
      console.error('[FinPlanoContasService] Erro ao salvar categoria:', err);
      return { sucesso: false, erro: err.message || 'Erro ao persistir categoria' };
    }
  }

  /**
   * Salva ou cria uma nova Subcategoria opcional
   */
  public static async salvarSubcategoria(
    nome: string,
    categoriaId: string,
    subcategoriaId?: string
  ): Promise<{ sucesso: boolean; id?: string; erro?: string }> {
    try {
      const payload = {
        nome: nome.trim(),
        categoria_id: categoriaId,
        ativo: true
      };

      if (subcategoriaId) {
        const { error } = await supabase
          .from('fin_subcategorias')
          .update(payload)
          .eq('id', subcategoriaId);

        if (error) throw error;
        return { sucesso: true, id: subcategoriaId };
      } else {
        const { data, error } = await supabase
          .from('fin_subcategorias')
          .insert(payload)
          .select('id')
          .single();

        if (error) {
          if (error.code === '42P01' || error.code === '42703') {
            return { sucesso: true, id: `temp-sub-${Date.now()}` };
          }
          throw error;
        }
        return { sucesso: true, id: data.id };
      }
    } catch (err: any) {
      console.error('[FinPlanoContasService] Erro ao salvar subcategoria:', err);
      return { sucesso: false, erro: err.message || 'Erro ao persistir subcategoria' };
    }
  }

  /**
   * Salva ou cria uma Conta Bancária da agência
   */
  public static async salvarContaBancaria(
    nomeBanco: string,
    tipo: 'corrente' | 'poupanca' | 'caixa',
    saldoInicial: number = 0,
    contaId?: string
  ): Promise<{ sucesso: boolean; id?: string; erro?: string }> {
    try {
      const payload = {
        nome_banco: nomeBanco.trim(),
        tipo,
        saldo_inicial: saldoInicial,
        ativo: true
      };

      if (contaId) {
        const { error } = await supabase
          .from('fin_contas_bancarias')
          .update(payload)
          .eq('id', contaId);

        if (error) throw error;
        return { sucesso: true, id: contaId };
      } else {
        const { data, error } = await supabase
          .from('fin_contas_bancarias')
          .insert(payload)
          .select('id')
          .single();

        if (error) {
          if (error.code === '42P01' || error.code === '42703') {
            return { sucesso: true, id: `temp-banco-${Date.now()}` };
          }
          throw error;
        }
        return { sucesso: true, id: data.id };
      }
    } catch (err: any) {
      console.error('[FinPlanoContasService] Erro ao salvar conta bancária:', err);
      return { sucesso: false, erro: err.message || 'Erro ao persistir conta bancária' };
    }
  }
}

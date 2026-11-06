import { supabase } from './supabase';
import { FinTipoCusto, FinCategoria, FinSubcategoria, FinContaBancaria } from '../types';

export class FinPlanoContasService {
  /**
   * Busca todos os Tipos de Custo ativos ordenados alfabeticamente
   */
  public static async listarTiposCusto(): Promise<FinTipoCusto[]> {
    try {
      const { data, error } = await supabase
        .from('fin_tipos_custo')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        throw error;
      }
      const lista = data || [];
      return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    } catch (err) {
      console.error('[FinPlanoContasService] Erro ao carregar tipos de custo:', err);
      throw err;
    }
  }

  /**
   * Busca todas as Categorias com seus Tipos de Custo ordenadas alfabeticamente
   */
  public static async listarCategorias(tipoCustoId?: string): Promise<FinCategoria[]> {
    try {
      let query = supabase
        .from('fin_categorias')
        .select('*, tipo_custo:fin_tipos_custo(*)')
        .order('nome', { ascending: true });

      if (tipoCustoId) {
        query = query.eq('tipo_custo_id', tipoCustoId);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      const base = data || [];
      return [...base].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    } catch (err) {
      console.error('[FinPlanoContasService] Erro ao carregar categorias:', err);
      throw err;
    }
  }

  /**
   * Busca Subcategorias de uma Categoria ordenadas alfabeticamente
   */
  public static async listarSubcategorias(categoriaId: string): Promise<FinSubcategoria[]> {
    try {
      const { data, error } = await supabase
        .from('fin_subcategorias')
        .select('*')
        .eq('categoria_id', categoriaId)
        .order('nome', { ascending: true });

      if (error) {
        throw error;
      }
      return [...(data || [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    } catch (err) {
      console.error('[FinPlanoContasService] Erro ao carregar subcategorias:', err);
      throw err;
    }
  }

  /**
   * Busca Contas Bancárias e Caixas da agência.
   * Por padrão busca apenas ativas. Se apenasAtivas for false, busca todas (para tela de gerenciamento).
   */
  public static async listarContasBancarias(apenasAtivas: boolean = true): Promise<FinContaBancaria[]> {
    try {
      let query = supabase
        .from('fin_contas_bancarias')
        .select('*')
        .order('nome_banco', { ascending: true });

      if (apenasAtivas) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error('[FinPlanoContasService] Erro ao carregar contas bancárias:', err);
      throw err;
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
    contaId?: string,
    ativo: boolean = true
  ): Promise<{ sucesso: boolean; id?: string; erro?: string }> {
    try {
      const payload = {
        nome_banco: nomeBanco.trim(),
        tipo,
        saldo_inicial: saldoInicial,
        ativo: ativo !== false
      };

      if (contaId) {
        const { error } = await supabase
          .from('fin_contas_bancarias')
          .update(payload)
          .eq('id', contaId);

        if (error) {
          throw error;
        }
        return { sucesso: true, id: contaId };
      } else {
        const { data, error } = await supabase
          .from('fin_contas_bancarias')
          .insert(payload)
          .select('id')
          .single();

        if (error) {
          throw error;
        }
        return { sucesso: true, id: data.id };
      }
    } catch (err: any) {
      console.error('[FinPlanoContasService] Erro ao salvar conta bancária:', err);
      return { sucesso: false, erro: err.message || 'Erro ao persistir conta bancária' };
    }
  }

  /**
   * Inativa ou reativa uma conta bancária
   */
  public static async inativarContaBancaria(contaId: string, ativo: boolean): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      const { error } = await supabase
        .from('fin_contas_bancarias')
        .update({ ativo })
        .eq('id', contaId);

      if (error) {
        throw error;
      }
      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinPlanoContasService] Erro ao alterar status da conta bancária:', err);
      return { sucesso: false, erro: err.message || 'Erro ao atualizar status da conta bancária' };
    }
  }

  /**
   * Exclui ou inativa com segurança uma conta bancária (verificando vínculos prévios)
   */
  public static async excluirContaBancaria(contaId: string): Promise<{ sucesso: boolean; inativada?: boolean; erro?: string }> {
    try {
      // 1. Verificar se há despesas ou títulos vinculados
      const { count: countContas, error: errContas } = await supabase
        .from('fin_contas_pagar')
        .select('id', { count: 'exact', head: true })
        .eq('conta_bancaria_id', contaId);

      // 2. Verificar se há remessas vinculadas
      const { count: countRemessas, error: errRemessas } = await supabase
        .from('fin_remessas')
        .select('id', { count: 'exact', head: true })
        .eq('conta_bancaria_id', contaId);

      const totalVinculos = (countContas || 0) + (countRemessas || 0);

      // Se houver vínculos históricos, inativa automaticamente para proteção contábil (Soft Delete)
      if (totalVinculos > 0) {
        await this.inativarContaBancaria(contaId, false);
        return { 
          sucesso: true, 
          inativada: true, 
          erro: `Esta conta bancária possui ${totalVinculos} lançamento(s) histórico(s) vinculado(s). Ela foi inativada com sucesso para preservar a integridade contábil.` 
        };
      }

      // Se não houver nenhum vínculo, executa a exclusão física
      const { error } = await supabase
        .from('fin_contas_bancarias')
        .delete()
        .eq('id', contaId);

      if (error) {
        throw error;
      }

      return { sucesso: true, inativada: false };
    } catch (err: any) {
      console.error('[FinPlanoContasService] Erro ao excluir conta bancária:', err);
      return { sucesso: false, erro: err.message || 'Erro ao processar exclusão da conta bancária' };
    }
  }
}

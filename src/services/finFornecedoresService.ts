import { supabase } from './supabase';
import { FinFornecedor } from '../types';

export class FinFornecedoresService {
  /**
   * Lista todos os fornecedores cadastrados, com suporte a busca e filtro de ativos
   */
  public static async listarFornecedores(termo?: string, apenasAtivos: boolean = false): Promise<FinFornecedor[]> {
    try {
      let query = supabase
        .from('fin_fornecedores')
        .select('*')
        .order('nome', { ascending: true });

      if (apenasAtivos) {
        query = query.eq('ativo', true);
      }

      if (termo && termo.trim()) {
        const t = termo.trim();
        query = query.or(`nome.ilike.%${t}%,cpf_cnpj.ilike.%${t}%,observacoes.ilike.%${t}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[FinFornecedoresService] Erro ao listar fornecedores:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('[FinFornecedoresService] Falha na consulta de fornecedores:', err);
      throw err;
    }
  }

  /**
   * Obtém um fornecedor por ID
   */
  public static async obterPorId(id: string): Promise<FinFornecedor | null> {
    try {
      const { data, error } = await supabase
        .from('fin_fornecedores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[FinFornecedoresService] Erro ao obter fornecedor por ID:', err);
      return null;
    }
  }

  /**
   * Cadastra um novo fornecedor/favorecido
   */
  public static async criarFornecedor(dados: {
    nome: string;
    cpf_cnpj?: string;
    observacoes?: string;
  }): Promise<{ sucesso: boolean; fornecedor?: FinFornecedor; erro?: string }> {
    try {
      if (!dados.nome || !dados.nome.trim()) {
        return { sucesso: false, erro: 'O nome do fornecedor é obrigatório.' };
      }

      const payload = {
        nome: dados.nome.trim(),
        cpf_cnpj: dados.cpf_cnpj?.trim() || null,
        observacoes: dados.observacoes?.trim() || null,
        ativo: true
      };

      const { data, error } = await supabase
        .from('fin_fornecedores')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      return { sucesso: true, fornecedor: data };
    } catch (err: any) {
      console.error('[FinFornecedoresService] Erro ao criar fornecedor:', err);
      return { sucesso: false, erro: err.message || 'Falha ao cadastrar fornecedor' };
    }
  }

  /**
   * Atualiza um fornecedor existente
   */
  public static async atualizarFornecedor(
    id: string,
    dados: {
      nome?: string;
      cpf_cnpj?: string;
      observacoes?: string;
      ativo?: boolean;
    }
  ): Promise<{ sucesso: boolean; fornecedor?: FinFornecedor; erro?: string }> {
    try {
      if (!id) return { sucesso: false, erro: 'ID do fornecedor não informado.' };

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (dados.nome !== undefined) {
        if (!dados.nome.trim()) return { sucesso: false, erro: 'O nome não pode ser vazio.' };
        payload.nome = dados.nome.trim();
      }
      if (dados.cpf_cnpj !== undefined) payload.cpf_cnpj = dados.cpf_cnpj?.trim() || null;
      if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes?.trim() || null;
      if (dados.ativo !== undefined) payload.ativo = dados.ativo;

      const { data, error } = await supabase
        .from('fin_fornecedores')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return { sucesso: true, fornecedor: data };
    } catch (err: any) {
      console.error('[FinFornecedoresService] Erro ao atualizar fornecedor:', err);
      return { sucesso: false, erro: err.message || 'Falha ao atualizar fornecedor' };
    }
  }

  /**
   * Exclui um fornecedor
   */
  public static async excluirFornecedor(id: string): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      if (!id) return { sucesso: false, erro: 'ID do fornecedor não informado.' };

      const { error } = await supabase
        .from('fin_fornecedores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { sucesso: true };
    } catch (err: any) {
      console.error('[FinFornecedoresService] Erro ao excluir fornecedor:', err);
      return { sucesso: false, erro: err.message || 'Falha ao remover fornecedor' };
    }
  }
}


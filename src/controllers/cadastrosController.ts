/**
 * CadastrosController
 * Funções puras de controle e regras de negócio para Gestão Cadastral de Fornecedores e Produtos.
 */

export function normalizarTipoProduto(tipo: string): string {
  if (!tipo) return 'OUTROS';
  const clean = tipo
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (clean.includes('AEREO') || clean.includes('VOO')) return 'AEREO';
  if (clean.includes('HOTEL') || clean.includes('HOSPEDAGEM') || clean.includes('RESORT')) return 'HOTEL';
  if (clean.includes('CRUZEIRO') || clean.includes('NAVIO') || clean.includes('MSC')) return 'CRUZEIRO';
  if (clean.includes('PACOTE')) return 'PACOTE';
  if (clean.includes('SEGURO')) return 'SEGURO';
  if (clean.includes('TRANSFER') || clean.includes('TRASLADO')) return 'TRANSFER';
  if (clean.includes('PASSEIO') || clean.includes('INGRESSO') || clean.includes('TOUR')) return 'PASSEIO';

  return 'OUTROS';
}

export function sanitizarCadastroFornecedor(dados: any): {
  nome: string;
  cnpj: string | null;
  email: string | null;
  comissaoPadrao: number;
} {
  const nome = (dados.nome || dados.razao_social || '').trim();
  const rawCnpj = (dados.cnpj || '').replace(/\D/g, '');
  const cnpj = rawCnpj.length === 14 ? rawCnpj : null;

  const rawEmail = (dados.email || dados.email_reservas || '').trim().toLowerCase();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;

  let comissaoPadrao = Number(dados.comissao_padrao || dados.comissaoPadrao || 0);
  if (isNaN(comissaoPadrao) || comissaoPadrao < 0) comissaoPadrao = 0;
  if (comissaoPadrao > 100) comissaoPadrao = 100;

  return {
    nome: nome || 'Fornecedor Não Identificado',
    cnpj,
    email: emailValido,
    comissaoPadrao,
  };
}

export function verificarDuplicidadeFornecedor(
  existentes: any[],
  novoNome: string,
  novoCnpj?: string
): { duplicado: boolean; motivo?: string } {
  const nomeNorm = novoNome.trim().toLowerCase();
  const cnpjClean = (novoCnpj || '').replace(/\D/g, '');

  for (const f of existentes) {
    const fCnpj = (f.cnpj || '').replace(/\D/g, '');
    if (cnpjClean && fCnpj && cnpjClean === fCnpj) {
      return { duplicado: true, motivo: `CNPJ já cadastrado para o fornecedor: ${f.nome}` };
    }

    const fNome = (f.nome || f.razao_social || '').trim().toLowerCase();
    if (fNome === nomeNorm) {
      return { duplicado: true, motivo: `Já existe um fornecedor cadastrado com o nome: ${f.nome}` };
    }
  }

  return { duplicado: false };
}

export function sanitizarTipoProduto(dados: any): {
  valido: boolean;
  erro?: string;
  nome: string;
  icone: string;
  ativo: boolean;
} {
  const nome = (dados?.nome || '').trim();
  let icone = (dados?.icone || '').trim();
  const ativo = dados?.ativo !== false;

  if (!nome) {
    return { valido: false, erro: 'O nome do tipo de produto/serviço é obrigatório.', nome: '', icone: '📦', ativo };
  }

  if (!icone) {
    icone = '📦';
  }

  return {
    valido: true,
    nome,
    icone,
    ativo
  };
}

// ============================================================================
// ORIGENS DE LEAD
// ============================================================================

export const ORIGENS_LEAD_PADRAO: Array<{ id: string; nome: string; icone: string; ativo: boolean; ordem: number }> = [
  { id: 'padrao-whatsapp', nome: 'WhatsApp', icone: '📱', ativo: true, ordem: 1 },
  { id: 'padrao-instagram', nome: 'Instagram', icone: '📸', ativo: true, ordem: 2 },
  { id: 'padrao-indicacao', nome: 'Indicação', icone: '🤝', ativo: true, ordem: 3 },
  { id: 'padrao-google', nome: 'Google', icone: '🔍', ativo: true, ordem: 4 },
  { id: 'padrao-site', nome: 'Site', icone: '🌐', ativo: true, ordem: 5 },
  { id: 'padrao-loja', nome: 'Loja', icone: '🏬', ativo: true, ordem: 6 },
  { id: 'padrao-outros', nome: 'Outros', icone: '📣', ativo: true, ordem: 7 }
];

export function sanitizarOrigemLead(
  dados: { nome?: string; icone?: string; id?: string; ativo?: boolean; ordem?: number } | string,
  existentesOuIcone?: any[] | string,
  existentesArg?: any[],
  idAtualArg?: string
): {
  valido: boolean;
  erro?: string;
  nome: string;
  icone: string;
  ativo: boolean;
  ordem: number;
} {
  let nome = '';
  let icone = '📣';
  let ativo = true;
  let ordem = 0;
  let idAtual: string | undefined = undefined;
  let existentes: any[] = [];

  if (typeof dados === 'string') {
    nome = dados.trim();
    if (typeof existentesOuIcone === 'string') {
      icone = existentesOuIcone.trim() || '📣';
      existentes = existentesArg || [];
      idAtual = idAtualArg;
    } else {
      existentes = (existentesOuIcone as any[]) || [];
      idAtual = idAtualArg;
    }
  } else {
    nome = (dados?.nome || '').trim();
    icone = (dados?.icone || '').trim() || '📣';
    ativo = dados?.ativo !== false;
    ordem = Number(dados?.ordem) || 0;
    idAtual = dados?.id;
    existentes = (existentesOuIcone as any[]) || [];
  }

  if (!nome) {
    return { valido: false, erro: 'O nome da origem do lead é obrigatório.', nome: '', icone, ativo, ordem };
  }

  const nomeLower = nome.toLowerCase();
  const duplicado = existentes.some(
    (e: any) => e.id !== idAtual && (e.nome || '').trim().toLowerCase() === nomeLower
  );

  if (duplicado) {
    return {
      valido: false,
      erro: `Já existe uma origem cadastrada com o nome "${nome}".`,
      nome,
      icone,
      ativo,
      ordem
    };
  }

  return {
    valido: true,
    nome,
    icone,
    ativo,
    ordem
  };
}

export async function verificarOrigemEmUso(
  supabaseOuNome: any,
  nomeOuOrcamentos?: any
): Promise<{ emUso: boolean; totalUso: number }> {
  // Se chamado com (supabaseClient, nomeOrigem)
  if (supabaseOuNome && typeof supabaseOuNome.from === 'function') {
    const nome = String(nomeOuOrcamentos || '').trim();
    if (!nome) return { emUso: false, totalUso: 0 };
    try {
      const { data, error } = await supabaseOuNome
        .from('orcamentos')
        .select('id, origem')
        .eq('origem', nome)
        .limit(1);

      if (error) {
        console.warn('Erro ao checar uso da origem em orçamentos:', error);
        return { emUso: false, totalUso: 0 };
      }
      const total = (data || []).length;
      return { emUso: total > 0, totalUso: total };
    } catch (e) {
      return { emUso: false, totalUso: 0 };
    }
  }

  // Se chamado como função pura (nomeOrigem, listaOrcamentos)
  const nomeNorm = String(supabaseOuNome || '').trim().toLowerCase();
  if (!nomeNorm) return { emUso: false, totalUso: 0 };

  const orcamentos = Array.isArray(nomeOuOrcamentos) ? nomeOuOrcamentos : [];
  const total = orcamentos.filter((o: any) => {
    const orig = (o.origem || '').trim().toLowerCase();
    return orig === nomeNorm;
  }).length;

  return {
    emUso: total > 0,
    totalUso: total
  };
}


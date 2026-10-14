import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega variáveis do .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) {
    env[key.trim()] = rest.join('=').trim();
  }
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Configurações do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(url, key);

// Todas as queries REAIS executadas na inicialização de cada página do PaxFlow
const queries = [
  // 1. Tela: Orçamentos (Orcamentos.ts / OrcamentosService.ts)
  {
    pagina: 'Orçamentos',
    nome: 'Consultores (profiles)',
    run: () => supabase.from('profiles').select('*').eq('ativo', true).order('nome', { ascending: true })
  },
  {
    pagina: 'Orçamentos',
    nome: 'Orçamentos com Join de Destinos',
    run: () => supabase.from('orcamentos').select('*, destino_ref:destinos(*)').order('created_at', { ascending: false }).limit(5)
  },
  {
    pagina: 'Orçamentos',
    nome: 'Clientes para Autocomplete',
    run: () => supabase.from('clientes').select('*').order('nome', { ascending: true }).limit(5)
  },
  {
    pagina: 'Orçamentos',
    nome: 'Origens de Lead',
    run: () => supabase.from('origens_lead').select('*').eq('ativo', true).order('ordem', { ascending: true }).order('nome', { ascending: true })
  },
  {
    pagina: 'Orçamentos',
    nome: 'Configurações Globais (global_settings)',
    run: () => supabase.from('global_settings').select('*').limit(1).maybeSingle()
  },

  // 2. Tela: Dashboard (Vendas / Viagens)
  {
    pagina: 'Dashboard / Vendas',
    nome: 'Viagens com Clientes, Reembolsos, Produtos e Destinos',
    run: () => supabase.from('viagens').select('*, cliente:clientes(*), reembolsos(*), produtos:produtos_viagem(*), destino_ref:destinos(*)').limit(5)
  },
  {
    pagina: 'Dashboard / Vendas',
    nome: 'LOC Pagamentos com Formas de Recebimento',
    run: () => supabase.from('loc_pagamentos').select('viagem_id, forma_recebimento_id, valor, formas_recebimento(id, nome)').limit(5)
  },
  {
    pagina: 'Dashboard / Vendas',
    nome: 'LOC Conferências',
    run: () => supabase.from('loc_conferencias').select('viagem_id, codigo_localizador, conferido').limit(5)
  },
  {
    pagina: 'Dashboard / Vendas',
    nome: 'Comentários de Viagem e Produto',
    run: () => supabase.from('comentarios').select('item_id, tipo_item, texto').in('tipo_item', ['viagem', 'produto']).limit(5)
  },

  // 3. Tela: Escala (Inbox / EscalaView.ts)
  {
    pagina: 'Escala',
    nome: 'Escala Diária',
    run: () => supabase.from('escala_diaria').select('*').limit(5)
  },
  {
    pagina: 'Escala',
    nome: 'Escala Eventos',
    run: () => supabase.from('escala_eventos').select('*').limit(5)
  },
  {
    pagina: 'Escala',
    nome: 'Escala Solicitações',
    run: () => supabase.from('escala_solicitacoes').select('*').limit(5)
  },
  {
    pagina: 'Escala',
    nome: 'Banco de Folgas',
    run: () => supabase.from('escala_banco_folgas').select('*').limit(5)
  },

  // 4. Tela: Inbox (Inbox.ts)
  {
    pagina: 'Inbox',
    nome: 'Notificações',
    run: () => supabase.from('notificacoes').select('*').limit(5)
  },
  {
    pagina: 'Inbox',
    nome: 'Mensagens Diretas',
    run: () => supabase.from('mensagens_diretas').select('*').limit(5)
  },

  // 5. Tela: Reembolsos (Reembolsos.ts)
  {
    pagina: 'Reembolsos',
    nome: 'Reembolsos com Viagem Relacionada',
    run: () => supabase.from('reembolsos').select('*, viagem:viagens(*)').limit(5)
  },

  // 6. Tela: Cadastros (Cadastros.ts)
  {
    pagina: 'Cadastros',
    nome: 'Tipos de Produto (tipos_produto)',
    run: () => supabase.from('tipos_produto').select('*').order('nome', { ascending: true }).limit(5)
  },
  {
    pagina: 'Cadastros',
    nome: 'Destinos',
    run: () => supabase.from('destinos').select('*').order('nome', { ascending: true }).limit(5)
  },
  {
    pagina: 'Cadastros',
    nome: 'Formas de Recebimento',
    run: () => supabase.from('formas_recebimento').select('*').limit(5)
  },
  {
    pagina: 'Cadastros',
    nome: 'Campanhas (campaigns)',
    run: () => supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(5)
  },
  {
    pagina: 'Cadastros',
    nome: 'Modelos de Mensagem (templates_mensagem)',
    run: () => supabase.from('templates_mensagem').select('*').order('titulo', { ascending: true }).limit(5)
  },
  {
    pagina: 'Cadastros',
    nome: 'Meta Períodos (meta_periodos)',
    run: () => supabase.from('meta_periodos').select('*').order('data_inicio', { ascending: false }).limit(5)
  },
  {
    pagina: 'Cadastros',
    nome: 'Meta Faixas (meta_faixas)',
    run: () => supabase.from('meta_faixas').select('*').order('valor_minimo', { ascending: true }).limit(5)
  },

  // 7. Tela: Conciliação (Conciliacao.ts / ConciliacaoService.ts)
  {
    pagina: 'Conciliação',
    nome: 'Lotes de Extratos (extratos_bancarios_lotes)',
    run: () => supabase.from('extratos_bancarios_lotes').select('*').limit(5)
  },
  {
    pagina: 'Conciliação',
    nome: 'Transações de Extratos (extratos_bancarios_transacoes)',
    run: () => supabase.from('extratos_bancarios_transacoes').select('*').limit(5)
  },
  {
    pagina: 'Conciliação',
    nome: 'Vínculos de Conciliação (extratos_conciliacoes_vinculos)',
    run: () => supabase.from('extratos_conciliacoes_vinculos').select('*').limit(5)
  },
  {
    pagina: 'Conciliação',
    nome: 'Competências Fechadas (competencias_financeiras_fechadas)',
    run: () => supabase.from('competencias_financeiras_fechadas').select('*').limit(5)
  }
];

async function executarAuditoria() {
  console.log('🔍 Iniciando Auditoria Completa de Queries e Telas do PaxFlow...');
  console.log(`📡 Conectado a: ${url}\n`);

  let totalFalhas = 0;
  let totalSucesso = 0;
  const relatorio = [];

  for (const q of queries) {
    process.stdout.write(`[${q.pagina}] Testando ${q.nome}... `);
    try {
      const res = await q.run();
      if (res.error) {
        process.stdout.write(`❌ ERRO (${res.error.code || 'HTTP'}): ${res.error.message}\n`);
        totalFalhas++;
        relatorio.push({
          pagina: q.pagina,
          nome: q.nome,
          status: 'ERRO',
          codigo: res.error.code,
          mensagem: res.error.message,
          detalhes: res.error.details || res.error.hint || ''
        });
      } else {
        process.stdout.write(`✅ OK (${res.data?.length !== undefined ? res.data.length : '1'} registros)\n`);
        totalSucesso++;
      }
    } catch (e) {
      process.stdout.write(`💥 EXCEÇÃO: ${e.message}\n`);
      totalFalhas++;
      relatorio.push({
        pagina: q.pagina,
        nome: q.nome,
        status: 'EXCECAO',
        mensagem: e.message
      });
    }
  }

  console.log('\n======================================================');
  console.log(`📊 RESUMO DA AUDITORIA: ${totalSucesso} OK / ${totalFalhas} FALHAS`);
  console.log('======================================================');

  if (totalFalhas > 0) {
    console.log('\n🚨 QUERIES COM ERRO ENCONTRADAS:');
    relatorio.forEach((item, idx) => {
      console.log(`\n${idx + 1}. [${item.pagina}] ${item.nome}`);
      console.log(`   Código: ${item.codigo || 'N/A'}`);
      console.log(`   Mensagem: ${item.mensagem}`);
      if (item.detalhes) console.log(`   Detalhes: ${item.detalhes}`);
    });
    process.exit(1);
  } else {
    console.log('\n✨ Todas as queries de todas as telas responderam com 200 OK sem erros!');
    process.exit(0);
  }
}

executarAuditoria();

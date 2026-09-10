// Mock de WebSocket para compatibilidade com Node.js 18
(globalThis as any).WebSocket = class MockWebSocket {};

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { EMBARQUES_MALTA_RAW } from '../src/data/embarquesMaltaData';
import { processarRegistrosLegados, TAG_MIGRACAO } from '../src/utils/migracaoEmbarquesParser';

function carregarEnvNativo() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const conteudo = fs.readFileSync(envPath, 'utf-8');
    for (const linha of conteudo.split('\n')) {
      const trimLine = linha.trim();
      if (!trimLine || trimLine.startsWith('#')) continue;
      const indexIgual = trimLine.indexOf('=');
      if (indexIgual > 0) {
        const chave = trimLine.slice(0, indexIgual).trim();
        const valor = trimLine.slice(indexIgual + 1).trim();
        if (!process.env[chave]) {
          process.env[chave] = valor;
        }
      }
    }
  }
}

carregarEnvNativo();

interface ProfileDB {
  id: string;
  nome: string;
  email: string;
  role: string;
}

interface ClienteDB {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

async function main() {
  console.log('\n========================================================================');
  console.log(`🚀 PAXFLOW — AUDITORIA E PREPARAÇÃO DA MIGRAÇÃO (MALTA VIAGENS)`);
  console.log(`Tag do Lote: ${TAG_MIGRACAO}`);
  console.log('========================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não encontrados no arquivo .env!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Consultando perfis de consultores e administradores no PaxFlow...');
  const { data: profiles, error: errProfiles } = await supabase
    .from('profiles')
    .select('id, nome, email, role')
    .eq('ativo', true);

  if (errProfiles || !profiles) {
    console.error('❌ Erro ao consultar profiles:', errProfiles);
    process.exit(1);
  }

  console.log(`✅ ${profiles.length} perfis ativos localizados no PaxFlow:`);
  profiles.forEach(p => console.log(`  • [${p.role}] ${p.nome} (${p.email}) -> ${p.id}`));

  // 1. Localizar o Admin 'tscosta'
  const adminTscosta = profiles.find(p =>
    p.email.toLowerCase().includes('tscosta') ||
    p.nome.toLowerCase().includes('tscosta')
  ) || profiles.find(p => p.role === 'admin');

  if (!adminTscosta) {
    console.error('❌ Erro crítico: Administrador tscosta não encontrado!');
    process.exit(1);
  }
  console.log(`\n👑 Administrador Oficial Definido: ${adminTscosta.nome} (${adminTscosta.email}) [${adminTscosta.id}]`);

  // 2. Resolver consultores
  const resolverConsultor = (nomeLegado: string): { id: string; nome: string; fallback: boolean } => {
    const nomeLimpo = nomeLegado.trim().toLowerCase();

    if (nomeLimpo === 'malta' || nomeLimpo === '') {
      return { id: adminTscosta.id, nome: `${adminTscosta.nome} (Venda Malta)`, fallback: true };
    }

    const match = profiles.find(p => {
      const pNome = p.nome.toLowerCase();
      return pNome.includes(nomeLimpo) || nomeLimpo.includes(pNome.split(' ')[0]);
    });

    if (match) {
      return { id: match.id, nome: match.nome, fallback: false };
    }

    return { id: adminTscosta.id, nome: `${adminTscosta.nome} (Fallback '${nomeLegado}')`, fallback: true };
  };

  // 3. Processar registros da planilha
  const { clientesMap, viagens } = processarRegistrosLegados(EMBARQUES_MALTA_RAW);

  // 4. Consultar clientes existentes para deduplicação inteligente
  console.log('\n🔍 Verificando clientes já existentes no PaxFlow para reaproveitamento de cadastro...');
  const { data: clientesExistentes, error: errClientes } = await supabase
    .from('clientes')
    .select('id, nome, email, telefone');

  if (errClientes) {
    console.warn('Aviso na consulta de clientes:', errClientes.message);
  }

  const clientesCadastrados = clientesExistentes || [];
  let clientesReaproveitados = 0;
  let clientesNovos = 0;
  const clienteIdMap = new Map<number, { uuid: string; existente: boolean; nome: string; email?: string | null; telefone?: string | null }>();

  for (const [idLegado, c] of clientesMap.entries()) {
    const achado = clientesCadastrados.find(ce => {
      if (c.email && ce.email && c.email.toLowerCase() === ce.email.toLowerCase()) return true;
      if (c.telefone && ce.telefone && c.telefone.replace(/\D/g, '') === ce.telefone.replace(/\D/g, '')) return true;
      if (c.nome.toLowerCase() === ce.nome.toLowerCase()) return true;
      return false;
    });

    if (achado) {
      clienteIdMap.set(idLegado, { uuid: achado.id, existente: true, nome: c.nome, email: c.email, telefone: c.telefone });
      clientesReaproveitados++;
    } else {
      // Gera um UUID determinístico ou pseudo para o script SQL
      clienteIdMap.set(idLegado, { uuid: '', existente: false, nome: c.nome, email: c.email, telefone: c.telefone });
      clientesNovos++;
    }
  }

  // 5. Relatório Executivo
  const contagemStatus = {
    pre_embarque: viagens.filter(v => v.status === 'pre_embarque').length,
    pos_venda: viagens.filter(v => v.status === 'pos_venda').length
  };
  const valorTotalMigrado = viagens.reduce((acc, v) => acc + v.valorTotal, 0);

  const consultorDistribuicao = new Map<string, number>();
  viagens.forEach(v => {
    const c = resolverConsultor(v.consultorNomeLegado);
    consultorDistribuicao.set(c.nome, (consultorDistribuicao.get(c.nome) || 0) + 1);
  });

  console.log('\n================== RESUMO DA CARGA ==================');
  console.log(`• Total de Viagens Únicas: ${viagens.length}`);
  console.log(`  - Em Pré-Embarque (em andamento ou embarque <= 7 dias): ${contagemStatus.pre_embarque}`);
  console.log(`  - Em Pós-Venda (embarque futuro distante): ${contagemStatus.pos_venda}`);
  console.log(`• Total de Clientes na Planilha: ${clientesMap.size}`);
  console.log(`  - Já existentes no PaxFlow (reaproveitados): ${clientesReaproveitados}`);
  console.log(`  - Novos cadastros a serem criados: ${clientesNovos}`);
  console.log(`• Valor Total da Carteira Migrada: ${valorTotalMigrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  console.log('• Distribuição de Viagens por Consultor:');
  for (const [resp, qtd] of consultorDistribuicao.entries()) {
    console.log(`  - ${resp}: ${qtd} viagens`);
  }
  console.log('=====================================================\n');

  // 6. GERAÇÃO DO SCRIPT SQL TRANSACIONAL AUTOMÁTICO (scripts/migracao_malta.sql)
  console.log('📝 Gerando script SQL transacional padronizado (scripts/migracao_malta.sql)...');

  const escapeSql = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return 'NULL';
    return `'${str.replace(/'/g, "''")}'`;
  };

  let sql = `-- ============================================================================
-- SCRIPT DE MIGRAÇÃO TRANSACIONAL — MALTA VIAGENS
-- Tag de Auditoria e Rollback: ${TAG_MIGRACAO}
-- Totalmente Idempotente: Reaproveita clientes existentes e evita duplicidade de viagens
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_cliente_id UUID;
  v_consultor_id UUID;
  v_count_viagens INT := 0;
  v_count_clientes INT := 0;
BEGIN
  RAISE NOTICE 'Iniciando carga do lote ${TAG_MIGRACAO}...';
`;

  // Mapeia cada cliente
  for (const [idLegado, c] of clientesMap.entries()) {
    const telLimpo = c.telefone ? c.telefone.replace(/\D/g, '') : '';

    sql += `
  -- ============================================================================
  -- Cliente: ${c.nome} (ID Legado: #${idLegado})
  -- ============================================================================
  v_cliente_id := NULL;

  -- 1. Busca prévia por e-mail
  ${c.email ? `SELECT id INTO v_cliente_id FROM public.clientes WHERE email IS NOT NULL AND LOWER(email) = LOWER(${escapeSql(c.email)}) LIMIT 1;` : '-- (Sem e-mail informado)'}

  -- 2. Busca prévia por telefone (se não achou por e-mail)
  ${telLimpo ? `IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE telefone IS NOT NULL AND regexp_replace(telefone, '\\D', '', 'g') = '${telLimpo}' LIMIT 1;
  END IF;` : '-- (Sem telefone numérico)'}

  -- 3. Busca prévia por nome exato
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id FROM public.clientes WHERE LOWER(nome) = LOWER(${escapeSql(c.nome)}) LIMIT 1;
  END IF;

  -- 4. Se não existe, insere o cliente com proteção contra conflitos únicos
  IF v_cliente_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (
        nome, email, telefone, observacoes, classificacoes, created_at, updated_at
      ) VALUES (
        ${escapeSql(c.nome)},
        ${escapeSql(c.email)},
        ${c.telefone ? escapeSql(c.telefone) : "''"},
        ${escapeSql(c.observacoes)},
        ARRAY['${TAG_MIGRACAO}']::TEXT[],
        NOW(),
        NOW()
      ) RETURNING id INTO v_cliente_id;
      v_count_clientes := v_count_clientes + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Se houver conflito de chave única concorrente, recupera o ID existente
      SELECT id INTO v_cliente_id FROM public.clientes 
      WHERE (${c.email ? `(email IS NOT NULL AND LOWER(email) = LOWER(${escapeSql(c.email)})) OR ` : ''}LOWER(nome) = LOWER(${escapeSql(c.nome)}))
      LIMIT 1;
    END;
  END IF;
`;

    // Inserção das viagens desse cliente
    const viagensDoCliente = viagens.filter(v => v.clienteIdLegado === idLegado);
    for (const v of viagensDoCliente) {
      const cResolvido = resolverConsultor(v.consultorNomeLegado);
      sql += `
  -- Viagem: ${v.destino} (${v.codigoLocalizador})
  v_consultor_id := '${cResolvido.id}';
  IF NOT EXISTS (
    SELECT 1 FROM public.viagens 
    WHERE codigo_localizador = ${escapeSql(v.codigoLocalizador)} 
      AND origem = '${TAG_MIGRACAO}'
  ) THEN
    INSERT INTO public.viagens (
      cliente_id,
      consultor_id,
      destino,
      data_ida,
      data_volta,
      valor_total,
      status,
      codigo_localizador,
      observacoes,
      data_financeiro,
      origem,
      processo_conferido,
      created_at
    ) VALUES (
      v_cliente_id,
      v_consultor_id,
      ${escapeSql(v.destino)},
      '${v.dataIda}'::DATE,
      '${v.dataVolta}'::DATE,
      ${v.valorTotal},
      '${v.status}',
      ${escapeSql(v.codigoLocalizador)},
      ${escapeSql(v.observacoes)},
      ${v.dataFinanceiro ? `'${v.dataFinanceiro}'::DATE` : 'NULL'},
      '${TAG_MIGRACAO}',
      false,
      NOW()
    );
    v_count_viagens := v_count_viagens + 1;
  END IF;
`;
    }
  }

  sql += `
  RAISE NOTICE 'Migração concluída com sucesso! Viagens inseridas: %, Novos clientes inseridos: %', v_count_viagens, v_count_clientes;
END $$;

COMMIT;
`;

  const sqlPath = path.resolve(process.cwd(), 'scripts', 'migracao_malta.sql');
  fs.writeFileSync(sqlPath, sql, 'utf-8');

  console.log(`✅ Arquivo SQL gerado com sucesso: ${sqlPath}`);
  console.log('📌 O script SQL é 100% transacional (BEGIN / COMMIT) e pode ser colado diretamente no SQL Editor do Supabase.');
  console.log('🎉 Simulação concluída perfeitamente!\n');
}

main().catch(err => {
  console.error('Erro inesperado no script:', err);
  process.exit(1);
});

// Mock de WebSocket para compatibilidade com Node.js 18
(globalThis as any).WebSocket = class MockWebSocket {};

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { TAG_MIGRACAO } from '../src/utils/migracaoEmbarquesParser';

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

async function rollbackViaSupabase(supabaseUrl: string, supabaseKey: string) {
  console.log('📡 Executando rollback via API Supabase HTTPS...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Localizar viagens da migração
  const { data: viagens, error: errViagens } = await supabase
    .from('viagens')
    .select('id')
    .eq('origem', TAG_MIGRACAO);

  if (errViagens) {
    throw new Error(`Erro ao buscar viagens da migração: ${errViagens.message}`);
  }

  const viagemIds = (viagens || []).map(v => v.id);
  console.log(`🔍 Localizadas ${viagemIds.length} viagens do lote '${TAG_MIGRACAO}'.`);

  // 2. Excluir produtos vinculados
  if (viagemIds.length > 0) {
    console.log('🗑️  Excluindo produtos_viagem vinculados...');
    // Faz em lotes para evitar estourar o limite de parâmetros da query
    const batchSize = 100;
    let produtosExcluidos = 0;
    for (let i = 0; i < viagemIds.length; i += batchSize) {
      const batch = viagemIds.slice(i, i + batchSize);
      const { error: errProd, count } = await supabase
        .from('produtos_viagem')
        .delete({ count: 'exact' })
        .in('viagem_id', batch);

      if (errProd) {
        console.warn(`Aviso ao excluir produtos do lote ${i}:`, errProd.message);
      } else {
        produtosExcluidos += (count || 0);
      }
    }
    console.log(`✅ Produtos de viagem excluídos: ${produtosExcluidos}`);

    // 3. Excluir viagens
    console.log('🗑️  Excluindo viagens...');
    const { error: errDelViagens, count: countViagens } = await supabase
      .from('viagens')
      .delete({ count: 'exact' })
      .eq('origem', TAG_MIGRACAO);

    if (errDelViagens) {
      throw new Error(`Erro ao excluir viagens: ${errDelViagens.message}`);
    }
    console.log(`✅ Viagens excluídas: ${countViagens || viagemIds.length}`);
  }

  // 4. Excluir clientes exclusivos do lote
  console.log('🗑️  Excluindo clientes exclusivos da migração...');
  const { data: clientes, error: errClientes } = await supabase
    .from('clientes')
    .select('id, classificacoes');

  if (errClientes) {
    console.warn('Aviso ao consultar clientes para rollback:', errClientes.message);
  } else {
    const clientesLote = (clientes || []).filter(c => 
      Array.isArray(c.classificacoes) && c.classificacoes.includes(TAG_MIGRACAO)
    );

    if (clientesLote.length > 0) {
      const clienteIds = clientesLote.map(c => c.id);
      const { error: errDelClientes, count: countCli } = await supabase
        .from('clientes')
        .delete({ count: 'exact' })
        .in('id', clienteIds);

      if (errDelClientes) {
        console.warn('Aviso ao excluir clientes:', errDelClientes.message);
      } else {
        console.log(`✅ Clientes exclusivos excluídos: ${countCli || clienteIds.length}`);
      }
    } else {
      console.log('ℹ️  Nenhum cliente exclusivo com esta tag encontrado.');
    }
  }

  console.log('\n✨ ROLLBACK VIA SUPABASE CONCLUÍDO COM SUCESSO!');
}

async function rollbackViaPostgres(supabaseUrl: string, password: string) {
  console.log('🐘 Executando rollback via conexão direta PostgreSQL...');
  const hostMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = hostMatch ? hostMatch[1] : '';
  const dbHost = `db.${projectRef}.supabase.co`;

  const client = new Client({
    host: dbHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Conexão com o banco estabelecida!\n');

  try {
    await client.query('BEGIN');

    // 1. Remover Produtos de Viagem do lote
    console.log(`Excluindo produtos das viagens com origem '${TAG_MIGRACAO}'...`);
    const resProdutos = await client.query(`
      DELETE FROM public.produtos_viagem 
      WHERE viagem_id IN (SELECT id FROM public.viagens WHERE origem = $1)
      RETURNING id;
    `, [TAG_MIGRACAO]);
    console.log(`🗑️  Produtos excluídos: ${resProdutos.rowCount}`);

    // 2. Remover Viagens do lote
    console.log(`Excluindo viagens com origem '${TAG_MIGRACAO}'...`);
    const resViagens = await client.query(
      'DELETE FROM public.viagens WHERE origem = $1 RETURNING id;',
      [TAG_MIGRACAO]
    );
    console.log(`🗑️  Viagens excluídas: ${resViagens.rowCount}`);

    // 3. Remover Clientes exclusivos deste lote
    console.log(`Excluindo clientes exclusivos da migração...`);
    const resClientes = await client.query(
      'DELETE FROM public.clientes WHERE $1 = ANY(classificacoes) RETURNING id;',
      [TAG_MIGRACAO]
    );
    console.log(`🗑️  Clientes exclusivos excluídos: ${resClientes.rowCount}`);

    await client.query('COMMIT');
    console.log('\n✨ ROLLBACK POSTGRES CONCLUÍDO COM SUCESSO!');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('\n========================================================================');
  console.log(`🧹 PAXFLOW — ROLLBACK RÁPIDO DE MIGRAÇÃO (MALTA VIAGENS)`);
  console.log(`Tag do Lote a Remover: ${TAG_MIGRACAO}`);
  console.log('========================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const password = process.env.SUPABASE_PASSWORD;

  if (!supabaseUrl) {
    console.error('❌ Erro: SUPABASE_URL não configurado no .env!');
    process.exit(1);
  }

  try {
    if (serviceKey) {
      await rollbackViaSupabase(supabaseUrl, serviceKey);
    } else if (password) {
      await rollbackViaPostgres(supabaseUrl, password);
    } else {
      console.error('❌ Erro: Nenhuma credencial encontrada (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_PASSWORD).');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('\n❌ Erro durante a execução do rollback:', err.message || err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});

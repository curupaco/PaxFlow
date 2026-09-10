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

async function main() {
  console.log('\n========================================================================');
  console.log(`🧹 PAXFLOW — ROLLBACK INSTANTÂNEO DE MIGRAÇÃO (MALTA VIAGENS)`);
  console.log(`Tag do Lote a Remover: ${TAG_MIGRACAO}`);
  console.log('========================================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const password = process.env.SUPABASE_PASSWORD;

  if (!supabaseUrl || !password) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_PASSWORD não encontrados no arquivo .env!');
    process.exit(1);
  }

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

  try {
    await client.connect();
    console.log('✅ Conexão com o banco estabelecida!\n');

    await client.query('BEGIN');

    // 1. Remover Viagens do lote
    console.log(`Excluindo viagens com origem '${TAG_MIGRACAO}'...`);
    const resViagens = await client.query(
      'DELETE FROM public.viagens WHERE origem = $1 RETURNING id;',
      [TAG_MIGRACAO]
    );
    console.log(`🗑️  Viagens excluídas: ${resViagens.rowCount}`);

    // 2. Remover Clientes exclusivos deste lote
    console.log(`Excluindo clientes exclusivos da migração...`);
    const resClientes = await client.query(
      'DELETE FROM public.clientes WHERE $1 = ANY(classificacoes) RETURNING id;',
      [TAG_MIGRACAO]
    );
    console.log(`🗑️  Clientes exclusivos excluídos: ${resClientes.rowCount}`);

    await client.query('COMMIT');
    console.log('\n✨ ROLLBACK CONCLUÍDO COM SUCESSO! O banco retornou ao estado original.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante o rollback:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão finalizada.\n');
  }
}

main().catch(err => {
  console.error('Erro inesperado no rollback:', err);
  process.exit(1);
});

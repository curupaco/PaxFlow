const { Client } = require('pg');

const region = 'sa-east-1';
const password = 'Pf_00216587';
const projectRef = 'fscfmnqcqioqiibvzhub';
const host = `aws-0-${region}.pooler.supabase.com`;

async function tryConnect(port) {
  console.log(`Connecting to ${host} on port ${port} using postgres.${projectRef}...`);
  const client = new Client({
    host: host,
    port: port,
    user: `postgres.${projectRef}`,
    password: password,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`🎉 Connected successfully on port ${port}!`);
    const res = await client.query('ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS valor_viagem NUMERIC;');
    console.log('Migration query executed successfully.');
    console.log(res);
    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed on port ${port}:`, err.message);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function main() {
  const ports = [6543, 5432];
  for (const port of ports) {
    const success = await tryConnect(port);
    if (success) {
      process.exit(0);
    }
  }
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

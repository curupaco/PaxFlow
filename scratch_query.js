const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fscfmnqcqioqiibvzhub.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzY2ZtbnFjcWlvcWlpYnZ6aHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODUwNzgsImV4cCI6MjA5NTQ2MTA3OH0.xfOvO9JZYjA3QcGX5mwGKghWhIYbh4Y_-nDjaVMruAk';

class DummyWebSocket {}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: {
    transport: DummyWebSocket
  }
});

async function main() {
  const { data, error } = await supabase.from('orcamentos').select('cliente_id').limit(1);
  if (error) {
    console.error('Error fetching orcamentos client_id:', error);
    return;
  }
  console.log('Successfully queried orcamentos, data:', data);
}

main();

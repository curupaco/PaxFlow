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
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Total profiles found:', data.length);
  for (const p of data) {
    console.log('----------------------------------------');
    console.log('ID:', p.id);
    console.log('Nome:', p.nome);
    console.log('Email:', p.email);
    console.log('Role:', p.role);
  }
}

main();

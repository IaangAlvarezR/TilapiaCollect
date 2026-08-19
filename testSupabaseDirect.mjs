import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qenvitcjihflgkllfqex.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbnZpdGNqaWhmbGdrbGxmcWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjY1NjEsImV4cCI6MjEwMTEwMjU2MX0.142aeoLjq54lcFTn_Vr70whyBgbaOHaLDcjDrgtIfDM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('⚡ Probando conexión con Supabase (direct)...');

try {
  const { error: insertError } = await supabase
    .from('general_cards')
    .upsert([
      { id: 'p1_c1_test_direct', page: 1, slot: 1, name: 'Foto Test Direct', stars: 3, default_frame: 'basic' }
    ]);

  if (insertError) {
    console.error('❌ Error de escritura:', insertError);
    process.exit(2);
  }

  const { data: readData, error: readError } = await supabase
    .from('general_cards')
    .select('*')
    .eq('id', 'p1_c1_test_direct');

  if (readError) {
    console.error('❌ Error de lectura:', readError);
    process.exit(3);
  }

  console.log('✅ Escritura y lectura OK. Filas:', readData.length);
  process.exit(0);
} catch (err) {
  console.error('❌ Excepción:', err.message || err);
  process.exit(1);
}

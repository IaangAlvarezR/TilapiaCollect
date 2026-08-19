import { supabase } from './src/supabaseClient.js';

console.log('⚡ Probando conexión con Supabase (Node ESM)...');

try {
  const { error: insertError } = await supabase
    .from('general_cards')
    .upsert([
      { id: 'p1_c1_test_node', page: 1, slot: 1, name: 'Foto Test Node', stars: 3, default_frame: 'basic' }
    ]);

  if (insertError) {
    console.error('❌ Error de escritura:', insertError);
    process.exit(2);
  }

  const { data: readData, error: readError } = await supabase
    .from('general_cards')
    .select('*')
    .eq('id', 'p1_c1_test_node');

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

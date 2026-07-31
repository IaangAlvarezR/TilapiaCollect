import { supabase } from './supabaseClient';

export async function probarConexion() {
  console.log("⚡ Probando conexión con Supabase...");

  // 1. Intentar insertar una carta de prueba en general_cards
  const { error: insertError } = await supabase
    .from('general_cards')
    .upsert([
      { id: 'p1_c1', page: 1, slot: 1, name: 'Foto 1', stars: 3, default_frame: 'basic' }
    ]);

  if (insertError) {
    console.error("❌ Error de escritura:", insertError.message);
    return false;
  }

  // 2. Intentar leer la carta que acabamos de guardar
  const { data: readData, error: readError } = await supabase
    .from('general_cards')
    .select('*');

  if (readError) {
    console.error("❌ Error de lectura:", readError.message);
    return false;
  }

  console.log("✅ ¡Conexión exitosa! Datos en la base de datos:", readData);
  return true;
}

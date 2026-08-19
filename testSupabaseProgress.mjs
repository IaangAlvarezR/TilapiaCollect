import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qenvitcjihflgkllfqex.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbnZpdGNqaWhmbGdrbGxmcWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjY1NjEsImV4cCI6MjEwMTEwMjU2MX0.142aeoLjq54lcFTn_Vr70whyBgbaOHaLDcjDrgtIfDM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('⚡ Consultando player_progress y users...');

try {
  const { data: progressData, error: progressError } = await supabase
    .from('player_progress')
    .select('user_id,card_id,count')
    .limit(50);

  if (progressError) {
    console.error('❌ Error player_progress:', progressError);
  } else {
    console.log('player_progress rows:', Array.isArray(progressData) ? progressData.length : 0);
    console.log(progressData && progressData.slice(0,5));
  }

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('uid,name,pin,is_admin')
    .limit(50);

  if (usersError) {
    console.error('❌ Error users:', usersError);
  } else {
    console.log('users rows:', Array.isArray(usersData) ? usersData.length : 0);
    console.log(usersData && usersData.slice(0,5));
  }

  process.exit(0);
} catch (err) {
  console.error('❌ Excepción:', err);
  process.exit(1);
}

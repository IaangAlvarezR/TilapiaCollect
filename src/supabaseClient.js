import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://qenvitcjihflgkllfqex.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlbnZpdGNqaWhmbGdrbGxmcWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MjY1NjEsImV4cCI6MjEwMTEwMjU2MX0.142aeoLjq54lcFTn_Vr70whyBgbaOHaLDcjDrgtIfDM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

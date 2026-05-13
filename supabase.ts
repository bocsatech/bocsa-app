import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://duvzbcxsfzoqjvohifim.supabase.co'
const supabaseKey = 'sb_publishable_ExkXmS5Drs75qyjU2DkZ_Q_m5v-O0gS'

export const supabase = createClient(supabaseUrl, supabaseKey)

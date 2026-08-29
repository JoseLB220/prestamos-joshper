import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Obtener credenciales desde variables de entorno con soporte multi-prefijo (NEXT_PUBLIC / VITE / directo)
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://xgwsbvigvptbmgempfex.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_q4rDlj5E9Q643Q-ZFTUZmA_ab35z9dj'

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Declaración global para reutilizar cliente en Hot Reloading
const globalForSupabase = globalThis as unknown as {
  supabaseClient: SupabaseClient | undefined
  supabaseAdminClient: SupabaseClient | undefined
}

/**
 * Cliente público de Supabase (uso en cliente o server con permisos RLS anónimos/autenticados)
 */
export const supabase: SupabaseClient =
  globalForSupabase.supabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabaseClient = supabase
}

/**
 * Cliente administrativo de Supabase (uso exclusivamente en backend / API routes con Service Role)
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (globalForSupabase.supabaseAdminClient) {
    return globalForSupabase.supabaseAdminClient
  }

  const keyToUse = supabaseServiceRoleKey || supabaseAnonKey
  const adminClient = createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForSupabase.supabaseAdminClient = adminClient
  }

  return adminClient
}

export default supabase

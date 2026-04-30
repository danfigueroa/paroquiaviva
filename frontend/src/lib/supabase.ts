import { createClient } from '@supabase/supabase-js'

const supabaseURL = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
let supabaseClient: ReturnType<typeof createClient> | null = null

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp']

export function getSupabaseClient() {
  if (!supabaseURL || !supabaseAnonKey) {
    return null
  }
  if (supabaseClient) {
    return supabaseClient
  }
  supabaseClient = createClient(supabaseURL, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  return supabaseClient
}

export class AvatarUploadError extends Error {
  constructor(public reason: 'no-client' | 'invalid-type' | 'too-large' | 'upload-failed', message: string) {
    super(message)
  }
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const client = getSupabaseClient()
  if (!client) {
    throw new AvatarUploadError('no-client', 'Supabase não está configurado.')
  }
  if (!AVATAR_ACCEPTED_MIMES.includes(file.type)) {
    throw new AvatarUploadError('invalid-type', 'Use JPG, PNG ou WEBP.')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new AvatarUploadError('too-large', 'A imagem precisa ter até 2 MB.')
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error } = await client.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type
  })
  if (error) {
    throw new AvatarUploadError('upload-failed', error.message || 'Falha no upload.')
  }
  const { data } = client.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

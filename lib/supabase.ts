import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The anon key is public by design (it ships to every browser); Row Level Security is what protects the data.
// Set these in .env.local / Vercel. The fallbacks are the values that were hard-coded in careers.html,
// so nothing breaks before you configure env vars; remove them once Vercel has the variables.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kwxlfuygotdcabhkqbdd.supabase.co';
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGxmdXlnb3RkY2FiaGtxYmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjY2NzksImV4cCI6MjA5ODQwMjY3OX0.ECebrh77wy-OCa44s10aH1HLsykCRBq4s1rGIFipdm4';

let client: SupabaseClient | null = null;
export const getSupabase = () => (client ??= createClient(url, anonKey));

export const SEND_APPLICATION_EMAIL_URL = `${url}/functions/v1/send-application-email`;
export const SUPABASE_ANON_KEY = anonKey;

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

/** Uploads a resume to the `resumes` bucket and returns its storage path. */
export async function uploadResume(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) throw new Error('Resume file exceeds 10MB. Please upload a smaller file.');
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const { data, error } = await getSupabase().storage.from('resumes').upload(safeName, file);
  if (error) throw error;
  return data.path;
}

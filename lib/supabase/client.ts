import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;
let hasWarned = false;
let hasLoggedEnvCheck = false;

const warnOnce = (message: string) => {
  if (hasWarned) {
    return;
  }

  hasWarned = true;
  console.warn(message);
};

const getSupabaseEnv = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const getSupabaseClient = async () => {
  console.log("Supabase getClient called");
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  console.log("Supabase env status", {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });

  if (!hasLoggedEnvCheck) {
    hasLoggedEnvCheck = true;
    console.log("Supabase env check", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    warnOnce(
      "Supabase environment variables are not configured. Falling back to localStorage.",
    );
    console.log("Supabase returning null");
    return null;
  }

  if (cachedClient !== undefined) {
    console.log("Supabase cached client exists", Boolean(cachedClient));
    return cachedClient;
  }

  console.log("Supabase cached client exists", Boolean(cachedClient));
  console.log("Supabase creating client");
  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log("Supabase client created");
  return cachedClient;
};

type SupabaseClientLike = unknown;

type SupabaseJsModule = {
  createClient: (
    supabaseUrl: string,
    supabaseAnonKey: string,
  ) => SupabaseClientLike;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClientLike | null | undefined;
let hasWarned = false;

const warnOnce = (message: string) => {
  if (hasWarned) {
    return;
  }

  hasWarned = true;
  console.warn(message);
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabaseClient = async () => {
  if (!isSupabaseConfigured) {
    warnOnce(
      "Supabase environment variables are not configured. Falling back to localStorage.",
    );
    return null;
  }

  if (cachedClient !== undefined) {
    return cachedClient;
  }

  try {
    const moduleLoader = new Function(
      "moduleName",
      "return import(moduleName)",
    ) as (moduleName: string) => Promise<SupabaseJsModule>;
    const { createClient } = await moduleLoader("@supabase/supabase-js");

    cachedClient = createClient(supabaseUrl!, supabaseAnonKey!);
    return cachedClient;
  } catch {
    warnOnce(
      "@supabase/supabase-js is not available. Falling back to localStorage.",
    );
    cachedClient = null;
    return null;
  }
};

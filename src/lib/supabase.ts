import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'recipe-generator'
    }
  },
  db: {
    schema: 'public'
  },
  // Add retries for better reliability
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Setup auth state change handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
  }
});

// Add error handling wrapper with retries
export async function handleSupabaseError<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3
): Promise<T> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const { data, error } = await operation();
      
      if (error) {
        console.error('Supabase operation failed:', error);
        
        if (error.code === 'PGRST301') {
          throw new Error('Database connection failed. Please try again.');
        }
        if (error.code === '42501') {
          throw new Error('Access denied. Please check your permissions.');
        }
        if (error.code === '23505') {
          throw new Error('This record already exists.');
        }
        
        // If it's a network error, retry
        if (error.message?.includes('Failed to fetch')) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            continue;
          }
        }
        
        throw new Error(error.message || 'Operation failed');
      }
      
      if (data === null) {
        throw new Error('No data returned');
      }
      
      return data;
    } catch (err) {
      if (retries >= maxRetries - 1) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error('An unexpected error occurred');
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
  
  throw new Error('Operation failed after retries');
}
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';

interface Style {
  id: string;
  name: string;
  custom_style_id: string;
}

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function StyleSelector({ value, onChange, disabled }: StyleSelectorProps) {
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadStyles();
  }, [retryCount]);

  async function loadStyles() {
    try {
      setLoading(true);
      setError(null);

      const data = await handleSupabaseError(() =>
        supabase
          .from('styles')
          .select('id, name, custom_style_id')
      );

      setStyles(data);
    } catch (err) {
      console.error('Error loading styles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load styles');
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setRetryCount(prev => prev + 1);
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Loader2 className="animate-spin h-4 w-4" />
        <span>Loading styles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to load styles
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Select Style
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
      >
        <option value="realistic_image">Default Style (2 tokens)</option>
        <option value="flux">Flux Style (1 token)</option>
        {styles.map(style => (
          <option key={style.id} value={style.custom_style_id}>
            {style.name} (Custom - 2 tokens)
          </option>
        ))}
      </select>
    </div>
  );
}
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { generateImage } from '../lib/recraft';
import { supabase } from '../lib/supabase';

interface StyleTesterProps {
  styleId: string;
  styleName: string;
}

export default function StyleTester({ styleId, styleName }: StyleTesterProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const imageUrl = await generateImage(prompt, {
        custom_style_id: styleId
      });
      
      // Update style thumbnail with the new test image
      await supabase
        .from('styles')
        .update({ thumbnail_url: imageUrl })
        .eq('custom_style_id', styleId);
      
      setResult({ imageUrl });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate test image');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Test Your Style: {styleName}</h3>

      <form onSubmit={handleTest} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Test Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            placeholder="Enter a prompt to test your style..."
            rows={3}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Generating...
            </>
          ) : (
            'Generate Test Image'
          )}
        </button>
      </form>

      {result && (
        <div className="mt-4">
          <img 
            src={result.imageUrl} 
            alt="Test result" 
            className="w-full rounded-lg shadow-md"
          />
        </div>
      )}
    </div>
  );
}
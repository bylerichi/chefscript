import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, History } from 'lucide-react';
import RecipeCard from '../components/RecipeCard';
import StyleSelector from '../components/StyleSelector';
import { generateRecipe } from '../lib/openai';
import { generateImage as generateRecraftImage } from '../lib/recraft';
import { generateImage as generateFluxImage } from '../lib/flux';
import { parseRecipeText, type RecipeParts } from '../lib/recipe-parser';
import { supabase } from '../lib/supabase';
import JSZip from 'jszip';
import { createDownloadableText } from '../lib/recipe-parser';

interface Recipe {
  id: string;
  name: string;
  status: 'pending' | 'completed' | 'error';
  imageUrl?: string;
  content?: string;
  error?: string;
  parsedContent?: RecipeParts;
  template_id?: string;
  template_applied?: boolean;
  timestamp?: number;
}

const HISTORY_EXPIRATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export default function Dashboard() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [recipeInput, setRecipeInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic_image');
  const [error, setError] = useState<string | null>(null);
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const [applyTemplate, setApplyTemplate] = useState(false);

  useEffect(() => {
    checkAuth();
    loadUserTokens();
    loadRecipeHistory();
  }, []);

  useEffect(() => {
    if (recipes.length > 0) {
      localStorage.setItem('recipeHistory', JSON.stringify(recipes));
    }
  }, [recipes]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  }

  async function loadUserTokens() {
    const { data } = await supabase
      .from('users')
      .select('tokens')
      .single();
    
    if (data) {
      setUserTokens(data.tokens);
    }
  }

  function loadRecipeHistory() {
    try {
      const savedRecipes = localStorage.getItem('recipeHistory');
      if (savedRecipes) {
        const parsedRecipes: Recipe[] = JSON.parse(savedRecipes);
        const now = Date.now();
        const validRecipes = parsedRecipes.filter(recipe => {
          return recipe.timestamp && (now - recipe.timestamp) < HISTORY_EXPIRATION;
        });
        setRecipes(validRecipes);
        if (validRecipes.length !== parsedRecipes.length) {
          localStorage.setItem('recipeHistory', JSON.stringify(validRecipes));
        }
      }
    } catch (error) {
      console.error('Error loading recipe history:', error);
    }
  }

  function clearHistory() {
    if (window.confirm('Are you sure you want to clear the recipe history?')) {
      setRecipes([]);
      localStorage.removeItem('recipeHistory');
    }
  }

  async function handleDownloadAll() {
    const completedRecipes = recipes.filter(recipe => recipe.status === 'completed');
    if (completedRecipes.length === 0) {
      alert('No completed recipes to download');
      return;
    }

    setIsDownloadingAll(true);
    const zip = new JSZip();

    try {
      for (const recipe of completedRecipes) {
        if (!recipe.parsedContent || !recipe.imageUrl) continue;

        const folderName = recipe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const folder = zip.folder(folderName);
        if (!folder) continue;

        // Add text content
        const textContent = createDownloadableText(recipe.parsedContent);
        folder.file(`${recipe.name}.txt`, textContent);

        // Add image
        try {
          let response;
          if (recipe.imageUrl.includes('bfl.ai')) {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(recipe.imageUrl)}`;
            response = await fetch(proxyUrl);
          } else {
            response = await fetch(recipe.imageUrl);
          }
          
          if (!response.ok) throw new Error('Failed to fetch image');
          const imageBlob = await response.blob();
          folder.file(`${recipe.name}.jpg`, imageBlob);
        } catch (error) {
          console.error(`Failed to download image for ${recipe.name}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipes-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to create zip file:', error);
      alert('Failed to download recipes. Please try again.');
    } finally {
      setIsDownloadingAll(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!recipeInput.trim()) return;

    const recipeNames = recipeInput.split('\n').filter(name => name.trim());
    const tokensPerRecipe = selectedStyle === 'flux' ? 1 : 2;
    const requiredTokens = recipeNames.length * tokensPerRecipe;

    if (userTokens !== null && userTokens < requiredTokens) {
      setError(`Insufficient tokens. You need ${requiredTokens} tokens to generate ${recipeNames.length} recipes.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    const newRecipes = recipeNames.map(name => ({
      id: crypto.randomUUID(),
      name: name.trim(),
      status: 'pending' as const,
      timestamp: Date.now()
    }));

    setRecipes(prev => [...newRecipes, ...prev]);

    for (const recipe of newRecipes) {
      try {
        let recipeText = await generateRecipe(recipe.name);
        let parsed = parseRecipeText(recipeText);
        
        const imageUrl = selectedStyle === 'flux'
          ? await generateFluxImage(parsed.imagePrompt)
          : await generateRecraftImage(parsed.imagePrompt, {
              ...(selectedStyle.includes('-') 
                ? { custom_style_id: selectedStyle }
                : { style: selectedStyle }
              )
            });

        setUserTokens(prev => prev !== null ? prev - tokensPerRecipe : null);

        setRecipes(prev => prev.map(r => {
          if (r.id === recipe.id) {
            return {
              ...r,
              status: 'completed',
              imageUrl,
              content: recipeText,
              parsedContent: parsed
            };
          }
          return r;
        }));
      } catch (error) {
        console.error('Generation error:', error);
        
        setRecipes(prev => prev.map(r => {
          if (r.id === recipe.id) {
            return { 
              ...r, 
              status: 'error',
              error: error instanceof Error 
                ? error.message 
                : 'An unexpected error occurred'
            };
          }
          return r;
        }));

        setError(error instanceof Error 
          ? error.message 
          : 'An error occurred while generating the recipe'
        );
      }
    }

    setIsGenerating(false);
    setRecipeInput('');
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Recipe Generator Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipe Names (one per line)
            </label>
            <textarea
              value={recipeInput}
              onChange={(e) => setRecipeInput(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              placeholder="Chocolate Cake&#10;Spaghetti Carbonara&#10;Greek Salad"
            />
            <p className="mt-1 text-sm text-gray-500">
              Each recipe costs {selectedStyle === 'flux' ? '1' : '2'} tokens to generate
            </p>
          </div>

          <StyleSelector
            value={selectedStyle}
            onChange={setSelectedStyle}
            disabled={isGenerating}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="applyTemplate"
              checked={applyTemplate}
              onChange={(e) => setApplyTemplate(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="applyTemplate" className="ml-2 text-sm text-gray-700">
              Apply active template to generated images
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isGenerating || !recipeInput.trim()}
              className="flex-1 flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                'Generate Recipes'
              )}
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll || recipes.filter(r => r.status === 'completed').length === 0}
                className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingAll ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={clearHistory}
                disabled={recipes.length === 0}
                className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <History className="h-4 w-4 mr-2" />
                Clear History
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recipes.map((recipe) => (
          <RecipeCard 
            key={recipe.id} 
            recipe={recipe}
          />
        ))}
      </div>
    </div>
  );
}